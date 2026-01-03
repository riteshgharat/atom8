from fastapi import FastAPI, UploadFile, WebSocket,File, Form, WebSocket, BackgroundTasks
# from .processors.file_processor import process_uploaded_file
# from .services.llm_service import transform_data
from fastapi.middleware.cors import CORSMiddleware
import uuid
# from .services.orchestrator import start_pipeline

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
    active_jobs[job_id] = {"status": "ingesting", "progress": 10}
    
    # Logic to capture the correct raw data
    input_data = await file.read() if file else raw_input
    file_name = file.filename if file else "input_source"

    background_tasks.add_task(
        run_orchestrator, 
        job_id, 
        input_data, 
        file_name, 
        source_type, 
        target_schema,
        raw_input
    )
    
    return {"job_id": job_id}

@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    # Logic to push updates from active_jobs to the frontend
    # This keeps the user "in the loop" as requested
    while True:
        if job_id in active_jobs:
            status = active_jobs[job_id]
            await websocket.send_json(status)
            if status["status"] in ["completed", "failed"]:
                break