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
    urls: List[str] = Form(None),           # Accept multiple URLs
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
            print(f"[Backend] Received file: {file.filename} ({len(content)} bytes)")
            
    # Process URLs (now handles multiple URLs correctly)
    if urls:
        # urls will be a list if multiple URLs are sent
        if isinstance(urls, str):
            urls = [urls]
        
        for url in urls:
            if url and url.strip():
                clean_url = url.strip()
                inputs.append({
                    "type": "web",
                    "content": clean_url,
                    "filename": clean_url
                })
                print(f"[Backend] Received URL: {clean_url}")
            
    if not inputs:
         from fastapi import HTTPException
         raise HTTPException(status_code=400, detail="No valid files or URLs provided")

    print(f"[Backend] Total inputs to process: {len(inputs)}")
    
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