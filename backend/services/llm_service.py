import os
import json
import asyncio
from groq import Groq
from typing import Dict, Any
import google.generativeai as genai

# Global variable to switch between LLM providers
# Options: "groq" or "gemini"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "AIzaSyDNYzLRm4coQ1krriVjeci1nprOr4c2KTA"))

# Estimate ~4 characters per token (rough approximation)
MAX_INPUT_CHARS = 15000  # ~2000 tokens for input
SYSTEM_PROMPT_TOKENS = 400  # Reserve space for system prompt
RESERVE_TOKENS = 500  # Reserve for response + safety margin

def truncate_data(raw_data: str, target_schema: str) -> str:
    """
    Intelligently truncate raw data to fit within Groq's token limits.
    Keeps beginning and end of data to preserve context.
    """
    if isinstance(raw_data, dict):
        # If raw_data is already a dict (from JSON parsing), convert to string
        raw_data = json.dumps(raw_data)
    
    data_str = str(raw_data)
    
    # Rough token estimation: ~4 chars per token
    schema_tokens = len(target_schema) // 4
    # Max tokens for llama-3 is around 8k or 32k depending on version, keeping safe at 6k chars effective context
    available_chars = 15000 # Decreased to avoid 429 Rate Limit error on free tier
    
    if len(data_str) <= available_chars:
        return data_str
    
    print(f"[WARNING] Input data too large ({len(data_str)} chars). Truncating to {available_chars} chars...")
    
    # Strategy: Keep first 60% and last 40% of data to preserve context
    keep_first = int(available_chars * 0.6)
    keep_last = int(available_chars * 0.4)
    
    truncated = (
        data_str[:keep_first] + 
        f"\n\n[... {len(data_str) - available_chars} characters omitted ...]\n\n" + 
        data_str[-keep_last:]
    )
    
    return truncated

async def ai_structurizer(raw_data: str, target_schema: str) -> Dict[str, Any]:
    """
    Uses Groq or Gemini LLM to clean, normalize, and structure raw multimedia data.
    Handles large inputs by smart truncation.
    Switches provider based on LLM_PROVIDER global variable.
    """
    
    # Truncate if necessary
    processed_data = truncate_data(raw_data, target_schema)
    
    system_prompt = f"""
    You are an expert Data Engineer AI. Your task is to extract information from messy, 
    unstructured multimedia data and convert it into a valid, clean JSON object.

    ### TARGET SCHEMA:
    {target_schema}

    ### RULES:
    1. STRUCTURE: Only return valid JSON. No conversational text.
    2. CLEANING: Remove noise, boilerplate text, and irrelevant characters.
    3. NORMALIZATION: 
       - Dates: Convert to YYYY-MM-DD.
       - Currency: Convert to numeric float (e.g., "$1,200.50" -> 1200.50).
       - Strings: Proper casing (Title Case for names).
    4. ERROR HANDLING: If a field in the schema cannot be found, set it to null.
    5. MULTILINGUAL: Translate any non-English data to English during extraction.
    6. PARTIAL DATA: If input is truncated, extract what you can from available data.
    """

    try:
        loop = asyncio.get_event_loop()
        
        if LLM_PROVIDER == "gemini":
            return await _call_gemini(processed_data, system_prompt)
        else:  # Default to groq
            return await _call_groq(processed_data, system_prompt)

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return {"error": "LLM returned invalid JSON. Retrying may be necessary."}
    except Exception as e:
        error_msg = str(e)
        print(f"LLM API Error: {error_msg}")
        
        # Check if it's a rate limit/token size error
        if "too large" in error_msg.lower() or "rate_limit" in error_msg.lower():
            return {"error": "Input data exceeded token limit. Please upload a smaller file or reduce the amount of data."}
        
        return {"error": f"LLM API Error: {error_msg}"}


async def _call_groq(processed_data: str, system_prompt: str) -> Dict[str, Any]:
    """
    Call Groq API for data structuring.
    """
    loop = asyncio.get_event_loop()
    
    def call_groq_api():
        return groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"RAW DATA TO PROCESS:\n{processed_data}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
    
    chat_completion = await loop.run_in_executor(None, call_groq_api)
    structured_output = json.loads(chat_completion.choices[0].message.content)
    return structured_output


async def _call_gemini(processed_data: str, system_prompt: str) -> Dict[str, Any]:
  
    loop = asyncio.get_event_loop()
    
    def call_gemini_api():
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            system_instruction=system_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        response = model.generate_content(f"RAW DATA TO PROCESS:\n{processed_data}")
        return response.text
    
    json_response = await loop.run_in_executor(None, call_gemini_api)
    structured_output = json.loads(json_response)
    return structured_output