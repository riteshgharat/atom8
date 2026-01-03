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
        
        print(f"[{job_id}] Processing {total_items} items...")
        
        for index, item in enumerate(inputs):
            # item = {"type": "file"|"web", "content": ..., "filename": ...}
            item_type = item["type"]
            input_data = item["content"]
            filename = item["filename"]
            
            progress_base = (index / total_items) * 100
            
            # 1. Extraction Phase
            update_job(job_id, f"Processing {filename} (Extraction)", progress_base + 5)
            print(f"[{job_id}] [{filename}] Starting extraction...")
            
            raw_text = await universal_extractor(input_data, filename, item_type)
            raw_size = len(str(raw_text))
            
            # 2. Cleaning Phase
            update_job(job_id, f"Processing {filename} (Cleaning)", progress_base + 10)
            cleaned_text = clean_text_content(str(raw_text))
            cleaned_size = len(cleaned_text)
            
            # 3. LLM Processing
            update_job(job_id, f"Processing {filename} (AI Structuring)", progress_base + 15)
            print(f"[{job_id}] [{filename}] AI Processing...")
            
            result = await ai_structurizer(cleaned_text, schema)
            
            # 4. Post-Processing & Validation
            final_result, insights = generate_insights_and_clean(result)
            
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

        # 5. Success
        update_job(job_id, "completed", 100, result={"results": final_aggregated_results})
        print(f"[{job_id}] Job completed successfully. Processed {total_items} items.")
        
    except Exception as e:
        # This triggers the error report in the UI
        error_msg = f"Orchestration Error: {str(e)}"
        print(f"[{job_id}] {error_msg}")
        update_job(job_id, "failed", 0, error=error_msg)

def update_job(job_id, status, progress, result=None, error=None):
    """Update the job status in the global active_jobs dictionary."""
    global active_jobs
    
    # Import here to avoid circular imports at module load time
    if active_jobs is None:
        from main import active_jobs as aj
        active_jobs = aj
    
    if job_id in active_jobs:
        active_jobs[job_id].update({
            "status": status,
            "progress": progress,
            "result": result,
            "error": error
        })
        print(f"[{job_id}] Updated: status={status}, progress={progress}%")