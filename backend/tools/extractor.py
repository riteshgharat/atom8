import re
import phonenumbers
from typing import List

def extract_emails(text: str) -> List[str]:
    """
    Extracts all email addresses from the text.
    """
    if not text:
        return []
    # Regex for email extraction
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    return re.findall(pattern, text)

def extract_urls(text: str) -> List[str]:
    """
    Extracts all URLs from the text.
    """
    if not text:
        return []
    # Regex for URL extraction (http/https)
    pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*'
    return re.findall(pattern, text)

def extract_phones(text: str, region: str = "US") -> List[str]:
    """
    Extracts phone numbers from the text using phonenumbers library.
    """
    if not text:
        return []
    phones = []
    for match in phonenumbers.PhoneNumberMatcher(text, region):
        phones.append(phonenumbers.format_number(
            match.number, phonenumbers.PhoneNumberFormat.E164
        ))
    return phones

def extract_hashtags(text: str) -> List[str]:
    """
    Extracts hashtags (e.g. #example) from the text.
    """
    if not text:
        return []
    pattern = r'#\w+'
    return re.findall(pattern, text)

def extract_mentions(text: str) -> List[str]:
    """
    Extracts mentions (e.g. @user) from the text.
    """
    if not text:
        return []
    pattern = r'@\w+'
    return re.findall(pattern, text)

def extract_dates(text: str) -> List[str]:
    """
    Extracts potential date strings using regex patterns.
    Note: This is a heuristic and might need more robust parsing for complex cases.
    """
    if not text:
        return []
    
    # Common date patterns: YYYY-MM-DD, MM/DD/YYYY, DD.MM.YYYY
    patterns = [
        r'\d{4}-\d{2}-\d{2}',       # ISO
        r'\d{1,2}/\d{1,2}/\d{2,4}', # US/UK
        r'\d{1,2}\.\d{1,2}\.\d{2,4}' # EU
    ]
    
    dates = []
    for pattern in patterns:
        dates.extend(re.findall(pattern, text))
        
    return list(set(dates)) # Unique dates
