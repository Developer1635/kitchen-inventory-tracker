from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
import sqlite3

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

def smart_classify_item(name: str):
    name_lower = name.lower()
    
    if any(k in name_lower for k in ["milk", "paneer", "curd", "butter", "cheese", "cream", "malai", "yogurt"]):
        return "Dairy", 1
    elif any(k in name_lower for k in ["fruit", "apple", "banana", "mango", "orange", "grapes", "papaya", "watermelon", "pomegranate", "guava", "pineapple", "strawberry", "tomato", "onion", "potato", "lemon", "mint", "coriander", "veg", "chili", "garlic", "ginger"]):
        return "Fruits & Vegetables", 2
    elif any(k in name_lower for k in ["bread", "bun", "pav", "toast", "pastry", "puff"]):
        return "Bakery", 3
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
    return {"message": "Item added successfully with smart purchase tracking!"}

@app.put("/items/{item_id}")
def update_item(item_id: int, item: ItemCreate):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    detected_category, default_days = smart_classify_item(item.name)
    final_category = item.category if item.category else detected_category
    
    p_date = item.purchase_date if item.purchase_date else date.today()
    final_expiry = p_date + timedelta(days=default_days)

    cursor.execute(
        "UPDATE items SET name = ?, category = ?, quantity = ?, unit = ?, purchase_date = ?, expiry_date = ? WHERE id = ?",
        (item.name, final_category, item.quantity, item.unit, p_date.isoformat(), final_expiry.isoformat(), item_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Item updated successfully"}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"message": "Item deleted successfully"}