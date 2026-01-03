from fastapi import FastAPI, UploadFile, WebSocket, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uuid
import asyncio
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
    source_type: str = Form("file"), # "file", "web", "database"
    file: UploadFile = File(None),
    raw_input: str = Form(None),     # For URL or DB Connection String
    target_schema: str = Form(...)   # e.g., "Extract name, price, and date"
):
    job_id = str(uuid.uuid4())
    active_jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None}
    
    # Logic to capture the correct raw data
    input_data = await file.read() if file else raw_input
    file_name = file.filename if file else "input_source"

    background_tasks.add_task(
        run_orchestrator, 
        job_id, 
        input_data, 
        file_name, 
        source_type, 
        target_schema
    )
    
    return {"job_id": job_id, "message": "Upload started. Connect to /ws/{job_id} for updates."}

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