from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
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
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            initial_quantity REAL NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            purchase_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

ACTIVE_RECIPES: Dict[str, Dict[str, float]] = {
    "Garlic Butter Shrimp Teppanyaki": {"Shrimp (Peeled and Deveined)": 0.2, "Eggs": 0.1, "Sesame Oil": 0.05, "Jasmine Rice": 0.25},
    "Signature Hibachi Chicken Fried Rice": {"Eggs": 0.1, "Sesame Oil": 0.05, "Jasmine Rice": 0.3}
}

SALES_ACTIVITY_LOG: List[Dict[str, Any]] = []

class ItemCreate(BaseModel):
    name: str
    quantity: float
    unit: str = "kg"
    category: Optional[str] = None
    purchase_date: Optional[date] = None

class BatchItemCreate(BaseModel):
    items: List[ItemCreate]

class NicheInitialRequest(BaseModel):
    concept: str

class NicheStageRequest(BaseModel):
    concept: str
    stage1_choice: Optional[str] = None
    stage2_choice: Optional[str] = None

class StallSetupRequest(BaseModel):
    description: str

class IngredientPromptRequest(BaseModel):
    stall_type: str
    category_name: str
    audience_size: str
    last_stocked_date: str

class ConsumeRequest(BaseModel):
    item_id: int
    amount_used: float

class DishSaleRequest(BaseModel):
    dish_name: str
    count: int

class RecipeUpdateModel(BaseModel):
    recipes: Dict[str, Dict[str, float]]

class RecipeCreateAIRequest(BaseModel):
    dish_name: str

def smart_classify_item(name: str):
    name_lower = name.lower()
    if any(k in name_lower for k in ["milk", "paneer", "curd", "butter", "cheese", "cream", "malai", "yogurt"]):
        return "Dairy", 1
    elif any(k in name_lower for k in ["fruit", "apple", "banana", "mango", "orange", "grapes", "papaya", "watermelon", "pomegranate", "guava", "pineapple", "strawberry", "tomato", "onion", "potato", "lemon", "mint", "coriander", "veg", "chili", "garlic", "ginger", "spinach", "rice"]):
        return "Fresh Produce & Grains", 3
    elif any(k in name_lower for k in ["bread", "bun", "pav", "toast", "pastry", "puff", "cake", "pastries", "noodles", "pasta", "maida"]):
        return "Bakery & Dry Goods", 5
    elif any(k in name_lower for k in ["chicken", "mutton", "fish", "barramundi", "salmon", "dory", "basa", "prawns", "shrimp", "squid", "patty", "meat", "marrow", "bone", "beef", "pork", "minced"]):
        return "Meat & Seafood", 2
    elif any(k in name_lower for k in ["protein", "whey", "powder", "supplement", "oil", "paste"]):
        return "Oils & Specialty", 60
    elif "egg" in name_lower:
        return "Poultry & Eggs", 7
    else:
        return "Pantry", 30

@app.get("/items")
def get_items():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items ORDER BY initial_quantity DESC")
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

        initial_qty = round(row["initial_quantity"], 2)
        current_qty = round(row["quantity"], 2)
        used_qty = round(max(0.0, initial_qty - current_qty), 2)

        items_list.append({
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "initial_quantity": initial_qty,
            "quantity": current_qty,
            "used_quantity": used_qty,
            "unit": row["unit"],
            "purchase_date": row["purchase_date"],
            "expiry_date": row["expiry_date"],
            "delta_days": delta_days,
            "status": status
        })
        
    return items_list

@app.get("/recipes")
def get_recipes():
    return {"recipes": ACTIVE_RECIPES}

@app.post("/recipes")
def update_recipes(payload: RecipeUpdateModel):
    global ACTIVE_RECIPES
    ACTIVE_RECIPES = payload.recipes
    return {"message": "Recipes updated successfully", "recipes": ACTIVE_RECIPES}

@app.get("/sales-log")
def get_sales_log():
    return {"log": SALES_ACTIVITY_LOG}

@app.post("/api/ai-suggest-recipe")
def ai_suggest_recipe(payload: RecipeCreateAIRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    prompt = f"For ONE single serving/plate of '{payload.dish_name}', suggest realistic fractional ingredient quantities consumed per plate in strict JSON format mapping ingredient name to decimal number."
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            res = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"recipe": res.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="AI recipe failed")

@app.post("/items")
def create_item(item: ItemCreate):
    detected_category, default_days = smart_classify_item(item.name)
    final_category = item.category if item.category else detected_category
    qty = round(item.quantity, 2)
    p_date = item.purchase_date if item.purchase_date else date.today()
    final_expiry = p_date + timedelta(days=default_days)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO items (name, category, initial_quantity, quantity, unit, purchase_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)", (item.name, final_category, qty, qty, item.unit, p_date.isoformat(), final_expiry.isoformat()))
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
        qty = round(item.quantity, 2)
        p_date = item.purchase_date if item.purchase_date else date.today()
        final_expiry = p_date + timedelta(days=default_days)
        cursor.execute("INSERT INTO items (name, category, initial_quantity, quantity, unit, purchase_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)", (item.name, final_category, qty, qty, item.unit, p_date.isoformat(), final_expiry.isoformat()))
    conn.commit()
    conn.close()
    return {"message": "Batch items added successfully!"}

@app.post("/items/consume")
def consume_item(payload: ConsumeRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT initial_quantity, quantity FROM items WHERE id = ?", (payload.item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
    current_qty = row["quantity"]
    amount_to_use = round(payload.amount_used, 2)
    new_qty = round(max(0.0, current_qty - amount_to_use), 2)
    cursor.execute("UPDATE items SET quantity = ? WHERE id = ?", (new_qty, payload.item_id))
    conn.commit()
    conn.close()
    return {"message": "Consumption recorded successfully", "new_quantity": new_qty}

@app.post("/items/sell-dish")
def sell_dish(payload: DishSaleRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items")
    rows = cursor.fetchall()

    recipe = ACTIVE_RECIPES.get(payload.dish_name, {})
    if not recipe:
        conn.close()
        raise HTTPException(status_code=400, detail="Recipe not found for dish")

    deductions_made = []
    for row in rows:
        inv_name = row["name"].lower().strip()
        matched_qty_per_unit = 0.0
        
        for ing_key, ing_qty in recipe.items():
            if ing_key.lower().strip() in inv_name or inv_name in ing_key.lower().strip():
                matched_qty_per_unit = ing_qty
                break
        
        if matched_qty_per_unit > 0:
            required_amount = matched_qty_per_unit * payload.count
            new_qty = round(max(0.0, row["quantity"] - required_amount), 2)
            cursor.execute("UPDATE items SET quantity = ? WHERE id = ?", (new_qty, row["id"]))
            deductions_made.append({"item": row["name"], "deducted": required_amount, "remaining": new_qty})

    conn.commit()
    conn.close()

    now_str = datetime.now().strftime("%I:%M %p")
    SALES_ACTIVITY_LOG.insert(0, {
        "dish_name": payload.dish_name,
        "count": payload.count,
        "time": now_str
    })

    return {"message": f"Successfully sold {payload.count}x {payload.dish_name}", "deductions": deductions_made}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"message": "Item deleted successfully"}

@app.post("/api/niche-stage-1")
def niche_stage_1(payload: NicheInitialRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    prompt = f"Given the food stall concept '{payload.concept}', generate 5 distinct sub-niche options in a strict JSON array of 5 concise strings."
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            res = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"options": res.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Stage 1 failed")

@app.post("/api/niche-stage-2")
def niche_stage_2(payload: NicheStageRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    prompt = f"For a '{payload.concept}' stall classified under '{payload.stage1_choice}', generate 4 specific options regarding primary ingredients or styles in a strict JSON array of 4 concise strings."
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            res = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"options": res.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Stage 2 failed")

@app.post("/api/niche-stage-3")
def niche_stage_3(payload: NicheStageRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    prompt = f"For a '{payload.concept}' stall (Sub-niche: '{payload.stage1_choice}', Style: '{payload.stage2_choice}'), generate 4 concise options for signature additions in a strict JSON array of 4 concise strings."
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            res = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"options": res.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Stage 3 failed")

@app.post("/api/setup-stall")
def setup_stall(payload: StallSetupRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items")
    conn.commit()
    conn.close()

    prompt = f"""
    Based on this detailed stall specification: "{payload.description}", 
    output a strict JSON object with these exact keys:
    "stall_type": string,
    "categories": [
       {{ "category_name": string, "typical_shelf_days": number, "storage_conditions": string }}
    ],
    "default_dishes": [
       {{
         "dish_name": string,
         "recipe": {{ "IngredientName": number }}
       }}
    ]
    Provide 5 popular dishes for this exact stall type. Ensure recipe values are small fractional per-serving amounts.
    """
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1))
            return {"stall_profile": response.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Stall setup failed")

@app.post("/api/suggest-ingredients")
def suggest_ingredients(payload: IngredientPromptRequest):
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    prompt = f"For a '{payload.stall_type}' stall focusing on category '{payload.category_name}', suggest 4-5 diverse required ingredients in strict JSON format: [{{ 'name': 'string', 'default_quantity': number, 'unit': 'kg' or 'liters' or 'dozen' or 'packets' or 'units' }}]"
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"ingredients": response.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Failed to suggest ingredients.")

@app.post("/api/leftover-copilot")
def leftover_copilot():
    if not ai_client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM items")
    rows = cursor.fetchall()
    conn.close()
    today = date.today()
    critical_items = [{"name": r["name"], "quantity": round(r["quantity"], 2), "unit": r["unit"], "category": r["category"], "days_left": (date.fromisoformat(r["expiry_date"]) - today).days} for r in rows if (date.fromisoformat(r["expiry_date"]) - today).days <= 3]
    if not critical_items:
        return {"strategies": [], "message": "🌟 Excellent inventory health! No items nearing expiry."}
    prompt = f"Provide exactly 3 waste-reduction strategies for: {critical_items} in strict JSON format: [{{ 'title': 'string', 'description': 'string', 'icon': '🍽️', 'steps': ['string'] }}]"
    models_to_try = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(model=model_name, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.2))
            return {"strategies": response.text}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Copilot failed")