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


async def json_to_csv_converter(json_data: Dict[str, Any]) -> str:
    """
    Uses Groq or Gemini LLM to intelligently convert JSON data to CSV format.
    Handles nested structures, arrays, and complex data normalization.
    
    Args:
        json_data: The JSON data to convert to CSV
    
    Returns:
        String containing the CSV data
    """
    
    # Convert JSON to string for LLM input
    json_str = json.dumps(json_data, indent=2)
    
    system_prompt = """
    You are an expert Data Engineer AI specialized in CSV generation. Your task is to convert 
    JSON data into a clean, well-formatted CSV file.

    ### RULES:
    1. **Array Normalization**: If there are arrays of objects (e.g., "eras": [...]), create ONE ROW per array element
    2. **Column Structure**: Extract fields from objects as separate columns
    3. **Header Formatting**: Use clear, readable column names (e.g., "Best Player" not "best_player")
    4. **Nested Arrays**: Convert to semicolon-separated values (e.g., ["a", "b"] becomes "a; b")
    5. **Missing Values**: Use empty strings for missing/null values
    6. **No Duplicates**: Ensure no duplicate rows
    7. **Format**: Return ONLY the CSV content (including header row), nothing else
    8. **Quoting**: Properly quote values that contain commas or special characters

    ### EXAMPLE:
    Input JSON:
    {
      "eras": [
        {"name": "Era1", "player": "John", "teams": ["A", "B"]},
        {"name": "Era2", "player": "Jane", "teams": ["C"]}
      ]
    }

    Expected CSV Output:
    "Name","Player","Teams"
    "Era1","John","A; B"
    "Era2","Jane","C"

    Return ONLY the CSV content, no additional text or explanations.
    """
    
    try:
        loop = asyncio.get_event_loop()
        
        if LLM_PROVIDER == "gemini":
            csv_result = await _call_llm_for_csv_gemini(json_str, system_prompt)
        else:  # Default to groq
            csv_result = await _call_llm_for_csv_groq(json_str, system_prompt)
        
        return csv_result
        
    except Exception as e:
        error_msg = str(e)
        print(f"CSV Conversion Error: {error_msg}")
        # Fallback: return JSON as single-column CSV
        return f"\"Data\"\n\"{json_str.replace(chr(34), chr(34)+chr(34))}\""


async def _call_llm_for_csv_groq(json_str: str, system_prompt: str) -> str:
    """
    Call Groq API for JSON to CSV conversion.
    """
    loop = asyncio.get_event_loop()
    
    def call_groq_api():
        return groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Convert this JSON to CSV:\\n{json_str}"}
            ],
            temperature=0.1,
        )
    
    chat_completion = await loop.run_in_executor(None, call_groq_api)
    csv_content = chat_completion.choices[0].message.content.strip()
    
    # Remove markdown code fences if present
    if csv_content.startswith("```"):
        lines = csv_content.split("\n")
        csv_content = "\n".join(lines[1:-1]) if len(lines) > 2 else csv_content
    
    return csv_content


async def generate_data_autopsy_report(processing_data: Dict[str, Any]) -> str:
    """
    Generate a comprehensive "Data Autopsy" style report using Groq LLM.
    Includes error analysis, data health metrics, lineage tracking, and AI readiness badges.
    
    Args:
        processing_data: The complete processing results and metadata
    
    Returns:
        Formatted markdown report
    """
    
    # Convert processing data to JSON string for LLM
    data_str = json.dumps(processing_data, indent=2)
    
    system_prompt = """
    You are an elite Data Forensics AI specialized in creating comprehensive "Data Autopsy" reports.
    Your reports are legendary for their clarity, insights, and actionable recommendations.

    ## YOUR MISSION:
    Analyze the data processing results and create a professional, visually-striking report that includes:

    ### 1. 📊 DATA AUTOPSY (Error Root Cause Analysis)
    - Identify ALL error patterns and their distribution percentages
    - Explain WHY each type of error occurred
    - Group errors by category (format issues, missing data, validation failures, etc.)
    - Example format:
      ```
      🔍 ERROR DISTRIBUTION:
      • 63% - Date format mismatches (DD/MM/YYYY vs ISO)
      • 21% - Missing required fields (email, phone)
      • 11% - Duplicate entries detected
      • 5% - Unknown pattern anomalies
      ```

    ### 2. 💊 DATA HEALTH SCORE
    - Calculate overall data health (0-100 scale)
    - Show before/after if cleaning was applied
    - Break down by categories (completeness, accuracy, consistency, validity)
    
    ### 3. 🎯 AI READINESS BADGES
    Award badges based on data quality:
    - ✅ ML READY (90-100 health score)
    - ✅ ANALYTICS READY (70-89 health score)
    - ⚠️ NEEDS REVIEW (50-69 health score)
    - ❌ CRITICAL ISSUES (<50 health score)

    ### 4. 🧬 DATA LINEAGE SUMMARY
    - Show transformation pipeline stages
    - Highlight what changed at each step
    - Track data flow: Raw → Cleaned → Normalized → Validated

    ### 5. 💡 KEY INSIGHTS (ELI5 Mode)
    - Provide both technical AND plain English explanations
    - Example: "Your data is messy because dates are written in different styles (some use MM/DD/YYYY, others DD/MM/YYYY)"

    ### 6. 🚀 RECOMMENDATIONS
    - Actionable next steps to improve data quality
    - Specific fixes that would have the highest impact
    - "What if I fix this?" scenarios with projected improvements

    ### 7. 📈 STATISTICS SUMMARY
    - Total records processed
    - Success rate
    - Processing time (if available)
    - Data size before/after

    ## FORMATTING RULES:
    - Use Markdown with emojis for visual appeal
    - Use bullet points, tables, and sections liberally
    - Include percentages and specific numbers
    - Make it scannable with clear headers
    - Use technical terms but also provide plain English
    - Be confident and insightful, not generic

    ## OUTPUT FORMAT:
    Return ONLY the markdown report. No preamble, no "Here's your report", just the content.
    """
    
    try:
        loop = asyncio.get_event_loop()
        
        def call_groq_api():
            return groq_client.chat.completions.create(
                model="openai/gpt-oss-120b",  # Using the most capable model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate a comprehensive Data Autopsy report for this processing data:\n\n{data_str}"}
                ],
                temperature=0.3,  # Slightly higher for more creative insights
                max_tokens=4000,  # Allow detailed report
            )
        
        chat_completion = await loop.run_in_executor(None, call_groq_api)
        report_content = chat_completion.choices[0].message.content.strip()
        
        # Remove markdown code fences if present
        if report_content.startswith("```"):
            lines = report_content.split("\n")
            report_content = "\n".join(lines[1:-1]) if len(lines) > 2 else report_content
        
        return report_content
        
    except Exception as e:
        error_msg = str(e)
        print(f"Report Generation Error: {error_msg}")
        
        # Fallback: create basic report
        return f"""# Data Processing Report

## Summary
Processing completed. See JSON output for detailed results.

**Total Sources:** {len(processing_data.get('results', []))}
**Status:** Completed

**Error:** Unable to generate detailed autopsy report ({error_msg})

Please review the JSON output for complete data.
"""