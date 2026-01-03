import json
import re
import dateparser
import phonenumbers
from urllib.parse import urlparse
from pydantic import ValidationError, create_model

def validate_against_schema(data: dict, schema_definition: dict) -> dict:
    """
    Checks if the extracted data matches the user's required schema.
    Returns a status dict: {"valid": bool, "errors": list, "data": dict}
    """
    try:
        # Dynamically create a Pydantic model from the user's schema definition
        # schema_definition example: {"name": (str, ...), "age": (int, ...)}
        DynamicModel = create_model("DynamicSchema", **schema_definition)
        
        # Validate data
        validated_obj = DynamicModel(**data)
        
        return {
            "valid": True, 
            "errors": [], 
            "data": validated_obj.model_dump()
        }

    except ValidationError as e:
        # Format errors for the frontend/LLM
        error_messages = []
        for err in e.errors():
            field = err['loc'][0]
            msg = err['msg']
            error_messages.append(f"Field '{field}': {msg}")
            
        return {
            "valid": False, 
            "errors": error_messages, 
            "data": data # Return raw data so user can see what failed
        }

def is_valid_email(email: str) -> bool:
    """
    Checks if the string is a valid email address.
    """
    if not email:
        return False
    # Simple regex for email validation
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def is_valid_url(url: str) -> bool:
    """
    Checks if the string is a valid URL.
    """
    if not url:
        return False
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def is_valid_phone(phone: str) -> bool:
    """
    Checks if the string is a valid phone number using phonenumbers library.
    """
    if not phone:
        return False
    try:
        phone_obj = phonenumbers.parse(phone, None)
        return phonenumbers.is_valid_number(phone_obj)
    except:
        return False

def is_valid_date(date_str: str) -> bool:
    """
    Checks if the string can be parsed into a valid date.
    """
    if not date_str:
        return False
    return dateparser.parse(date_str) is not None

def is_valid_json(json_str: str) -> bool:
    """
    Checks if the string is valid JSON.
    """
    if not json_str:
        return False
    try:
        json.loads(json_str)
        return True
    except ValueError:
        return False