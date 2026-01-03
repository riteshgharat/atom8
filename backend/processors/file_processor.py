import io
import asyncio
import pandas as pd
from PIL import Image
import pytesseract
from unstructured.partition.auto import partition

class FileProcessor:
    @staticmethod
    async def process(content: bytes, filename: str):
        ext = filename.split('.')[-1].lower()
        
        try:
            # --- 1. Tabular Data (CSV, Excel, Logs) ---
            if ext in ['csv', 'xlsx', 'log', 'tsv']:
                # For .log files, we treat them as single-column CSVs or raw text
                df = pd.read_csv(io.BytesIO(content)) if ext != 'xlsx' else pd.read_excel(io.BytesIO(content))
                return {
                    "data": df.to_dict(orient="records"),
                    "format": "tabular",
                    "stats": {"rows": len(df), "columns": list(df.columns)}
                }

            # --- 2. Images (OCR with Tesseract) ---
            elif ext in ['jpg', 'jpeg', 'png', 'tiff']:
                image = Image.open(io.BytesIO(content))
                # Run OCR in executor to avoid blocking
                loop = asyncio.get_event_loop()
                text = await loop.run_in_executor(None, pytesseract.image_to_string, image)
                return {"data": text, "format": "ocr_text"}

            # --- 3. Documents (PDF, Docx) ---
            elif ext in ['pdf', 'docx']:
                # partition handles high-res extraction of tables and text
                elements = partition(file=io.BytesIO(content))
                text = "\n\n".join([str(el) for el in elements])
                return {"data": text, "format": "document_text"}

            else:
                return {"data": content.decode('utf-8', errors='ignore'), "format": "raw_text"}

        except Exception as e:
            raise Exception(f"File Parsing Error ({filename}): {str(e)}")