import asyncio
from processors.ingestion import universal_extractor
from services.llm_service import ai_structurizer
from tools.cleaner import clean_text_content

# Global reference to active_jobs from main.py
active_jobs = None

def set_active_jobs_ref(jobs_dict):
    """Set the reference to active_jobs from main.py"""
    global active_jobs
    active_jobs = jobs_dict

async def run_orchestrator(job_id, input_data, filename, source_type, schema):
    """Main orchestration function that coordinates the data processing pipeline."""
    try:
        # 1. Extraction Phase
        update_job(job_id, "Extracting Raw Data", 20)
        print(f"[{job_id}] Starting extraction...")
        raw_text = await universal_extractor(input_data, filename, source_type)
        raw_size = len(str(raw_text))
        print(f"[{job_id}] Extraction complete. Text length: {raw_size} chars")
        
        # 2. Cleaning & Tool Selection Phase
        update_job(job_id, "Cleaning & Normalizing Data", 40)
        print(f"[{job_id}] Starting data cleaning...")
        cleaned_text = clean_text_content(str(raw_text))
        cleaned_size = len(cleaned_text)
        print(f"[{job_id}] Cleaning complete. Reduced from {raw_size} to {cleaned_size} chars")
        
        # 3. LLM Processing (with proper awaiting)
        update_job(job_id, "Structuring with AI", 70)
        print(f"[{job_id}] Starting LLM processing...")
        result = await ai_structurizer(cleaned_text, schema)
        print(f"[{job_id}] LLM processing complete")
        
        # 4. Success
        update_job(job_id, "completed", 100, result=result)
        print(f"[{job_id}] Job completed successfully")
        
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