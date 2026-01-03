import asyncio
from dotenv import load_dotenv
load_dotenv()

from tools.validator import generate_insights_and_clean

# Mock Data
mock_result = {
    "user_info": {
        "name": "john doe",              # Should become "John Doe"
        "dob": "tomorrow",              # Should NOT change (dateparser might parse it, but let's see)
        "registered_date": "Aug 4 2023",# Should become "2023-08-04" 
        "city": "new york"              # Should become "New York"
    },
    "order": {
        "price": "$1,200.50",           # Should become 1200.5
        "total_cost": "500",            # Should become 500.0
        "discount": "0%",               # Should avoid or become 0.0
        "items": None                   # Should trigger insight
    }
}

print("Original Data:", mock_result)
print("-" * 50)

processed, insights = generate_insights_and_clean(mock_result)

print("Processed Data:", processed)
print("-" * 50)
print("Insights Generated:")
for i in insights:
    print(f"- {i}")
