"""
Groq Whisper Speech-to-Text Service

Automatically selects model based on audio duration:
- whisper-large-v3-turbo: Fast model for audio < 30 seconds
- whisper-large-v3: Accurate model for audio >= 30 seconds
"""

import os
import io
import asyncio
import tempfile
from typing import Tuple, Optional
from groq import Groq

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Model selection thresholds
TURBO_THRESHOLD_SECONDS = 30

# Supported audio formats
AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'mpeg', 'mpga'}


def get_audio_duration(audio_bytes: bytes, filename: str) -> float:
    """
    Get audio duration in seconds using pydub.
    Falls back to file size estimation if pydub fails.
    """
    try:
        from pydub import AudioSegment
        
        ext = filename.split('.')[-1].lower() if filename else 'mp3'
        
        # Map common extensions to pydub format names
        format_map = {
            'mp3': 'mp3',
            'wav': 'wav',
            'm4a': 'm4a',
            'ogg': 'ogg',
            'webm': 'webm',
            'flac': 'flac',
            'mpeg': 'mp3',
            'mpga': 'mp3'
        }
        
        audio_format = format_map.get(ext, 'mp3')
        
        # Load audio and get duration
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=audio_format)
        duration_seconds = len(audio) / 1000.0  # pydub returns milliseconds
        
        print(f"[Whisper] Audio duration detected: {duration_seconds:.2f} seconds")
        return duration_seconds
        
    except Exception as e:
        print(f"[Whisper] Warning: Could not detect audio duration ({str(e)}). Using file size estimation.")
        # Rough estimation: ~10KB per second for compressed audio
        estimated_duration = len(audio_bytes) / 10000
        return max(estimated_duration, 1.0)


def select_whisper_model(duration_seconds: float) -> str:
    """
    Select the appropriate Whisper model based on audio duration.
    
    - whisper-large-v3-turbo: Faster, for short audio (< 30s)
    - whisper-large-v3: More accurate, for longer audio (>= 30s)
    """
    if duration_seconds < TURBO_THRESHOLD_SECONDS:
        model = "whisper-large-v3-turbo"
        print(f"[Whisper] Selected TURBO model (audio < {TURBO_THRESHOLD_SECONDS}s)")
    else:
        model = "whisper-large-v3"
        print(f"[Whisper] Selected V3 model (audio >= {TURBO_THRESHOLD_SECONDS}s)")
    
    return model


async def transcribe_audio(
    audio_bytes: bytes, 
    filename: str,
    language: Optional[str] = None
) -> Tuple[str, dict]:
    """
    Transcribe audio using Groq Whisper API.
    
    Args:
        audio_bytes: Raw audio file bytes
        filename: Original filename (used for format detection)
        language: Optional language code (e.g., 'en', 'es', 'hi')
    
    Returns:
        Tuple of (transcription_text, metadata_dict)
    """
    
    # Get audio duration
    duration = get_audio_duration(audio_bytes, filename)
    
    # Select model based on duration
    model = select_whisper_model(duration)
    
    # Prepare metadata
    metadata = {
        "duration_seconds": round(duration, 2),
        "model_used": model,
        "filename": filename,
        "file_size_bytes": len(audio_bytes)
    }
    
    try:
        loop = asyncio.get_event_loop()
        
        def call_whisper_api():
            # Write audio to temp file (Groq API requires file path)
            ext = filename.split('.')[-1].lower() if filename else 'mp3'
            with tempfile.NamedTemporaryFile(suffix=f'.{ext}', delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name
            
            try:
                with open(tmp_path, 'rb') as audio_file:
                    # Call Groq Whisper API
                    transcription = groq_client.audio.transcriptions.create(
                        model=model,
                        file=audio_file,
                        language=language,  # Optional: auto-detect if None
                        response_format="verbose_json"  # Get detailed response
                    )
                    return transcription
            finally:
                # Clean up temp file
                os.unlink(tmp_path)
        
        # Run API call in executor to avoid blocking
        result = await loop.run_in_executor(None, call_whisper_api)
        
        # Extract transcription text
        transcription_text = result.text if hasattr(result, 'text') else str(result)
        
        # Update metadata with API response details
        if hasattr(result, 'duration'):
            metadata["api_duration"] = result.duration
        if hasattr(result, 'language'):
            metadata["detected_language"] = result.language
        
        print(f"[Whisper] Transcription complete: {len(transcription_text)} characters")
        
        return transcription_text, metadata
        
    except Exception as e:
        error_msg = str(e)
        print(f"[Whisper] Error: {error_msg}")
        metadata["error"] = error_msg
        
        # Return error message as transcription for debugging
        return f"[Transcription Error: {error_msg}]", metadata


def is_audio_file(filename: str) -> bool:
    """Check if a filename is a supported audio format."""
    if not filename:
        return False
    ext = filename.split('.')[-1].lower()
    return ext in AUDIO_EXTENSIONS
