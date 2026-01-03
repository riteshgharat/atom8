import requests
import json

class APIProcessor:
    @staticmethod
    async def process(endpoint_url: str, headers: dict = None, params: dict = None):
        try:
            response = requests.get(endpoint_url, headers=headers, params=params, timeout=10)
            response.raise_for_status() # Trigger error for 4xx/5xx codes
            
            data = response.json()
            return {
                "data": data,
                "format": "json_api",
                "source": endpoint_url
            }
        except json.JSONDecodeError:
            # If the API returned text instead of JSON
            return {"data": response.text, "format": "text_api"}
        except Exception as e:
            raise Exception(f"API Connection Error: {str(e)}")