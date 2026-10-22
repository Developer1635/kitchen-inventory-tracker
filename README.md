# 🛒 Smart Kitchen Inventory & Expiry Tracker for Food Carts

A full-stack, automated inventory management and waste-reduction system tailored specifically for fast-paced food carts, stalls, and small-scale kiosks.

## 🎯 Target Audience & Use Case
Designed for street food vendors, smoothie bars, mojito stalls, and quick-service food carts who experience:
- High daily inventory turnover.
- Strict need for rapid data entry (minimizing time spent typing during prep hours).
- Perishable stock handling (Dairy, Fruits & Vegetables, Bakery, Meat) with varying shelf-lifes.
- Financial risks from food waste.

## 🚀 Core Features
- **Smart Auto-Classification:** Automatically maps ingredients to categories (e.g., "Milk" $\rightarrow$ Dairy, "Apple" $\rightarrow$ Fruits & Vegetables) and assigns accurate default shelf-life limits.
- **Purchase Date Tracking:** Tracks when items were actually bought (blocking future dates) and dynamically calculates expiry countdowns.
- **Graduated Urgency Dashboard:** Automatically flags expiring or expired stock in a color-coded top banner (Red for expired/today, Orange for tomorrow, Yellow for 2–3 days out).
- **Precise Status Indicators:** Dynamic status readouts showing exact timelines (e.g., *"Expired 2 days ago"*, *"Expiring tomorrow"*).
- **Inline Editing:** Quick click-to-edit capabilities directly on table rows for updating purchase dates.

## 🛠️ Tech Stack
- **Backend:** FastAPI, Python, SQLite, Pydantic
- **Frontend:** React, Tailwind CSS, Lucide Icons
