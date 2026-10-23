import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("❌ Error: GEMINI_API_KEY not found in .env file!")
    exit(1)

client = genai.Client(api_key=API_KEY)

print("🤖 Testing Gemini API connection for custom stall configuration...")

prompt = """
Analyze the following food stall description and generate a custom inventory configuration profile in JSON format:
Description: "Artisanal Wood-Fired Pizza & Calzone Kiosk"
"""

try:
    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )
    print("\n✅ Success! Gemini Response:")
    print(response.text)
except Exception as e:
    print(f"\n❌ API Call Failed: {e}")