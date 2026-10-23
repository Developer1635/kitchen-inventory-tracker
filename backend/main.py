from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
import sqlite3
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

ai_client = genai.Client(api_key=API_KEY) if API_KEY else None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "inventory.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS items")
    cursor.execute("""
        CREATE TABLE items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

class ItemCreate(BaseModel):
    name: str
    quantity: float
    unit: str = "kg"
    category: Optional[str] = None
    purchase_date: Optional[date] = None

class BatchItemCreate(BaseModel):
    items: List[ItemCreate]

class StallSetupRequest(BaseModel):
    description: str

class IngredientPromptRequest(BaseModel):
    stall_type: str
    category_name: str
    audience_size: str
    last_stocked_date: str

def smart_classify_item(name: str):
    name_lower = name.lower()
    if any(k in name_lower for k in ["milk", "paneer", "curd", "butter", "cheese", "cream", "malai", "yogurt"]):
        return "Dairy", 1
    elif any(k in name_lower for k in ["fruit", "apple", "banana", "mango", "orange", "grapes", "papaya", "watermelon", "pomegranate", "guava", "pineapple", "strawberry", "tomato", "onion", "potato", "lemon", "mint", "coriander", "veg", "chili", "garlic", "ginger"]):
        return "Fruits & Vegetables", 2
    elif any(k in name_lower for k in ["bread", "bun", "pav", "toast", "pastry", "puff", "cake", "pastries", "noodles", "pasta", "rice"]):
        return "Bakery & Dry Goods", 5
    elif any(k in name_lower for k in ["chicken", "mutton", "egg", "fish", "patty", "meat", "marrow", "bone", "beef", "pork"]):
        return "Meat", 2
    else:
        return "Pantry", 30

@app.get("/items")
def get_items():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items")
    rows = cursor.fetchall()
    conn.close()

    today = date.today()
    items_list = []
    
    for row in rows:
        exp_date = date.fromisoformat(row["expiry_date"])
        delta_days = (exp_date - today).days
        
        if delta_days < 0:
            status = "expired"
        elif delta_days <= 3:
            status = "warning"
        else:
            status = "fresh"

        items_list.append({
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "quantity": row["quantity"],
            "unit": row["unit"],
            "purchase_date": row["purchase_date"],
            "expiry_date": row["expiry_date"],
            "delta_days": delta_days,
            "status": status
        })
        
    return items_list

@app.post("/items")
def create_item(item: ItemCreate):
    detected_category, default_days = smart_classify_item(item.name)
    final_category = item.category if item.category else detected_category
    
    p_date = item.purchase_date if item.purchase_date else date.today()
    final_expiry = p_date + timedelta(days=default_days)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO items (name, category, quantity, unit, purchase_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)",
        (item.name, final_category, item.quantity, item.unit, p_date.isoformat(), final_expiry.isoformat())
    )
    conn.commit()
    conn.close()
    return {"message": "Item added successfully!"}

@app.post("/items/batch")
def create_batch_items(batch: BatchItemCreate):
    conn = get_db()
    cursor = conn.cursor()
    for item in batch.items:
        detected_category, default_days = smart_classify_item(item.name)
        final_category = item.category if item.category else detected_category
        p_date = item.purchase_date if item.purchase_date else date.today()
        final_expiry = p_date + timedelta(days=default_days)

        cursor.execute(
            "INSERT INTO items (name, category, quantity, unit, purchase_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)",
            (item.name, final_category, item.quantity, item.unit, p_date.isoformat(), final_expiry.isoformat())
        )
    conn.commit()
    conn.close()
    return {"message": "Batch items added successfully!"}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"message": "Item deleted successfully"}

@app.post("/api/setup-stall")
def setup_stall(payload: StallSetupRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    
    prompt = f"""
    Analyze this food stall description and output a strict JSON object with these exact keys:
    "stall_type": string,
    "categories": [
       {{ "category_name": string, "typical_shelf_days": number, "storage_conditions": string }}
    ]
    Description: "{payload.description}"
    """

    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    last_error = None

    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return {"stall_profile": response.text}
        except Exception as e:
            last_error = e
            continue
            
    raise HTTPException(status_code=500, detail=f"All models failed: {str(last_error)}")

@app.post("/api/suggest-ingredients")
def suggest_ingredients(payload: IngredientPromptRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    
    prompt = f"""
    For a '{payload.stall_type}' stall focusing on category '{payload.category_name}', with an expected audience size of '{payload.audience_size}' and last stocked on '{payload.last_stocked_date}', suggest 4-5 common required ingredients in strict JSON format with this exact structure:
    [
      {{ "name": "string", "default_quantity": number, "unit": "kg" or "liters" or "packets" or "units" }}
    ]
    """

    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            return {"ingredients": response.text}
        except Exception:
            continue

    raise HTTPException(status_code=500, detail="Failed to generate ingredients.")