from fastapi import FastAPI, UploadFile, WebSocket, File, Form, BackgroundTasks
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import uuid
import asyncio
import asyncio
from dotenv import load_dotenv

# Load env vars before importing services that use them
load_dotenv()

from services.orchestrator import run_orchestrator

app = FastAPI(title="AI Data Structurizer")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active job statuses (since we aren't using a DB)
active_jobs = {}

@app.get("/")
async def root():   
    return {"message": "Welcome to the Data Transformation API"}

@app.post("/upload")
async def upload_data(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(None),
    urls: str = Form(None),           # Comma-separated URLs
    target_schema: str = Form(...)    # e.g., "Extract name, price, and date"
):
    job_id = str(uuid.uuid4())
    active_jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None}
    
    # Prepare inputs for the orchestrator
    inputs = []
    
    # Process Files
    if files:
        for file in files:
            content = await file.read()
            inputs.append({
                "type": "file",
                "content": content,
                "filename": file.filename
            })
            
    # Process URLs
    if urls:
        import re
        # Split by comma or semicolon
        url_list = [u.strip() for u in re.split(r'[;,]', urls) if u.strip()]
        for url in url_list:
            inputs.append({
                "type": "web",
                "content": url,
                "filename": url # Use URL as filename for reference
            })
            
    if not inputs:
         return {"error": "No files or URLs provided"}

    background_tasks.add_task(
        run_orchestrator, 
        job_id, 
        inputs, 
        target_schema
    )
    
    return {"job_id": job_id, "message": f"Started processing {len(inputs)} items. Connect to /ws/{job_id} for updates."}

@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    last_sent = {}
    
    try:
        while True:
            if job_id not in active_jobs:
                await websocket.send_json({"error": "Job not found"})
                break
            
            status = active_jobs[job_id]
            
            # Only send updates when status changes
            if status != last_sent:
                await websocket.send_json(status)
                last_sent = status.copy()
            
            # Check if job is complete
            if status["status"] in ["completed", "failed"]:
                await websocket.close(code=1000)
                break
            
            # Wait before next poll to reduce CPU usage
            await asyncio.sleep(0.5)
    
    except Exception as e:
        print(f"WebSocket error for job {job_id}: {str(e)}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass