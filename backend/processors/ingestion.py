import io
import asyncio
import pandas as pd
from PIL import Image
import pytesseract
from unstructured.partition.auto import partition
import requests

async def universal_extractor(content: bytes, filename: str = None, source_type: str = "file"):
    """
    Dispatches the raw content to the correct extractor based on type.
    """
    if source_type == "web":
        # content is a URL string
        response = requests.get(content)
        return response.text

    if source_type == "database":
        # content is a connection string/query (Mock logic)
        return "Data extracted from database query result..."

    # File-based extraction
    ext = filename.split('.')[-1].lower() if filename else ""

    if ext in ['csv', 'xlsx']:
        df = pd.read_csv(io.BytesIO(content)) if ext != 'xlsx' else pd.read_excel(io.BytesIO(content))
        return df.to_json(orient="records")

    if ext in ['jpg', 'jpeg', 'png', 'tiff']:
        # Image OCR processing with Tesseract
        image = Image.open(io.BytesIO(content))
        # Run OCR in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, pytesseract.image_to_string, image)
        return text

    if ext == 'pdf':
        try:
            # Handles complex PDFs (tables, text, etc.)
            from unstructured.partition.pdf import partition_pdf
            elements = partition_pdf(file=io.BytesIO(content))
            return "\n\n".join([str(el) for el in elements])
        except Exception as e:
            print(f"Warning: Unstructured PDF parsing failed ({str(e)}). Falling back to basic text extraction.")
            # Fallback for when 'unstructured[pdf]' dependencies (poppler/tesseract) are missing
            import pypdf
            pdf = pypdf.PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() for page in pdf.pages)

    # Fallback for plain text or unknown types
    if content is None:
        return ""
    return content.decode('utf-8', errors='ignore')