import requests
from bs4 import BeautifulSoup

class WebProcessor:
    @staticmethod
    async def process(url: str):
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (AI-Data-Cleaner/1.0)'}
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove noise
            for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
                script_or_style.decompose()

            # Get clean text
            clean_text = soup.get_text(separator='\n')
            lines = (line.strip() for line in clean_text.splitlines())
            final_text = '\n'.join(chunk for chunk in lines if chunk)

            return {
                "data": final_text,
                "format": "web_scraped",
                "title": soup.title.string if soup.title else "No Title"
            }
        except Exception as e:
            raise Exception(f"Web Scraping Error ({url}): {str(e)}")