import asyncio
from processors.ingestion import universal_extractor
from services.llm_service import ai_structurizer
from tools.cleaner import clean_text_content
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
        
        print(f"[{job_id}] Processing {total_items} items...")
        
        # Initial status update
        update_job(job_id, "Extracting Raw Data", 5, stage_data={"ingestion": {"status": "running", "input": f"Processing {total_items} file(s)"}})
        await asyncio.sleep(2)  # Visual delay
        
        for index, item in enumerate(inputs):
            # item = {"type": "file"|"web", "content": ..., "filename": ...}
            item_type = item["type"]
            input_data = item["content"]
            filename = item["filename"]
            
            progress_base = (index / total_items) * 100
            
            # 1. Extraction Phase (Ingestion)
            update_job(job_id, "Extracting Raw Data", progress_base + 10, stage_data={
                "ingestion": {"status": "running", "input": f"Source: {filename}", "output": None}
            })
            print(f"[{job_id}] [{filename}] Starting extraction...")
            
            raw_text = await universal_extractor(input_data, filename, item_type)
            raw_size = len(str(raw_text))
            raw_preview = str(raw_text)[:500] + ("..." if len(str(raw_text)) > 500 else "")
            
            # Update ingestion with output
            stage_data["ingestion"] = {
                "status": "completed",
                "input": f"Source: {filename} ({item_type})",
                "output": raw_preview,
                "stats": {"raw_size": raw_size, "chars": len(str(raw_text))}
            }
            update_job(job_id, "Extracting Raw Data", progress_base + 15, stage_data=stage_data)
            await asyncio.sleep(2)  # Visual delay for stage visibility
            
            # 2. Cleaning Phase
            stage_data["cleaning"] = {"status": "running", "input": raw_preview[:300] + "...", "output": None}
            update_job(job_id, "Cleaning & Normalizing Data", progress_base + 30, stage_data=stage_data)
            print(f"[{job_id}] [{filename}] Cleaning data...")
            
            cleaned_text = clean_text_content(str(raw_text))
            cleaned_size = len(cleaned_text)
            cleaned_preview = cleaned_text[:500] + ("..." if len(cleaned_text) > 500 else "")
            
            stage_data["cleaning"] = {
                "status": "completed",
                "input": raw_preview[:300] + "...",
                "output": cleaned_preview,
                "stats": {"cleaned_size": cleaned_size, "removed": raw_size - cleaned_size}
            }
            update_job(job_id, "Cleaning & Normalizing Data", progress_base + 35, stage_data=stage_data)
            await asyncio.sleep(1.5)  # Visual delay for stage visibility
            
            # 3. AI Structuring Phase (Normalization)
            stage_data["normalization"] = {"status": "running", "input": cleaned_preview[:300] + "...", "output": None}
            update_job(job_id, "Structuring with AI", progress_base + 50, stage_data=stage_data)
            print(f"[{job_id}] [{filename}] AI Processing...")
            
            result = await ai_structurizer(cleaned_text, schema)
            result_preview = str(result)[:500] if result else "No data extracted"
            
            stage_data["normalization"] = {
                "status": "completed",
                "input": cleaned_preview[:300] + "...",
                "output": result_preview,
                "stats": {"fields_extracted": len(result) if isinstance(result, dict) else 1}
            }
            update_job(job_id, "Structuring with AI", progress_base + 60, stage_data=stage_data)
            await asyncio.sleep(2)  # Visual delay for stage visibility
            
            # 4. Validation Phase
            stage_data["validation"] = {"status": "running", "input": result_preview[:300] + "...", "output": None}
            update_job(job_id, "Validating", progress_base + 70, stage_data=stage_data)
            print(f"[{job_id}] [{filename}] Validating results...")
            
            final_result, insights = generate_insights_and_clean(result)
            validated_preview = str(final_result)[:500] if final_result else "Validation complete"
            
            stage_data["validation"] = {
                "status": "completed",
                "input": result_preview[:300] + "...",
                "output": validated_preview,
                "stats": {"insights": insights}
            }
            update_job(job_id, "Validating", progress_base + 80, stage_data=stage_data)
            await asyncio.sleep(1)  # Visual delay for stage visibility
            
            final_aggregated_results.append({
                "source": filename,
                "type": item_type,
                "data": final_result,
                "meta": {
                    "raw_size": raw_size,
                    "cleaned_size": cleaned_size,
                    "insights": insights
                }
            })
            
            # Small delay to be nice to rate limits
            await asyncio.sleep(0.5)

        # 5. Export/Completion
        stage_data["export"] = {"status": "running", "input": f"{len(final_aggregated_results)} item(s) processed", "output": None}
        update_job(job_id, "Exporting Results", 95, stage_data=stage_data)
        await asyncio.sleep(2)  # Final visual delay
        
        stage_data["export"] = {
            "status": "completed",
            "input": f"{len(final_aggregated_results)} item(s) processed",
            "output": f"Generated {len(final_aggregated_results)} structured record(s)",
            "stats": {"total_records": len(final_aggregated_results)}
        }
        
        update_job(job_id, "completed", 100, result={"results": final_aggregated_results}, stage_data=stage_data)
        print(f"[{job_id}] Job completed successfully. Processed {total_items} items.")
        
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