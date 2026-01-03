from .processors.ingestion import universal_extractor
from .services.llm_service import ai_structurizer

async def run_orchestrator(job_id, input_data, filename, source_type, schema):
    try:
        # 1. Extraction Phase
        update_job(job_id, "Extracting Raw Data", 20)
        raw_text = await universal_extractor(input_data, filename, source_type)
        
        # 2. Cleaning & Tool Selection
        # If text is too large, we might need to chunk it (Simplified here)
        update_job(job_id, "AI Normalization & Cleaning", 50)
        
        # 3. LLM Processing
        # We pass the schema here to get the structured output
        result = await ai_structurizer(raw_text, schema)
        
        # 4. Success
        update_job(job_id, "Completed", 100, result=result)
        
    except Exception as e:
        # This triggers the "Active Error" report in the UI
        update_job(job_id, "Failed", 0, error=f"Extraction Error: {str(e)}")

def update_job(job_id, status, progress, result=None, error=None):
    # This updates the global dict that the WebSocket reads from
    from ..main import active_jobs
    active_jobs[job_id].update({
        "status": status,
        "progress": progress,
        "result": result,
        "error": error
    })