import os
import json
from groq import Groq
from typing import Dict, Any

# Initialize Groq client
# Ensure GROQ_API_KEY is set in your .env file
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def ai_structurizer(raw_data: str, target_schema: str) -> Dict[str, Any]:
    """
    Uses Groq LLM to clean, normalize, and structure raw multimedia data.
    """
    
    system_prompt = f"""
    You are an expert Data Engineer AI. Your task is to extract information from messy, 
    unstructured multimedia data and convert it into a valid, clean JSON object.

    ### TARGET SCHEMA:
    {target_schema}

    ### RULES:
    1. STRICTURE: Only return valid JSON. No conversational text.
    2. CLEANING: Remove noise, boilerplate text, and irrelevant characters.
    3. NORMALIZATION: 
       - Dates: Convert to YYYY-MM-DD.
       - Currency: Convert to numeric float (e.g., "$1,200.50" -> 1200.50).
       - Strings: Proper casing (Title Case for names).
    4. ERROR HANDLING: If a field in the schema cannot be found, set it to null.
    5. MULTILINGUAL: Translate any non-English data to English during extraction.
    """

    try:
        # Using Llama-3-70b for high-reasoning tasks or 8b for instant speed
        chat_completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"RAW DATA TO PROCESS:\n{raw_data}"}
            ],
            # This ensures the output is strictly JSON
            response_format={"type": "json_object"},
            temperature=0.1, # Low temperature for high accuracy/consistency
        )

        # Parse the string response into a Python Dictionary
        structured_output = json.loads(chat_completion.choices[0].message.content)
        return structured_output

    except json.JSONDecodeError:
        return {"error": "LLM returned invalid JSON. Retrying may be necessary."}
    except Exception as e:
        return {"error": f"Groq API Error: {str(e)}"}