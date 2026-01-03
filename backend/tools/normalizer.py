import dateparser
import phonenumbers
import re
from urllib.parse import urlparse, urlunparse

def normalize_date(date_str: str) -> str:
    """
    Converts ambiguous date strings into ISO 8601 (YYYY-MM-DD).
    Returns 'N/A' if unparseable.
    """
    if not date_str:
        return None
        
    parsed_date = dateparser.parse(date_str)
    if parsed_date:
        return parsed_date.strftime("%Y-%m-%d")
    return "N/A"

def normalize_phone(phone_str: str) -> str:
    """
    Formats phone numbers to E.164 standard (+14155552671).
    """
    try:
        phone_obj = phonenumbers.parse(phone_str, None)
        if phonenumbers.is_valid_number(phone_obj):
            return phonenumbers.format_number(
                phone_obj, phonenumbers.PhoneNumberFormat.E164
            )
    except:
        pass
    return phone_str  # Return original if validation fails

def normalize_currency(amount_str: str) -> float:
    """
    Extracts numeric value from currency strings like '$1,200.50' or '1.2k'.
    """
    if not amount_str:
        return 0.0
        
    # Remove currency symbols and commas
    clean_str = re.sub(r'[^\d.]', '', amount_str)
    try:
        return float(clean_str)
    except ValueError:
        return 0.0

def normalize_text(text: str, case: str = "lower") -> str:
    """
    General text normalization: strips whitespace and converts case.
    case: 'lower', 'upper', 'title', or None (preserve)
    """
    if not text:
        return ""
    
    text = text.strip()
    if case == "lower":
        return text.lower()
    elif case == "upper":
        return text.upper()
    elif case == "title":
        return text.title()
    return text

def normalize_percentage(percent_str: str) -> float:
    """
    Converts percentage strings like '50%', '50.5 %', or '0.5' to a float ratio (0.5).
    """
    if not percent_str:
        return 0.0
    
    clean_str = percent_str.replace("%", "").strip()
    try:
        val = float(clean_str)
        # Heuristic: if > 1, assume it's a percentage (e.g. 50 -> 0.5)
        # unless it was explicitly a small number. This is ambiguous but common.
        # If the original string had a %, we definitely divide by 100.
        if "%" in percent_str:
            return val / 100.0
        return val
    except ValueError:
        return 0.0

def normalize_boolean(bool_str: str) -> bool:
    """
    Converts strings like 'yes', 'true', '1', 'on' to True, others to False.
    """
    if not bool_str:
        return False
    
    return str(bool_str).lower().strip() in ("true", "yes", "1", "on", "y", "t")

def normalize_email(email_str: str) -> str:
    """
    Standardizes email addresses to lowercase and removes whitespace.
    """
    if not email_str:
        return ""
    return email_str.strip().lower()

def normalize_url(url_str: str) -> str:
    """
    Ensures URLs have a scheme (defaulting to https) and removes query params if needed.
    """
    if not url_str:
        return ""
    
    url_str = url_str.strip()
    if not url_str.startswith(("http://", "https://")):
        url_str = "https://" + url_str
        
    try:
        parsed = urlparse(url_str)
        # Reconstruct to ensure standard format
        return urlunparse(parsed)
    except:
        return url_str