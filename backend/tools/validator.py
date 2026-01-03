import json
import re
import dateparser
import phonenumbers
from urllib.parse import urlparse
from pydantic import ValidationError, create_model

from tools.normalizer import normalize_date, normalize_currency, normalize_text

def generate_insights_and_clean(data: dict) -> tuple[dict, list]:
    """
    Recursively traverse the data to apply normalization and generate insights.
    Returns: (processed_data, insights_list)
    """
    insights = []
    
    def recursive_normalize(obj, parent_key=""):
        if isinstance(obj, dict):
            new_obj = {}
            for k, v in obj.items():
                # Construct path for insights (e.g. "user.address.city")
                # If parent_key ends with ']', it means we are inside an array item, effectively showing row
                current_path = f"{parent_key}.{k}" if parent_key else k
                
                # Check for NULLs
                if v is None:
                    # Provide a cleaner message for array items
                    if "[" in current_path:
                        # Extract row index for better readability
                        # e.g. "transactions[5].credit" -> "Row 5: Missing value for 'credit'"
                        import re
                        match = re.search(r"(\w+)\[(\d+)\]\.(.+)", current_path)
                        if match:
                            array_name, row_idx, field_name = match.groups()
                            row_num = int(row_idx) + 1 # 1-based index for humans
                            insights.append(f"Row {row_num} in '{array_name}': Missing value for field '{field_name}'")
                        else:
                            insights.append(f"Missing value for field '{current_path}'")
                    else:
                        insights.append(f"Missing value for field '{current_path}'")
                    
                    new_obj[k] = None
                    continue
                
                # Heuristic Normalization based on Keys
                key_lower = k.lower()
                
                # 1. Dates
                if any(x in key_lower for x in ["date", "dob", "time", "created", "updated"]):
                    if isinstance(v, str):
                        normalized = normalize_date(v)
                        if normalized != "N/A" and normalized != v:
                            insights.append(f"Normalized date in '{current_path}': '{v}' -> '{normalized}'")
                            new_obj[k] = normalized
                        else:
                            new_obj[k] = v
                    else:
                        new_obj[k] = v
                        
                # 2. Currency / Price
                elif any(x in key_lower for x in ["price", "cost", "amount", "total", "fee", "budget"]):
                    if isinstance(v, (str, int, float)):
                        # If string, try to convert. If number, keep as is.
                        if isinstance(v, str):
                            normalized = normalize_currency(v)
                            if normalized != 0.0 or v == "0": # Basic check
                                # Only log if it changed significantly (str to float)
                                insights.append(f"Normalized currency in '{current_path}': '{v}' -> {normalized}")
                                new_obj[k] = normalized
                            else:
                                new_obj[k] = v
                        else:
                            new_obj[k] = float(v)
                    else:
                        new_obj[k] = v
                
                # 3. String Casing (Names, Cities, Countries)
                elif isinstance(v, str) and any(x in key_lower for x in ["name", "city", "country", "title", "location"]):
                     normalized = normalize_text(v, case="title")
                     if normalized != v:
                         # Don't log every casing change to avoid clutter, but apply it
                         new_obj[k] = normalized
                     else:
                         new_obj[k] = v
                         
                # Recurse
                elif isinstance(v, (dict, list)):
                    new_obj[k] = recursive_normalize(v, current_path)
                else:
                    new_obj[k] = v
            return new_obj
            
        elif isinstance(obj, list):
             # Pass the index to children so we know the row number
            return [recursive_normalize(item, f"{parent_key}[{i}]") for i, item in enumerate(obj)]
        
        return obj

    processed_data = recursive_normalize(data)
    
    # Simple deduplication or summary could happen here
    return processed_data, insights

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