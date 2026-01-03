import io
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

    if ext in ['csv', 'xlsx', 'log']:
        df = pd.read_csv(io.BytesIO(content)) if ext != 'xlsx' else pd.read_excel(io.BytesIO(content))
        return df.to_json(orient="records")

    if ext in ['jpg', 'jpeg', 'png']:
        # Image OCR processing
        image = Image.open(io.BytesIO(content))
        return pytesseract.image_to_string(image)

    if ext == 'pdf':
        # Handles complex PDFs (tables, text, etc.)
        elements = partition(file=io.BytesIO(content))
        return "\n\n".join([str(el) for el in elements])

    # Fallback for plain text or unknown types
    return content.decode('utf-8', errors='ignore')