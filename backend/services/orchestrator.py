import asyncio
import json
from processors.ingestion import universal_extractor
from services.llm_service import ai_structurizer
from tools.cleaner import clean_text_content
from tools.merger import merge_extracted_data, remove_duplicates, normalize_merged_data
from tools.noise_remover import remove_noise_from_records, remove_noise_from_text, remove_duplicate_records
from tools.validator import generate_insights_and_clean

# Global reference to active_jobs from main.py
active_jobs = None

def set_active_jobs_ref(jobs_dict):
    """Set the reference to active_jobs from main.py"""
    global active_jobs
    active_jobs = jobs_dict

async def run_orchestrator(job_id, inputs, schema):
    """Main orchestration function that coordinates the data processing pipeline for multiple inputs."""
    try:
        final_aggregated_results = []
        total_items = len(inputs)
        stage_data = {}  # Track data for each stage
        extracted_items = []  # Store all extracted data for merging
        
        print(f"[{job_id}] Processing {total_items} items...")
        
        # Initial status update
        update_job(job_id, "Extracting Raw Data", 5, stage_data={"ingestion": {"status": "running", "input": f"Processing {total_items} file(s)"}})
        await asyncio.sleep(2)  # Visual delay
        
        # PHASE 1: EXTRACT DATA FROM ALL SOURCES
        for index, item in enumerate(inputs):
            # item = {"type": "file"|"web", "content": ..., "filename": ...}
            item_type = item["type"]
            input_data = item["content"]
            filename = item["filename"]
            
            progress_base = (index / total_items) * 20  # First phase: 0-20%
            
            # 1. Extraction Phase (Ingestion)
            update_job(job_id, "Extracting Raw Data", progress_base + 5, stage_data={
                "ingestion": {"status": "running", "input": f"Source: {filename}", "output": None}
            })
            print(f"[{job_id}] [{filename}] Starting extraction...")
            
            raw_text = await universal_extractor(input_data, filename, item_type)
            raw_size = len(str(raw_text))
            raw_preview = str(raw_text)[:500] + ("..." if len(str(raw_text)) > 500 else "")
            
            # Store extracted data for later merging
            extracted_items.append({
                "filename": filename,
                "source_type": item_type,
                "data": raw_text,
                "raw_size": raw_size
            })
            
            # Update ingestion with output
            stage_data["ingestion"] = {
                "status": "completed",
                "input": f"Source: {filename} ({item_type})",
                "output": raw_preview,
                "stats": {"raw_size": raw_size, "chars": len(str(raw_text))}
            }
            update_job(job_id, "Extracting Raw Data", progress_base + 15, stage_data=stage_data)
            await asyncio.sleep(1)  # Visual delay for stage visibility
            
            # Small delay to be nice to rate limits
            await asyncio.sleep(0.5)
        
        # PHASE 2: MERGE ALL EXTRACTED DATA
        stage_data["merge"] = {"status": "running", "input": f"Merging {len(extracted_items)} source(s)", "output": None}
        update_job(job_id, "Merging Data from Sources", 22, stage_data=stage_data)
        print(f"[{job_id}] Merging extracted data from {len(extracted_items)} source(s)...")
        
        merged_text, merge_summary = merge_extracted_data(extracted_items)
        merged_size = len(merged_text)
        merged_preview = merged_text[:500] + ("..." if len(merged_text) > 500 else "")
        
        stage_data["merge"] = {
            "status": "completed",
            "input": f"{len(extracted_items)} source(s) extracted",
            "output": merged_preview,
            "stats": {
                "merged_size": merged_size,
                "sources": len(extracted_items),
                "records_merged": merge_summary.get("records_merged", 0),
                "source_files": merge_summary.get("source_files", [])
            }
        }
        update_job(job_id, "Merging Data from Sources", 25, stage_data=stage_data)
        await asyncio.sleep(2)  # Visual delay
        
        # PHASE 2.5: NOISE REMOVAL (after merge)
        stage_data["noise_removal"] = {"status": "running", "input": merged_preview[:300] + "...", "output": None}
        update_job(job_id, "Removing Noise & Outliers", 28, stage_data=stage_data)
        print(f"[{job_id}] Removing noise, null values, and outliers...")
        
        # Try to parse merged data as JSON records for structured noise removal
        noise_removed_text = merged_text
        noise_summary_obj = None
        
        try:
            parsed_data = json.loads(merged_text)
            if isinstance(parsed_data, list) and len(parsed_data) > 0 and isinstance(parsed_data[0], dict):
                # Structured data - remove noise from records
                cleaned_records, noise_summary_obj = remove_noise_from_records(parsed_data, strategy='fill')
                noise_removed_text = json.dumps(cleaned_records, indent=2)
                print(f"[{job_id}] Structured data cleaned: {noise_summary_obj}")
        except:
            # Unstructured data - remove noise from text
            noise_removed_text, noise_summary_obj = remove_noise_from_text(merged_text)
            print(f"[{job_id}] Text data cleaned: {noise_summary_obj}")
        
        noise_size = len(noise_removed_text)
        noise_preview = noise_removed_text[:500] + ("..." if len(noise_removed_text) > 500 else "")
        
        stage_data["noise_removal"] = {
            "status": "completed",
            "input": merged_preview[:300] + "...",
            "output": noise_preview,
            "stats": {
                "original_size": merged_size,
                "cleaned_size": noise_size,
                "noise_removed": merged_size - noise_size,
                "summary": noise_summary_obj
            }
        }
        update_job(job_id, "Removing Noise & Outliers", 30, stage_data=stage_data)
        await asyncio.sleep(1.5)  # Visual delay
        
        # PHASE 3: CLEANING & DEDUPLICATION & NORMALIZATION
        stage_data["cleaning"] = {"status": "running", "input": noise_preview[:300] + "...", "output": None}
        update_job(job_id, "Cleaning & Normalizing Data", 35, stage_data=stage_data)
        print(f"[{job_id}] Cleaning merged data...")
        
        cleaned_text = clean_text_content(noise_removed_text)
        cleaned_size = len(cleaned_text)
        cleaned_preview = cleaned_text[:500] + ("..." if len(cleaned_text) > 500 else "")
        
        stage_data["cleaning"] = {
            "status": "completed",
            "input": merged_preview[:300] + "...",
            "output": cleaned_preview,
            "stats": {"cleaned_size": cleaned_size, "removed": merged_size - cleaned_size}
        }
        update_job(job_id, "Cleaning & Normalizing Data", 35, stage_data=stage_data)
        await asyncio.sleep(1.5)  # Visual delay
        
        # Remove duplicates from merged data
        print(f"[{job_id}] Removing duplicate entries...")
        deduped_text = remove_duplicates(cleaned_text, preserve_order=True)
        deduped_size = len(deduped_text)
        
        # Normalize the merged data
        print(f"[{job_id}] Normalizing data format...")
        normalized_text = normalize_merged_data(deduped_text)
        normalized_size = len(normalized_text)
        normalized_preview = normalized_text[:500] + ("..." if len(normalized_text) > 500 else "")
        
        stage_data["cleaning"] = {
            "status": "completed",
            "input": noise_preview[:300] + "...",
            "output": normalized_preview,
            "stats": {
                "cleaned_size": cleaned_size,
                "deduped_size": deduped_size,
                "normalized_size": normalized_size,
                "removed": merged_size - normalized_size
            }
        }
        update_job(job_id, "Cleaning & Normalizing Data", 45, stage_data=stage_data)
        await asyncio.sleep(2)  # Visual delay
        
        # PHASE 4: AI STRUCTURING & INGESTION
        stage_data["normalization"] = {"status": "running", "input": normalized_preview[:300] + "...", "output": None}
        update_job(job_id, "Structuring with AI", 50, stage_data=stage_data)
        print(f"[{job_id}] AI Processing...")
        
        result = await ai_structurizer(normalized_text, schema)
        result_preview = str(result)[:500] if result else "No data extracted"
        
        stage_data["normalization"] = {
            "status": "completed",
            "input": normalized_preview[:300] + "...",
            "output": result_preview,
            "stats": {"fields_extracted": len(result) if isinstance(result, dict) else 1}
        }
        update_job(job_id, "Structuring with AI", 60, stage_data=stage_data)
        await asyncio.sleep(2)  # Visual delay
        
        # PHASE 5: VALIDATION
        stage_data["validation"] = {"status": "running", "input": result_preview[:300] + "...", "output": None}
        update_job(job_id, "Validating", 70, stage_data=stage_data)
        print(f"[{job_id}] Validating results...")
        
        final_result, insights = generate_insights_and_clean(result)
        validated_preview = str(final_result)[:500] if final_result else "Validation complete"
        
        stage_data["validation"] = {
            "status": "completed",
            "input": result_preview[:300] + "...",
            "output": validated_preview,
            "stats": {"insights": insights}
        }
        update_job(job_id, "Validating", 80, stage_data=stage_data)
        await asyncio.sleep(1)  # Visual delay
        
        final_aggregated_results.append({
            "source": "merged_sources",
            "type": "merged_dataset",
            "data": final_result,
            "meta": {
                "total_sources": len(extracted_items),
                "source_files": merge_summary.get("source_files", []),
                "merge_type": merge_summary.get("merge_type", "unknown"),
                "records_before_merge": merge_summary.get("records_merged", 0),
                "merged_size": merged_size,
                "normalized_size": normalized_size,
                "insights": insights
            }
        })
        
        # PHASE 6: EXPORT/COMPLETION
        stage_data["export"] = {"status": "running", "input": f"Finalizing results", "output": None}
        update_job(job_id, "Exporting Results", 95, stage_data=stage_data)
        await asyncio.sleep(2)  # Final visual delay
        
        stage_data["export"] = {
            "status": "completed",
            "input": f"Merged and processed {len(extracted_items)} source(s)",
            "output": f"Generated 1 consolidated structured record",
            "stats": {"total_sources": len(extracted_items)}
        }
        
        update_job(job_id, "completed", 100, result={"results": final_aggregated_results}, stage_data=stage_data)
        print(f"[{job_id}] Job completed successfully. Processed {total_items} items and merged into 1 consolidated result.")
        
    except Exception as e:
        # This triggers the error report in the UI
        error_msg = f"Orchestration Error: {str(e)}"
        print(f"[{job_id}] {error_msg}")
        update_job(job_id, "failed", 0, error=error_msg)

def update_job(job_id, status, progress, result=None, error=None, stage_data=None):
    """Update the job status in the global active_jobs dictionary."""
    global active_jobs
    
    # Import here to avoid circular imports at module load time
    if active_jobs is None:
        from main import active_jobs as aj
        active_jobs = aj
    
    if job_id in active_jobs:
        update_data = {
            "status": status,
            "progress": progress,
            "result": result,
            "error": error
        }
        if stage_data:
            update_data["stage_data"] = stage_data
        active_jobs[job_id].update(update_data)
        print(f"[{job_id}] Updated: status={status}, progress={progress}%")