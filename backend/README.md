# Atom8 Backend

The Atom8 Backend is a powerful **FastAPI** server that orchestrates the AI-driven data transformation pipeline. It interfaces with high-speed LLM providers like Groq and Gemini to clean and structure data.

## ⚙️ Core Pipeline (The Orchestrator)

The backend runs a sophisticated multi-stage pipeline:
1. **Extraction**: `universal_extractor` parses text from files (PDF, CSV, Excel, Images via OCR) or URLs.
2. **Merging**: Aggregates data from multiple sources into a unified context.
3. **Noise Removal**: Cleans boilerplate, null variants, and text outliers.
4. **Cleaning & Normalization**: Standardizes formats (dates, currency, casing).
5. **AI Structuring**: LLM-driven conversion into target JSON or CSV schema.
6. **Validation**: Final validation and insight generation.
7. **Forensics**: Generation of a data autopsy PDF report.

## 🚀 Key APIs

### `POST /upload`
- **Purpose**: Upload files and URLs for processing.
- **Parameters**: `files` (multipart), `urls` (form-data), `target_schema` (string).
- **Secondary Actions**: Starts the `run_orchestrator` background task.

### `WS /ws/{job_id}`
- **Purpose**: Real-time websocket for tracking processing progress and steps.

### `POST /convert-to-csv`
- **Purpose**: LLM-powered JSON to CSV converter.

### `POST /generate-report`
- **Purpose**: Generates a professional PDF "Data Autopsy" report based on processing results.

## 🛠️ Installation & Setup

We recommend using **[uv](https://github.com/astral-sh/uv)** for the fastest dependency management.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   uv pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Create a `.env` file:
   ```env
   GROQ_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   LLM_PROVIDER=gemini  # Or 'groq'
   ```

5. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```

## 📦 Core Modules

- `services/orchestrator.py`: The heart of the platform; manages processing stages.
- `services/llm_service.py`: Interface for Groq and Gemini integrations.
- `services/pdf_generator.py`: Generates the professional PDF reports using ReportLab.
- `processors/ingestion.py`: Handles multi-format data extraction.
- `tools/`: Atomic functions for cleaning, merging, and validation.

---

## ⚡ Performance

The backend is optimized for speed using `AsyncIO` and high-performance LLM sampling (temperature 0.1) for deterministic and accurate data extraction.
