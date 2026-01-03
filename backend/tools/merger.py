"""
Merger module for combining data from multiple sources
"""
import json
import re
from typing import List, Dict, Any, Union

def is_json_array_of_records(data_str: str) -> bool:
    """Check if a string is a JSON array of records (from CSV/Excel)"""
    try:
        parsed = json.loads(data_str)
        return isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict)
    except:
        return False

def is_json_object(data_str: str) -> bool:
    """Check if a string is a JSON object"""
    try:
        parsed = json.loads(data_str)
        return isinstance(parsed, dict)
    except:
        return False

def merge_extracted_data(extracted_items: List[Dict[str, Any]]) -> tuple:
    """
    Merges data extracted from multiple sources intelligently.
    - For structured data (CSVs/JSON records): Combines them into a single dataset
    - For unstructured data: Concatenates with source metadata
    
    Args:
        extracted_items: List of dicts with keys: {"filename", "data", "source_type"}
    
    Returns:
        Tuple of (merged_string, merge_summary_dict)
    """
    if not extracted_items:
        return "", {"sources_processed": 0, "records_merged": 0, "source_files": []}
    
    print(f"\n[MERGER] Processing {len(extracted_items)} source(s) for merging...")
    
    # Check if all items are tabular/structured data
    all_structured = True
    combined_records = []
    unstructured_content = []
    source_files = []
    
    for item in extracted_items:
        filename = item.get("filename", "unknown")
        source_type = item.get("source_type", "unknown")
        data = item.get("data", "")
        
        source_files.append(filename)
        print(f"  → Processing: {filename} ({source_type})")
        
        # Convert data to string if needed
        data_str = json.dumps(data) if isinstance(data, (dict, list)) else str(data)
        
        # Try to parse as JSON array (CSV/Excel format)
        if is_json_array_of_records(data_str):
            try:
                records = json.loads(data_str)
                record_count = len(records)
                print(f"    ✓ Found {record_count} records (structured data)")
                # Add source metadata to each record
                for record in records:
                    if isinstance(record, dict):
                        record["_source_file"] = filename
                        record["_source_type"] = source_type
                        combined_records.append(record)
                continue
            except Exception as e:
                print(f"    ✗ Failed to parse as structured: {str(e)}")
                all_structured = False
        else:
            print(f"    ℹ Not detected as structured data")
            all_structured = False
        
        # If not structured data, add to unstructured
        unstructured_content.append({
            "filename": filename,
            "source_type": source_type,
            "data": data_str
        })
    
    # If we have structured records, return them as merged JSON
    if combined_records and len(combined_records) > 0:
        print(f"\n[MERGER] ✓ Successfully merged {len(combined_records)} records from {len(source_files)} source(s)")
        merge_summary = {
            "sources_processed": len(source_files),
            "records_merged": len(combined_records),
            "source_files": source_files,
            "merge_type": "structured"
        }
        return json.dumps(combined_records, indent=2), merge_summary
    
    # Otherwise, concatenate unstructured data with metadata headers
    merged_content = []
    for item in extracted_items:
        filename = item.get("filename", "unknown")
        source_type = item.get("source_type", "unknown")
        data = item.get("data", "")
        
        # Add source metadata header
        merged_content.append(f"\n{'='*80}")
        merged_content.append(f"SOURCE: {filename} (Type: {source_type})")
        merged_content.append(f"{'='*80}\n")
        
        # Add the actual data
        if isinstance(data, dict):
            merged_content.append(json.dumps(data, indent=2))
        elif isinstance(data, list):
            merged_content.append(json.dumps(data, indent=2))
        else:
            merged_content.append(str(data))
        
        merged_content.append("\n")
    
    merged_text = "\n".join(merged_content)
    merge_summary = {
        "sources_processed": len(source_files),
        "records_merged": 0,
        "source_files": source_files,
        "merge_type": "unstructured"
    }
    return merged_text, merge_summary


def remove_duplicates(text: str, preserve_order: bool = True) -> str:
    """
    Removes duplicate records intelligently:
    - For JSON arrays: Deduplicates records based on content
    - For text: Removes duplicate lines
    
    Args:
        text: The merged text content
        preserve_order: If True, maintains original order of first occurrence
    
    Returns:
        Text with duplicates removed
    """
    if not text:
        return ""
    
    # Try to parse as JSON array (structured data)
    try:
        data = json.loads(text)
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            # For structured records, deduplicate based on all fields except metadata
            seen = set()
            unique_records = []
            
            for record in data:
                # Create a hashable version excluding source metadata
                record_copy = {k: v for k, v in record.items() if not k.startswith('_')}
                # Convert to JSON string for hashing
                record_hash = json.dumps(record_copy, sort_keys=True)
                
                if record_hash not in seen:
                    seen.add(record_hash)
                    unique_records.append(record)
            
            print(f"[DEDUP] Removed {len(data) - len(unique_records)} duplicate record(s)")
            return json.dumps(unique_records, indent=2)
    except:
        pass
    
    # Fallback: Remove duplicate lines from text
    lines = text.split('\n')
    seen = set()
    result = []
    
    for line in lines:
        line_stripped = line.strip()
        if line_stripped:
            if line_stripped not in seen:
                seen.add(line_stripped)
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)


def normalize_merged_data(text: str) -> str:
    """
    Normalizes merged data intelligently:
    - For JSON: Returns as-is (already normalized)
    - For text: Standardizes formats and structure
    
    Args:
        text: The merged text content
    
    Returns:
        Normalized text with consistent formatting
    """
    if not text:
        return ""
    
    # Try to parse as JSON (structured data)
    try:
        data = json.loads(text)
        if isinstance(data, (list, dict)):
            # Already structured, return as pretty JSON
            return json.dumps(data, indent=2)
    except:
        pass
    
    # Text normalization
    # Standardize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove multiple consecutive blank lines (keep max 2)
    text = re.sub(r'\n\n\n+', '\n\n', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text
