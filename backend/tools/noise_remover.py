"""
Noise Remover tool for removing null values, outliers, NA values, and other noise from data
"""
import json
import re
import statistics
from typing import Any, Dict, List, Union

def is_null_like(value: Any) -> bool:
    """
    Check if a value is null-like (null, None, NA, N/A, nan, empty string, etc.)
    """
    if value is None:
        return True
    
    if isinstance(value, float) and (value != value):  # NaN check
        return True
    
    if isinstance(value, str):
        # Check for common null representations
        null_patterns = [
            r'^null$',
            r'^none$',
            r'^na$',
            r'^n/a$',
            r'^nan$',
            r'^n\.a\.$',
            r'^#N/A$',
            r'^#NA$',
            r'^\s*$',  # Empty or whitespace only
        ]
        
        normalized = value.strip().lower()
        for pattern in null_patterns:
            if re.match(pattern, normalized):
                return True
    
    return False

def is_outlier(value: Any, numeric_values: List[float], threshold: float = 2.5) -> bool:
    """
    Detect statistical outliers using z-score method.
    Values with z-score > threshold are considered outliers.
    """
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    
    if len(numeric_values) < 2:
        return False
    
    try:
        mean = statistics.mean(numeric_values)
        stdev = statistics.stdev(numeric_values)
        
        if stdev == 0:
            return False
        
        z_score = abs((value - mean) / stdev)
        return z_score > threshold
    except:
        return False

def remove_noise_from_records(records: List[Dict[str, Any]], strategy: str = 'remove') -> tuple:
    """
    Remove noise from a list of JSON records.
    
    Args:
        records: List of dictionaries to clean
        strategy: 'remove' (drop records with nulls), 'fill' (replace with empty string), 'keep' (keep as-is)
    
    Returns:
        Tuple of (cleaned_records, noise_summary)
    """
    if not records:
        return [], {"strategy": strategy, "records_input": 0, "records_output": 0, "nulls_found": 0, "outliers_found": 0, "empty_records": 0}
    
    print(f"\n[NOISE_REMOVER] Processing {len(records)} records with strategy: '{strategy}'")
    
    cleaned_records = []
    noise_summary = {
        "strategy": strategy,
        "records_input": len(records),
        "records_output": 0,
        "nulls_found": 0,
        "outliers_found": 0,
        "empty_records": 0,
        "fields_affected": set()
    }
    
    # First pass: identify numeric fields for outlier detection
    numeric_fields = {}
    for record in records:
        if isinstance(record, dict):
            for key, value in record.items():
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    if key not in numeric_fields:
                        numeric_fields[key] = []
                    numeric_fields[key].append(value)
    
    # Second pass: clean records
    for record in records:
        if not isinstance(record, dict):
            continue
        
        cleaned_record = {}
        null_count = 0
        outlier_count = 0
        
        for field, value in record.items():
            # Check for null values
            if is_null_like(value):
                null_count += 1
                noise_summary["nulls_found"] += 1
                noise_summary["fields_affected"].add(field)
                
                if strategy == 'remove':
                    continue  # Skip this field
                elif strategy == 'fill':
                    cleaned_record[field] = ""  # Replace with empty string
                else:  # 'keep'
                    cleaned_record[field] = value
            
            # Check for outliers
            elif field in numeric_fields and len(numeric_fields[field]) > 2:
                if is_outlier(value, numeric_fields[field]):
                    outlier_count += 1
                    noise_summary["outliers_found"] += 1
                    noise_summary["fields_affected"].add(field)
                    print(f"  ⚠ Outlier detected: {field}={value} (mean={statistics.mean(numeric_fields[field]):.2f})")
                    
                    if strategy == 'remove':
                        continue  # Skip this field
                    elif strategy == 'fill':
                        cleaned_record[field] = None  # Replace with null
                    else:  # 'keep'
                        cleaned_record[field] = value
                else:
                    cleaned_record[field] = value
            else:
                cleaned_record[field] = value
        
        # Keep record if it has at least some data or strategy is not 'remove'
        if cleaned_record or strategy != 'remove':
            if not cleaned_record:  # Completely empty
                noise_summary["empty_records"] += 1
                if strategy != 'remove':
                    cleaned_records.append(cleaned_record)
            else:
                cleaned_records.append(cleaned_record)
    
    noise_summary["records_output"] = len(cleaned_records)
    noise_summary["fields_affected"] = list(noise_summary["fields_affected"])
    
    print(f"[NOISE_REMOVER] ✓ Cleaned {len(records)} → {len(cleaned_records)} records")
    print(f"  - Nulls found: {noise_summary['nulls_found']}")
    print(f"  - Outliers found: {noise_summary['outliers_found']}")
    print(f"  - Empty records: {noise_summary['empty_records']}")
    
    return cleaned_records, noise_summary

def remove_noise_from_text(text: str) -> tuple:
    """
    Remove noise from text content (null-like strings, excessive whitespace).
    
    Args:
        text: Text content to clean
    
    Returns:
        Tuple of (cleaned_text, noise_summary)
    """
    if not text:
        return "", {"nulls_found": 0, "whitespace_removed": 0, "lines_kept": 0}
    
    lines = text.split('\n')
    cleaned_lines = []
    null_count = 0
    whitespace_removed = 0
    
    for line in lines:
        # Skip null-like lines
        if is_null_like(line):
            null_count += 1
            continue
        
        # Remove excessive whitespace
        original_length = len(line)
        cleaned_line = re.sub(r'\s+', ' ', line).strip()
        
        if original_length != len(cleaned_line):
            whitespace_removed += 1
        
        if cleaned_line:  # Only keep non-empty lines
            cleaned_lines.append(cleaned_line)
    
    cleaned_text = '\n'.join(cleaned_lines)
    
    noise_summary = {
        "nulls_found": null_count,
        "whitespace_removed": whitespace_removed,
        "lines_kept": len(cleaned_lines),
        "lines_original": len(lines)
    }
    
    return cleaned_text, noise_summary

def remove_duplicate_records(records: List[Dict[str, Any]]) -> tuple:
    """
    Remove duplicate records based on content hash.
    
    Args:
        records: List of dictionaries
    
    Returns:
        Tuple of (unique_records, duplicate_summary)
    """
    if not records:
        return [], {"duplicates_found": 0, "records_unique": 0}
    
    seen_hashes = set()
    unique_records = []
    duplicates_found = 0
    
    for record in records:
        if isinstance(record, dict):
            # Create hash of record (excluding source metadata)
            record_copy = {k: v for k, v in record.items() if not k.startswith('_')}
            record_hash = json.dumps(record_copy, sort_keys=True, default=str)
            
            if record_hash not in seen_hashes:
                seen_hashes.add(record_hash)
                unique_records.append(record)
            else:
                duplicates_found += 1
    
    summary = {
        "duplicates_found": duplicates_found,
        "records_unique": len(unique_records),
        "records_original": len(records)
    }
    
    return unique_records, summary
