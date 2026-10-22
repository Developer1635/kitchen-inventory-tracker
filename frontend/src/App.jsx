import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Package, Edit2, Check } from 'lucide-react';

const API_URL = "http://localhost:8000";

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ 
    name: '', 
    quantity: '', 
    unit: 'kg' 
  });
  
  const [editingId, setEditingId] = useState(null);
  const [editPurchaseDate, setEditPurchaseDate] = useState('');

  // Get today's date in YYYY-MM-DD format to restrict future dates in calendar inputs
  const todayMaxDate = new Date().toISOString().split("T")[0];

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/items`);
      setItems(res.data);
    } catch (err) {
      console.error("Error fetching inventory", err);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/items`, {
        name: form.name,
        quantity: parseFloat(form.quantity),
        unit: form.unit
      });
      setForm({ name: '', quantity: '', unit: 'kg' });
      fetchItems();
    } catch (err) {
      console.error("Error adding item", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Error deleting item", err);
    }
  };

  const handleUpdatePurchaseDate = async (id) => {
    try {
      const itemToUpdate = items.find(i => i.id === id);
      if (!itemToUpdate) return;

      await axios.put(`${API_URL}/items/${id}`, {
        name: itemToUpdate.name,
        category: itemToUpdate.category,
        quantity: itemToUpdate.quantity,
        unit: itemToUpdate.unit,
        purchase_date: editPurchaseDate
      });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      console.error("Error updating purchase date", err);
    }
  };

  const actionRequiredItems = items
    .filter(item => item.status === 'warning' || item.status === 'expired')
    .sort((a, b) => a.delta_days - b.delta_days);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-800">Kitchen Inventory & Expiry Tracker</h1>
          </div>
        </header>

        {/* Chronological Color-Coded Action Required Banner */}
        {actionRequiredItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-amber-800 font-semibold text-base">Action Required: Use Up Expiring Stock</h2>
              <p className="text-amber-700 text-sm mt-1">
                Prioritized by soonest expiry. Consider featuring these in today's menu specials:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {actionRequiredItems.map(item => {
                  const isRed = item.delta_days <= 0; // Expired or expiring today
                  const isOrange = item.delta_days === 1; // Expiring tomorrow
                  return (
                    <span 
                      key={item.id} 
                      className={`px-3 py-1 rounded-lg text-xs font-medium border shadow-2xs ${
                        isRed 
                          ? 'bg-rose-50 border-rose-300 text-rose-900' 
                          : isOrange
                          ? 'bg-orange-50 border-orange-300 text-orange-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      {item.name} ({item.quantity} {item.unit}) — <b>{item.delta_days < 0 ? `Expired ${Math.abs(item.delta_days)}d ago` : item.delta_days === 0 ? 'Expires Today' : `Expires in ${item.delta_days}d`}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Fast Smart Add Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Item Name (e.g., Apple, Milk, Flour)" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            className="border p-2 rounded-lg md:col-span-2" 
            required 
          />

          <input 
            type="number" 
            step="any" 
            placeholder="Qty" 
            value={form.quantity} 
            onChange={e => setForm({...form, quantity: e.target.value})} 
            className="border p-2 rounded-lg" 
            required 
          />

          <select 
            value={form.unit} 
            onChange={e => setForm({...form, unit: e.target.value})} 
            className="border p-2 rounded-lg bg-white"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="L">L</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
            <option value="dozen">dozen</option>
            <option value="packets">packets</option>
            <option value="cans">cans</option>
          </select>

          <button 
            type="submit" 
            className="bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
          >
            <Plus size={18} /> Smart Add
          </button>
        </form>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                <th className="p-4">Item Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Date of Buying (Click to Edit)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50/50 transition">
                  <td className="p-4 font-medium text-gray-800">{item.name}</td>
                  <td className="p-4 text-gray-600">{item.category}</td>
                  <td className="p-4 text-gray-600">{item.quantity} {item.unit}</td>
                  <td className="p-4 text-gray-600">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          max={todayMaxDate}
                          value={editPurchaseDate} 
                          onChange={e => setEditPurchaseDate(e.target.value)} 
                          className="border p-1 rounded text-sm bg-white"
                        />
                        <button 
                          onClick={() => handleUpdatePurchaseDate(item.id)} 
                          className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 transition"
                          title="Save Purchase Date"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditingId(item.id); setEditPurchaseDate(item.purchase_date); }} 
                        className="group flex flex-col cursor-pointer transition"
                        title="Click to edit purchase date"
                      >
                        <div className="flex items-center gap-2 hover:text-emerald-600">
                          <span className="font-medium text-gray-800">{item.purchase_date}</span>
                          <Edit2 size={14} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                        </div>
                        <span className="text-xs text-gray-400">Expires: {item.expiry_date}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {item.delta_days < 0 ? (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <XCircle size={14}/> Expired {Math.abs(item.delta_days)} {Math.abs(item.delta_days) === 1 ? 'day' : 'days'} ago
                      </span>
                    ) : item.delta_days === 0 ? (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <AlertTriangle size={14}/> Expiring today
                      </span>
                    ) : item.delta_days === 1 ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <AlertTriangle size={14}/> Expiring tomorrow
                      </span>
                    ) : item.delta_days <= 3 ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <AlertTriangle size={14}/> Expiring in {item.delta_days} days
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <CheckCircle size={14}/> Fresh
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-rose-600 transition"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-gray-400">No inventory items added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}