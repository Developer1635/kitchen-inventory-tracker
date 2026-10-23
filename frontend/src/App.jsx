import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, Plus, Trash2, Sparkles, RefreshCw, CheckCircle2, Clock, Users, X } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  
  // AI Stall Setup State
  const [stallDesc, setStallDesc] = useState('');
  const [stallProfile, setStallProfile] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Modal & Ingredient Prompt State
  const [activeCategory, setActiveCategory] = useState(null);
  const [audienceSize, setAudienceSize] = useState('Medium (~100 customers)');
  const [lastStocked, setLastStocked] = useState(new Date().toISOString().split('T')[0]);
  const [suggestedIngredients, setSuggestedIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('kg');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/items`);
      setItems(res.data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name || !quantity) return;

    try {
      await axios.post(`${API_URL}/items`, {
        name,
        quantity: parseFloat(quantity),
        unit,
        category: category || undefined,
        purchase_date: purchaseDate
      });
      setName('');
      setQuantity('');
      setCategory('');
      fetchItems();
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const handleAiSetup = async () => {
    if (!stallDesc) return;
    setLoadingAi(true);
    try {
      const res = await axios.post(`${API_URL}/api/setup-stall`, { description: stallDesc });
      
      let rawText = res.data.stall_profile.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsedData = JSON.parse(rawText);
      setStallProfile(parsedData);
    } catch (err) {
      console.error("Error setting up stall with AI:", err);
      alert("Failed to generate stall profile.");
    } finally {
      setLoadingAi(false);
    }
  };

  const openCategoryModal = async (cat) => {
    setActiveCategory(cat);
    setLoadingIngredients(true);
    setSuggestedIngredients([]);
    try {
      const res = await axios.post(`${API_URL}/api/suggest-ingredients`, {
        stall_type: stallProfile?.stall_type || stallDesc,
        category_name: cat.category_name,
        audience_size: audienceSize,
        last_stocked_date: lastStocked
      });
      
      let rawText = res.data.ingredients.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(rawText);
      setSuggestedIngredients(parsed);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const handleQuantityChange = (index, newQty) => {
    const updated = [...suggestedIngredients];
    updated[index].default_quantity = parseFloat(newQty) || 0;
    setSuggestedIngredients(updated);
  };

  const handleRemoveSuggested = (index) => {
    setSuggestedIngredients(suggestedIngredients.filter((_, i) => i !== index));
  };

  const handleAddCustomIngredient = () => {
    if (!customItemName || !customItemQty) return;
    setSuggestedIngredients([
      ...suggestedIngredients,
      { name: customItemName, default_quantity: parseFloat(customItemQty), unit: customItemUnit }
    ]);
    setCustomItemName('');
    setCustomItemQty('');
  };

  const handleCommitBatch = async () => {
    if (suggestedIngredients.length === 0) return;
    const batchPayload = suggestedIngredients.map(item => ({
      name: item.name,
      quantity: item.default_quantity,
      unit: item.unit || 'kg',
      category: activeCategory.category_name,
      purchase_date: lastStocked
    }));

    try {
      await axios.post(`${API_URL}/items/batch`, { items: batchPayload });
      setActiveCategory(null);
      fetchItems();
    } catch (err) {
      console.error("Error batch committing items:", err);
      alert("Failed to add items to inventory.");
    }
  };

  const expiredOrToday = items.filter(i => i.status === 'expired' || i.delta_days === 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="text-emerald-400" /> Kitchen Inventory & Expiry Tracker
            </h1>
            <p className="text-sm text-gray-400">AI-enhanced food cart management system</p>
          </div>
        </div>

        {/* Urgency Banner */}
        {expiredOrToday.length > 0 && (
          <div className="bg-red-950/50 border border-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-red-500 w-6 h-6 flex-shrink-0 animate-pulse" />
            <div>
              <h3 className="font-semibold text-red-200">Attention Required!</h3>
              <p className="text-sm text-red-300">
                You have {expiredOrToday.length} item(s) that are expired or expiring today.
              </p>
            </div>
          </div>
        )}

        {/* AI Stall Setup */}
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-5 h-5" /> AI Stall Onboarding & Niche Setup
          </h2>
          <p className="text-sm text-gray-400">
            What kind of food cart or stall are you running? (e.g., <span className="text-indigo-300">"Biryani Stall"</span>, <span className="text-indigo-300">"Smoothie Bar"</span>)
          </p>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="Type your stall concept here..."
              value={stallDesc}
              onChange={(e) => setStallDesc(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={handleAiSetup} 
              disabled={loadingAi}
              className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
            >
              {loadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingAi ? "Configuring..." : "Configure Stall"}
            </button>
          </div>

          {/* Clickable Category Cards */}
          {stallProfile && (
            <div className="mt-4 p-5 bg-gray-900 rounded-lg border border-indigo-900 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="font-bold text-indigo-300 text-base">
                  ✨ Active Profile: <span className="text-white capitalize">{stallProfile.stall_type}</span>
                </h3>
                <span className="text-xs text-indigo-300 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-800">
                  Click a category to prompt required ingredients 👇
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stallProfile.categories?.map((cat, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => openCategoryModal(cat)}
                    className="p-4 rounded-lg border bg-gray-800/80 border-gray-700/60 hover:border-indigo-500 hover:bg-indigo-950/30 cursor-pointer transition space-y-1 shadow-sm group"
                  >
                    <div className="font-semibold text-gray-200 text-sm flex justify-between items-center">
                      <span className="group-hover:text-indigo-300 transition flex items-center gap-2">
                        {cat.category_name}
                      </span>
                      <span className="text-emerald-400 font-mono text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                        {cat.typical_shelf_days} days shelf life
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Storage: {cat.storage_conditions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal for Ingredient Prompting */}
        {activeCategory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-indigo-900 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Setup Ingredients: {activeCategory.category_name}
                  </h3>
                  <p className="text-xs text-gray-400">Tailor your stock based on audience and recent purchases.</p>
                </div>
                <button onClick={() => setActiveCategory(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options Prompt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" /> Expected Audience
                  </label>
                  <select 
                    value={audienceSize}
                    onChange={(e) => setAudienceSize(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option>Small (~50 customers)</option>
                    <option>Medium (~100 customers)</option>
                    <option>Large (~250+ customers)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Last Stocked Date
                  </label>
                  <input 
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={lastStocked}
                    onChange={(e) => setLastStocked(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Ingredient List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Suggested & Custom Ingredients</h4>
                
                {loadingIngredients ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 gap-2 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> AI is calculating required quantities...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {suggestedIngredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-900/70 p-2 rounded-lg border border-gray-700">
                        <span className="flex-1 text-sm font-medium text-gray-200">{ing.name}</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={ing.default_quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center text-emerald-400 font-mono"
                        />
                        <span className="text-xs text-gray-400 w-14">{ing.unit}</span>
                        <button onClick={() => handleRemoveSuggested(idx)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Ingredient Addon */}
                <div className="flex gap-2 pt-2 border-t border-gray-700">
                  <input 
                    type="text" 
                    placeholder="Add special ingredient..." 
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Qty" 
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 text-center"
                  />
                  <select 
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="packets">packets</option>
                    <option value="units">units</option>
                  </select>
                  <button 
                    onClick={handleAddCustomIngredient}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCommitBatch}
                  disabled={suggestedIngredients.length === 0}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Commit to Inventory Table
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="bg-gray-800 p-4 rounded-xl border border-gray-700 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs text-gray-400 mb-1">Item Name</label>
            <input 
              type="text" 
              placeholder="e.g. Basmati Rice" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <input 
              type="text" 
              placeholder="Category" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-indigo-300 font-medium"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Quantity</label>
            <input 
              type="number" 
              step="0.1" 
              placeholder="Amount" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Unit</label>
            <select 
              value={unit} 
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="kg">kg</option>
              <option value="liters">liters</option>
              <option value="packets">packets</option>
              <option value="units">units</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Purchase Date</label>
            <input 
              type="date" 
              max={new Date().toISOString().split('T')[0]}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </form>

        {/* Inventory Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 text-gray-400 text-xs border-b border-gray-700">
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Purchase Date</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-sm">
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">No inventory items added yet.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-750">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">{item.category}</span>
                    </td>
                    <td className="p-3">{item.quantity} {item.unit}</td>
                    <td className="p-3 text-gray-400">{item.purchase_date}</td>
                    <td className="p-3 text-gray-400">{item.expiry_date}</td>
                    <td className="p-3">
                      {item.status === 'expired' && <span className="text-red-400 font-semibold text-xs bg-red-950/60 px-2 py-1 rounded border border-red-800">Expired ({Math.abs(item.delta_days)} days ago)</span>}
                      {item.status === 'warning' && item.delta_days === 0 && <span className="text-orange-400 font-semibold text-xs bg-orange-950/60 px-2 py-1 rounded border border-orange-800">Expiring Today</span>}
                      {item.status === 'warning' && item.delta_days === 1 && <span className="text-amber-400 font-semibold text-xs bg-amber-950/60 px-2 py-1 rounded border border-amber-800">Expiring Tomorrow</span>}
                      {item.status === 'warning' && item.delta_days > 1 && <span className="text-yellow-400 font-semibold text-xs bg-yellow-950/60 px-2 py-1 rounded border border-yellow-800">Expiring in {item.delta_days} days</span>}
                      {item.status === 'fresh' && <span className="text-emerald-400 font-semibold text-xs bg-emerald-950/60 px-2 py-1 rounded border border-emerald-900">Fresh ({item.delta_days} days left)</span>}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 p-1 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default App;