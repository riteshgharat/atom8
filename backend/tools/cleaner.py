import re
import string
from bs4 import BeautifulSoup
import unicodedata

def clean_text_content(raw_text: str) -> str:
    """
    Standardizes text by removing HTML tags, extra whitespace, 
    and non-standard characters.
    """
    if not raw_text:
        return ""

    # 1. Remove HTML tags (if source was Web/API)
    soup = BeautifulSoup(raw_text, "html.parser")
    text = soup.get_text(separator=" ")

    # 2. Normalize Unicode (e.g., convert fancy quotes to standard quotes)
    text = unicodedata.normalize("NFKD", text)

    # 3. Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # 4. Remove common "noise" (boilerplate emails, disclaimers)
    # This is a heuristic; you can expand this list or use an ML model
    noise_patterns = [
        r"Sent from my iPhone",
        r"unsubscribe",
        r"copyright \d{4}"
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    return text

def remove_punctuation(text: str) -> str:
    """
    Removes all punctuation characters from the text.
    """
    if not text:
        return ""
    return text.translate(str.maketrans('', '', string.punctuation))

def redact_emails(text: str, placeholder: str = "[EMAIL]") -> str:
    """
    Replaces email addresses with a placeholder.
    """
    if not text:
        return ""
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    return re.sub(pattern, placeholder, text)

def redact_phones(text: str, placeholder: str = "[PHONE]") -> str:
    """
    Replaces phone numbers with a placeholder.
    Note: This uses a simple regex and might not catch all formats.
    """
    if not text:
        return ""
    # Basic phone regex (US-centric but catches many common formats)
    pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    return re.sub(pattern, placeholder, text)

def remove_urls(text: str, placeholder: str = "") -> str:
    """
    Removes URLs from the text.
    """
    if not text:
        return ""
    pattern = r'https?://\S+|www\.\S+'
    return re.sub(pattern, placeholder, text)
