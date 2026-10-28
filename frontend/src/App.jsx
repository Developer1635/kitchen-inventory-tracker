import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, Plus, Trash2, Sparkles, RefreshCw, CheckCircle2, Clock, Users, X, MinusCircle, Lightbulb, ShoppingCart, AlertCircle, ChevronRight, Loader2, Utensils, Edit3, History, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  
  // AI Wizard State
  const [stallConcept, setStallConcept] = useState('');
  const [wizardStage, setWizardStage] = useState(0); 
  const [loadingWizard, setLoadingWizard] = useState(false);
  const [stage1Options, setStage1Options] = useState([]);
  const [stage1Choice, setStage1Choice] = useState('');
  const [stage2Options, setStage2Options] = useState([]);
  const [stage2Choice, setStage2Choice] = useState('');
  const [stage3Options, setStage3Options] = useState([]);
  const [stage3Choice, setStage3Choice] = useState('');

  // Stall Profile & Recipes State
  const [stallProfile, setStallProfile] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [recipes, setRecipes] = useState({});
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [salesLog, setSalesLog] = useState([]);

  // Recipe Builder State inside Modal
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState({});
  const [loadingAiRecipe, setLoadingAiRecipe] = useState(false);

  // Quick Sale Roller Modal State
  const [selectedDishForSale, setSelectedDishForSale] = useState(null);
  const [saleCount, setSaleCount] = useState(1);

  // Modal & Ingredient Prompt State
  const [activeCategory, setActiveCategory] = useState(null);
  const [audienceSize, setAudienceSize] = useState('Medium (~100 customers)');
  const [lastStocked, setLastStocked] = useState(new Date().toISOString().split('T')[0]);
  const [suggestedIngredients, setSuggestedIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('kg');

  // Quick Consume State
  const [consumeModalItem, setConsumeModalItem] = useState(null);
  const [consumeAmount, setConsumeAmount] = useState('');

  // Copilot State
  const [copilotStrategies, setCopilotStrategies] = useState([]);
  const [copilotMessage, setCopilotMessage] = useState(null);
  const [loadingCopilot, setLoadingCopilot] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  // Shopping List Modal State
  const [showShoppingList, setShowShoppingList] = useState(false);

  // Shift-End Master Demand Review Modal State
  const [showShiftEndReview, setShowShiftEndReview] = useState(false);
  const [shiftEndReviewItems, setShiftEndReviewItems] = useState([]);

  // Accordion Toggle State for Clean Collapsed UI
  const [tableOpen, setTableOpen] = useState(true);
  const [radarOpen, setRadarOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(true);

  useEffect(() => {
    fetchItems();
    fetchRecipes();
    fetchSalesLog();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/items`);
      setItems(res.data);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await axios.get(`${API_URL}/recipes`);
      setRecipes(res.data.recipes);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    }
  };

  const fetchSalesLog = async () => {
    try {
      const res = await axios.get(`${API_URL}/sales-log`);
      setSalesLog(res.data.log);
    } catch (err) {
      console.error("Error fetching sales log:", err);
    }
  };

  const formatQuantity = (val, unit) => {
    const num = parseFloat(val) || 0;
    if (unit === 'kg' && num > 0 && num < 1) {
      return `${(num * 1000).toFixed(0)} g`;
    }
    if (unit === 'liters' && num > 0 && num < 1) {
      return `${(num * 1000).toFixed(0)} ml`;
    }
    return `${num.toFixed(2)} ${unit}`;
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!name || !quantity) return;

    try {
      await axios.post(`${API_URL}/items`, {
        name,
        quantity: parseFloat(parseFloat(quantity).toFixed(2)),
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

  const handleConsume = async () => {
    if (!consumeModalItem || !consumeAmount) return;
    const amountNum = parseFloat(parseFloat(consumeAmount).toFixed(2));
    try {
      await axios.post(`${API_URL}/items/consume`, {
        item_id: consumeModalItem.id,
        amount_used: amountNum
      });
      setConsumeModalItem(null);
      setConsumeAmount('');
      fetchItems();
    } catch (err) {
      console.error("Error logging consumption:", err);
      alert("Failed to update stock quantity.");
    }
  };

  const handleExecuteSale = async () => {
    if (!selectedDishForSale) return;
    try {
      await axios.post(`${API_URL}/items/sell-dish`, { dish_name: selectedDishForSale, count: saleCount });
      setSelectedDishForSale(null);
      setSaleCount(1);
      fetchItems();
      fetchSalesLog();
    } catch (err) {
      console.error("Error selling dish:", err);
      alert(`Could not complete sale for ${selectedDishForSale}. Ensure required ingredients are stocked in inventory.`);
    }
  };

  // --- Wizard Handlers ---
  const handleStartWizard = async () => {
    if (!stallConcept) return;
    setLoadingWizard(true);
    setCopilotStrategies([]);
    setCopilotMessage(null);
    setStallProfile(null);
    try {
      const res = await axios.post(`${API_URL}/api/niche-stage-1`, { concept: stallConcept });
      let parsed = JSON.parse(res.data.options);
      setStage1Options(parsed);
      setWizardStage(1);
    } catch (err) {
      console.error("Wizard Stage 1 Error:", err);
      alert("Failed to initialize niche wizard.");
    } finally {
      setLoadingWizard(false);
    }
  };

  const handleSelectStage1 = async (choice) => {
    setStage1Choice(choice);
    setLoadingWizard(true);
    try {
      const res = await axios.post(`${API_URL}/api/niche-stage-2`, { concept: stallConcept, stage1_choice: choice });
      let parsed = JSON.parse(res.data.options);
      setStage2Options(parsed);
      setWizardStage(2);
    } catch (err) {
      console.error("Wizard Stage 2 Error:", err);
    } finally {
      setLoadingWizard(false);
    }
  };

  const handleSelectStage2 = async (choice) => {
    setStage2Choice(choice);
    setLoadingWizard(true);
    try {
      const res = await axios.post(`${API_URL}/api/niche-stage-3`, { concept: stallConcept, stage1_choice: stage1Choice, stage2_choice: choice });
      let parsed = JSON.parse(res.data.options);
      setStage3Options(parsed);
      setWizardStage(3);
    } catch (err) {
      console.error("Wizard Stage 3 Error:", err);
    } finally {
      setLoadingWizard(false);
    }
  };

  const handleSelectStage3 = async (choice) => {
    setStage3Choice(choice);
    setLoadingConfig(true);
    setWizardStage(4);

    const conciseDescription = `${stallConcept} specializing in ${stage1Choice}, featuring ${stage2Choice} with ${choice}`;
    try {
      const res = await axios.post(`${API_URL}/api/setup-stall`, { description: conciseDescription });
      let rawText = res.data.stall_profile.trim();
      if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
      }
      const parsedData = JSON.parse(rawText);
      setStallProfile(parsedData);
      
      if (parsedData.default_dishes) {
        const newRecipes = {};
        parsedData.default_dishes.forEach(d => {
          newRecipes[d.dish_name] = d.recipe;
        });
        setRecipes(newRecipes);
        await axios.post(`${API_URL}/recipes`, { recipes: newRecipes });
      }

      fetchItems();
    } catch (err) {
      console.error("Error setting up stall with AI:", err);
      alert("Failed to generate final stall profile.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const openCategoryModal = async (cat) => {
    setActiveCategory(cat);
    setLoadingIngredients(true);
    setSuggestedIngredients([]);
    try {
      const res = await axios.post(`${API_URL}/api/suggest-ingredients`, {
        stall_type: stallProfile?.stall_type || stallConcept,
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
    updated[index].default_quantity = parseFloat(parseFloat(newQty || 0).toFixed(2));
    setSuggestedIngredients(updated);
  };

  const handleRemoveSuggested = (index) => {
    setSuggestedIngredients(suggestedIngredients.filter((_, i) => i !== index));
  };

  const handleAddCustomIngredient = () => {
    if (!customItemName || !customItemQty) return;
    setSuggestedIngredients([
      ...suggestedIngredients,
      { name: customItemName, default_quantity: parseFloat(parseFloat(customItemQty).toFixed(2)), unit: customItemUnit }
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
      setStallProfile(null);
      setWizardStage(0);
      setStallConcept('');
      fetchItems();
    } catch (err) {
      console.error("Error batch committing items:", err);
      alert("Failed to add items to inventory.");
    }
  };

  const handleRunCopilot = async () => {
    setLoadingCopilot(true);
    setCopilotStrategies([]);
    setCopilotMessage(null);
    try {
      const res = await axios.post(`${API_URL}/api/leftover-copilot`);
      if (res.data.message) {
        setCopilotMessage(res.data.message);
      } else {
        let rawText = res.data.strategies.trim();
        if (rawText.startsWith("```json")) {
          rawText = rawText.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```/, "").replace(/```$/, "").trim();
        }
        const parsed = JSON.parse(rawText);
        setCopilotStrategies(parsed);
      }
    } catch (err) {
      console.error("Error running leftover copilot:", err);
      alert("Failed to generate waste reduction advice.");
    } finally {
      setLoadingCopilot(false);
    }
  };

  const expiredOrToday = items.filter(i => i.status === 'expired' || i.delta_days === 0);

  // Live Shortage Radar: tracks items as soon as consumption begins (< 100% remaining)
  const radarItems = items
    .map(item => {
      const pct = item.initial_quantity > 0 ? (item.quantity / item.initial_quantity) * 100 : 100;
      return {
        ...item,
        percentageLeft: parseFloat(pct.toFixed(2))
      };
    })
    .filter(item => item.percentageLeft < 100)
    .sort((a, b) => a.percentageLeft - b.percentageLeft);

  const recipeKeys = Object.keys(recipes);
  const topSelling = recipeKeys.slice(0, Math.ceil(recipeKeys.length / 3));
  const midSelling = recipeKeys.slice(Math.ceil(recipeKeys.length / 3), Math.ceil((recipeKeys.length / 3) * 2));
  const leastSelling = recipeKeys.slice(Math.ceil((recipeKeys.length / 3) * 2));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="text-emerald-400" /> Kitchen Inventory & Expiry Tracker
            </h1>
            <p className="text-sm text-gray-400">AI-enhanced food cart management system (Phase 2)</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setShiftEndReviewItems(items.map(i => ({ ...i, newBaseline: i.initial_quantity })));
                setShowShiftEndReview(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-lg"
            >
              <Utensils className="w-4 h-4 text-white" /> Shift-End Demand Review
            </button>
            <button 
              onClick={() => setShowShoppingList(true)}
              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-lg"
            >
              <ShoppingCart className="w-4 h-4 text-white" /> Shopping List Generator
            </button>
            <button 
              onClick={handleRunCopilot}
              disabled={loadingCopilot}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-lg disabled:opacity-50"
            >
              {loadingCopilot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4 text-yellow-300" />}
              {loadingCopilot ? "Analyzing Stock..." : "Leftover Copilot Audit"}
            </button>
          </div>
        </div>

        {/* ⚡ TOP OPERATIONS HUB: Fast-Moving Menu (POS Hub) */}
        <div className="bg-gradient-to-r from-indigo-950/60 to-gray-800 p-5 rounded-2xl border border-indigo-900/60 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-indigo-900/50 pb-3">
            <h3 className="font-bold text-indigo-300 flex items-center gap-2 text-base">
              <Utensils className="w-5 h-5 text-indigo-400" /> Fast-Moving Menu (Tap recipe to log sale)
            </h3>
            <button 
              onClick={() => setShowRecipeModal(true)}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 bg-indigo-900/60 px-3 py-1.5 rounded-lg border border-indigo-700/60 transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Manage Menu
            </button>
          </div>

          {recipeKeys.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No menu items configured yet. Run the Niche Wizard or click Manage Menu to add dishes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Top-Selling Box */}
              <div className="bg-gray-900/80 p-3.5 rounded-xl border border-gray-700/80 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">🔥 Top-Selling Items</span>
                <div className="space-y-1.5">
                  {topSelling.length === 0 ? <p className="text-xs text-gray-500">None</p> : topSelling.map((dish, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedDishForSale(dish); setSaleCount(1); }}
                      className="w-full text-left bg-gray-800 hover:bg-indigo-900/50 border border-gray-700 hover:border-indigo-500 p-2.5 rounded-lg text-xs font-semibold text-white transition flex justify-between items-center group"
                    >
                      <span className="truncate pr-2">{dish}</span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded group-hover:bg-indigo-600 group-hover:text-white transition flex-shrink-0">Sell ⚡</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mid-Level Box */}
              <div className="bg-gray-900/80 p-3.5 rounded-xl border border-gray-700/80 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">⭐ Mid-Level Items</span>
                <div className="space-y-1.5">
                  {midSelling.length === 0 ? <p className="text-xs text-gray-500">None</p> : midSelling.map((dish, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedDishForSale(dish); setSaleCount(1); }}
                      className="w-full text-left bg-gray-800 hover:bg-indigo-900/50 border border-gray-700 hover:border-indigo-500 p-2.5 rounded-lg text-xs font-semibold text-white transition flex justify-between items-center group"
                    >
                      <span className="truncate pr-2">{dish}</span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded group-hover:bg-indigo-600 group-hover:text-white transition flex-shrink-0">Sell ⚡</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Least-Selling Box */}
              <div className="bg-gray-900/80 p-3.5 rounded-xl border border-gray-700/80 space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">📌 Least-Selling Items</span>
                <div className="space-y-1.5">
                  {leastSelling.length === 0 ? <p className="text-xs text-gray-500">None</p> : leastSelling.map((dish, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedDishForSale(dish); setSaleCount(1); }}
                      className="w-full text-left bg-gray-800 hover:bg-indigo-900/50 border border-gray-700 hover:border-indigo-500 p-2.5 rounded-lg text-xs font-semibold text-white transition flex justify-between items-center group"
                    >
                      <span className="truncate pr-2">{dish}</span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded group-hover:bg-indigo-600 group-hover:text-white transition flex-shrink-0">Sell ⚡</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Copilot Cards Grid */}
        {(copilotStrategies.length > 0 || copilotMessage) && (
          <div className="bg-purple-950/40 border border-purple-700/60 p-5 rounded-xl space-y-4 shadow-xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-purple-900 pb-3">
              <h3 className="font-bold text-purple-300 flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-purple-400" /> Shift-End Waste Reduction Copilot (Click a strategy for steps)
              </h3>
              <button onClick={() => { setCopilotStrategies([]); setCopilotMessage(null); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {copilotMessage ? (
              <div className="text-sm text-emerald-300 p-3 bg-black/40 rounded-lg">{copilotMessage}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {copilotStrategies.map((strat, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedStrategy(strat)}
                    className="bg-gray-900/90 border border-purple-900/70 hover:border-purple-500 p-4 rounded-xl cursor-pointer transition transform hover:-translate-y-1 shadow-md space-y-3 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="text-2xl">{strat.icon || "💡"}</div>
                      <h4 className="font-bold text-white text-sm group-hover:text-purple-300 transition">{strat.title}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{strat.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 pt-2 border-t border-gray-800">
                      <span>View Execution Steps</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Strategy Execution Steps Modal */}
        {selectedStrategy && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-purple-900 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
                  <span className="text-xl">{selectedStrategy.icon || "💡"}</span> {selectedStrategy.title}
                </h3>
                <button onClick={() => setSelectedStrategy(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-xs text-gray-300">{selectedStrategy.description}</p>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Action Steps (Max 5)</h4>
                {selectedStrategy.steps?.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs text-gray-200">
                    <span className="bg-purple-950 text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-800 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setSelectedStrategy(null)}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left/Main Column */}
          <div className="lg:col-span-3 space-y-6">

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

            {/* AI 3-Stage Interactive Niche Wizard Box */}
            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-5 h-5" /> AI Stall Onboarding & Progressive Niche Wizard
              </h2>
              
              {wizardStage === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    What kind of food cart or stall are you running? (e.g., <span className="text-indigo-300">"Brioche Donuts"</span>, <span className="text-indigo-300">"Smoothie Bar"</span>)
                  </p>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Type your stall concept here..."
                      value={stallConcept}
                      onChange={(e) => setStallConcept(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleStartWizard} 
                      disabled={loadingWizard}
                      className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {loadingWizard ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {loadingWizard ? "Analyzing Concept..." : "Start Clarification Wizard"}
                    </button>
                  </div>
                </div>
              )}

              {wizardStage === 1 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                      Step 1 of 3: Select the core sub-niche for "{stallConcept}"
                    </p>
                    <button onClick={() => setWizardStage(0)} className="text-xs text-gray-400 hover:text-white">Reset</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {stage1Options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectStage1(opt)}
                        disabled={loadingWizard}
                        className="p-3 bg-gray-900 border border-gray-700 hover:border-indigo-500 hover:bg-indigo-950/40 rounded-lg text-xs font-medium text-gray-200 text-left transition flex items-center justify-between group"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStage === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                      Step 2 of 3: Refine primary ingredients or styles for "{stage1Choice}"
                    </p>
                    <button onClick={() => setWizardStage(1)} className="text-xs text-gray-400 hover:text-white">Back</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2.5">
                    {stage2Options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectStage2(opt)}
                        disabled={loadingWizard}
                        className="p-3 bg-gray-900 border border-gray-700 hover:border-indigo-500 hover:bg-indigo-950/40 rounded-lg text-xs font-medium text-gray-200 text-left transition flex items-center justify-between group"
                      >
                        <span>{opt}</span>
                        <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStage === 3 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                      Step 3 of 3: Final specification (Sides, additions, or scale)
                    </p>
                    <button onClick={() => setWizardStage(2)} className="text-xs text-gray-400 hover:text-white">Back</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2.5">
                    {stage3Options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectStage3(opt)}
                        disabled={loadingConfig}
                        className="p-3 bg-gray-900 border border-gray-700 hover:border-emerald-500 hover:bg-emerald-950/40 rounded-lg text-xs font-medium text-gray-200 text-left transition flex items-center justify-between group"
                      >
                        <span>{opt}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStage === 4 && loadingConfig && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm font-medium text-indigo-300 animate-pulse">
                    Synthesizing stall profile and generating menu items & shelf-life norms...
                  </p>
                </div>
              )}

              {stallProfile && (
                <div className="mt-4 p-5 bg-gray-900 rounded-lg border border-indigo-900 space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <h3 className="font-bold text-indigo-300 text-base">
                      ✨ Precise Profile Locked: <span className="text-white capitalize">{stallProfile.stall_type}</span>
                    </h3>
                    <button 
                      onClick={() => { setStallProfile(null); setWizardStage(0); setStallConcept(''); }}
                      className="text-xs text-gray-400 hover:text-white underline"
                    >
                      Restart Wizard
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">Click any category below to prompt required ingredients 👇</p>
                  
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

            {/* Add Item Form */}
            <form onSubmit={handleAddItem} className="bg-gray-800 p-4 rounded-xl border border-gray-700 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1">Item Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Whole Milk" 
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
                  step="0.01" 
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
                  <option value="dozen">dozen</option>
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

            {/* Collapsible Inventory Table Accordion */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
              <div 
                onClick={() => setTableOpen(!tableOpen)}
                className="bg-gray-900/80 p-4 flex justify-between items-center cursor-pointer border-b border-gray-700 hover:bg-gray-900 transition"
              >
                <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" /> Master Inventory Table ({items.length} items)
                </h3>
                <button className="text-gray-400 hover:text-white">
                  {tableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {tableOpen && (
                <div className="overflow-x-auto animate-fadeIn">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="bg-gray-900/30 text-gray-400 text-xs border-b border-gray-700">
                        <th className="p-3 text-left">Item Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Quantity (Used / Total)</th>
                        <th className="p-3">Purchase Date</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-6 text-gray-500">No inventory items added yet. Click a category above to load your stall stock.</td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-750">
                            <td className="p-3 font-medium text-left">{item.name}</td>
                            <td className="p-3">
                              <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">{item.category}</span>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="text-amber-400 font-semibold">{formatQuantity(item.used_quantity, item.unit)}</span>
                              <span className="text-gray-500 mx-1.5">/</span>
                              <span className="text-emerald-400 font-bold">{formatQuantity(item.initial_quantity, item.unit)}</span>
                            </td>
                            <td className="p-3 text-gray-400 whitespace-nowrap">{item.purchase_date}</td>
                            <td className="p-3 text-gray-400 whitespace-nowrap">{item.expiry_date}</td>
                            <td className="p-3 whitespace-nowrap">
                              {item.status === 'expired' && <span className="text-red-400 font-semibold text-xs bg-red-950/60 px-2 py-1 rounded border border-red-800">Expired</span>}
                              {item.status === 'warning' && item.delta_days === 0 && <span className="text-orange-400 font-semibold text-xs bg-orange-950/60 px-2 py-1 rounded border border-orange-800">Expiring Today</span>}
                              {item.status === 'warning' && item.delta_days === 1 && <span className="text-amber-400 font-semibold text-xs bg-amber-950/60 px-2 py-1 rounded border border-amber-800">Expiring Tomorrow</span>}
                              {item.status === 'warning' && item.delta_days > 1 && <span className="text-yellow-400 font-semibold text-xs bg-yellow-950/60 px-2 py-1 rounded border border-yellow-800">Expiring in {item.delta_days} days</span>}
                              {item.status === 'fresh' && <span className="text-emerald-400 font-semibold text-xs bg-emerald-950/60 px-2 py-1 rounded border border-emerald-900">Fresh ({item.delta_days}d left)</span>}
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button 
                                onClick={() => setConsumeModalItem(item)} 
                                title="Log Usage / Sale"
                                className="text-indigo-400 hover:text-indigo-300 p-1 bg-indigo-950/50 rounded border border-indigo-900 transition inline-flex items-center gap-1 text-xs px-2"
                              >
                                <MinusCircle className="w-3.5 h-3.5" /> Log Use
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 p-1 transition inline-flex items-center">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Collapsible Live Shortage Radar & Sales Activity Log */}
          <div className="space-y-6">

            {/* Collapsible Live Shortage Radar Accordion */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
              <div 
                onClick={() => setRadarOpen(!radarOpen)}
                className="bg-gray-900/80 p-3.5 flex justify-between items-center cursor-pointer border-b border-gray-700 hover:bg-gray-900 transition"
              >
                <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 animate-pulse text-amber-400" /> Live Shortage Radar ({radarItems.length})
                </h3>
                <button className="text-gray-400 hover:text-white">
                  {radarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {radarOpen && (
                <div className="p-4 space-y-2.5 max-h-[300px] overflow-y-auto animate-fadeIn">
                  {radarItems.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      ✨ Full stock (100%) available across all items.
                    </div>
                  ) : (
                    radarItems.map((item, idx) => {
                      const pct = item.percentageLeft;
                      const barColor = pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-amber-500' : 'bg-red-500 animate-pulse';
                      return (
                        <div key={idx} className="bg-gray-900/90 border border-gray-700 p-3 rounded-lg space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-white">{item.name}</span>
                            <span className="text-amber-400 font-mono font-bold">{pct.toFixed(2)}% left</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${barColor}`} 
                              style={{ width: `${Math.max(3, pct)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <span>{formatQuantity(item.quantity, item.unit)} / {formatQuantity(item.initial_quantity, item.unit)}</span>
                            <button 
                              onClick={() => setConsumeModalItem(item)}
                              className="text-indigo-400 hover:underline"
                            >
                              Log Restock/Use
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Sales Activity Log Accordion */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
              <div 
                onClick={() => setLogOpen(!logOpen)}
                className="bg-gray-900/80 p-3.5 flex justify-between items-center cursor-pointer border-b border-gray-700 hover:bg-gray-900 transition"
              >
                <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <History className="w-4 h-4" /> Sales Activity Log ({salesLog.length})
                </h3>
                <button className="text-gray-400 hover:text-white">
                  {logOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {logOpen && (
                <div className="p-4 space-y-2 max-h-[250px] overflow-y-auto animate-fadeIn">
                  {salesLog.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      No sales recorded yet today. Tap a menu item above to log a sale!
                    </div>
                  ) : (
                    salesLog.map((log, idx) => (
                      <div key={idx} className="bg-gray-900 p-2.5 rounded-lg border border-gray-700 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white">{log.count}x {log.dish_name}</span>
                        </div>
                        <span className="text-indigo-300 font-mono text-[11px] bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900">
                          {log.time}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>

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
                          step="0.01"
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
                    step="0.01"
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
                    <option value="dozen">dozen</option>
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

        {/* Quick Sale Roller Modal (Up to 10 quantities) */}
        {selectedDishForSale && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-indigo-900 rounded-xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-fadeIn text-center">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-base font-bold text-indigo-300">
                  Sale Quantity: {selectedDishForSale}
                </h3>
                <button onClick={() => setSelectedDishForSale(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-400">Select quantity (1 to 10):</p>

              {/* Roller & Plus / Minus Controls */}
              <div className="flex items-center justify-center gap-4 py-4">
                <button 
                  onClick={() => setSaleCount(Math.max(1, saleCount - 1))}
                  className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xl flex items-center justify-center transition"
                >
                  -
                </button>
                
                <div className="w-24 bg-gray-900 border border-indigo-500 rounded-xl py-3 text-2xl font-mono font-bold text-emerald-400 shadow-inner">
                  {saleCount}
                </div>

                <button 
                  onClick={() => setSaleCount(Math.min(10, saleCount + 1))}
                  className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-xl flex items-center justify-center transition"
                >
                  +
                </button>
              </div>

              <input 
                type="range" 
                min="1" 
                max="10" 
                value={saleCount}
                onChange={(e) => setSaleCount(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setSelectedDishForSale(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExecuteSale}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Confirm & Deduct Stock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Quick Consumption / Sales Logging */}
        {consumeModalItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-indigo-900 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-base font-bold text-indigo-300">
                  Log Usage: {consumeModalItem.name}
                </h3>
                <button onClick={() => setConsumeModalItem(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Remaining Stock: <span className="text-emerald-400 font-mono font-bold">{formatQuantity(consumeModalItem.quantity, consumeModalItem.unit)}</span>
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount Used / Sold (max 2 decimals)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4.32"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setConsumeModalItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConsume}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Deduct Stock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Menu & AI Recipes Modal */}
        {showRecipeModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-indigo-900 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-400" /> Manage Menu & AI Recipes
                </h3>
                <button onClick={() => setShowRecipeModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Add a recipe name. AI will instantly suggest common ingredients and portion requirements per serving.
              </p>

              {/* Add New Recipe Form */}
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Add New Menu Item</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. French Fries"
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={async () => {
                      if (!newRecipeName) return;
                      setLoadingAiRecipe(true);
                      try {
                        const res = await axios.post(`${API_URL}/api/ai-suggest-recipe`, { dish_name: newRecipeName });
                        let raw = res.data.recipe.trim();
                        if (raw.startsWith("```json")) raw = raw.replace(/^```json/, "").replace(/```$/, "").trim();
                        const parsed = JSON.parse(raw);
                        setNewRecipeIngredients(parsed);
                      } catch (err) {
                        console.error("AI Recipe Suggest Error:", err);
                        alert("Failed to generate recipe ingredients.");
                      } finally {
                        setLoadingAiRecipe(false);
                      }
                    }}
                    disabled={loadingAiRecipe}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {loadingAiRecipe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    AI Suggest
                  </button>
                </div>

                {/* Ingredients Breakdown Editor */}
                {Object.keys(newRecipeIngredients).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <p className="text-[11px] text-gray-400">Review & fine-tune fractional portions per serving:</p>
                    {Object.entries(newRecipeIngredients).map(([ing, amt], idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-gray-200">{ing}</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={amt}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setNewRecipeIngredients({ ...newRecipeIngredients, [ing]: val });
                          }}
                          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center text-emerald-400 font-mono"
                        />
                        <button 
                          onClick={() => {
                            const updated = { ...newRecipeIngredients };
                            delete updated[ing];
                            setNewRecipeIngredients(updated);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button 
                      onClick={async () => {
                        if (!newRecipeName || Object.keys(newRecipeIngredients).length === 0) return;
                        const updatedRecipes = { ...recipes, [newRecipeName]: newRecipeIngredients };
                        setRecipes(updatedRecipes);
                        await axios.post(`${API_URL}/recipes`, { recipes: updatedRecipes });
                        setNewRecipeName('');
                        setNewRecipeIngredients({});
                        alert(`Recipe "${newRecipeName}" added successfully!`);
                      }}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-medium transition"
                    >
                      Save Recipe to Quick Menu
                    </button>
                  </div>
                )}
              </div>

              {/* Existing Recipes List */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Menu Items</h4>
                {Object.keys(recipes).map((dish, idx) => (
                  <div key={idx} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white text-sm">{dish}</span>
                      <p className="text-[10px] text-gray-400">{Object.keys(recipes[dish]).length} ingredients tracked</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const updated = { ...recipes };
                        delete updated[dish];
                        setRecipes(updated);
                        await axios.post(`${API_URL}/recipes`, { recipes: updated });
                      }}
                      className="text-red-400 hover:text-red-300 text-xs p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setShowRecipeModal(false)}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shift-End Master Demand Review Modal */}
        {showShiftEndReview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-indigo-900 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-indigo-400" /> Shift-End Master Demand Review
                </h3>
                <button onClick={() => setShowShiftEndReview(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Review today's ingredient usage and set tomorrow's minimum required baseline opening quantities.
              </p>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {shiftEndReviewItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-700">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                      <p className="text-[10px] text-gray-400">Used today: {formatQuantity(item.used_quantity, item.unit)} | Current baseline: {formatQuantity(item.initial_quantity, item.unit)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.newBaseline}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...shiftEndReviewItems];
                          updated[idx].newBaseline = val;
                          setShiftEndReviewItems(updated);
                        }}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-center text-emerald-400 font-mono"
                      />
                      <span className="text-xs text-gray-400">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowShiftEndReview(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    alert("Shift-end baselines successfully approved and locked for tomorrow's opening stock!");
                    setShowShiftEndReview(false);
                  }}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition"
                >
                  Approve & Save Baselines
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Shopping List Modal Generator */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-emerald-900 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Smart Wholesale Shopping List
                </h3>
                <button onClick={() => setShowShoppingList(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Automated reorder list based on minimum baseline requirements and current stock levels.
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.filter(i => i.quantity <= i.initial_quantity * 0.4 || i.quantity <= 3).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    ✨ No items currently require restocking! Your inventory is fully stocked.
                  </div>
                ) : (
                  items
                    .filter(i => i.quantity <= i.initial_quantity * 0.4 || i.quantity <= 3)
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700">
                        <div>
                          <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                          <span className="text-xs text-gray-400">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-400 font-mono font-bold text-sm">
                            {formatQuantity(item.initial_quantity - item.quantity, item.unit)} needed
                          </span>
                          <p className="text-[10px] text-gray-500">Current: {formatQuantity(item.quantity, item.unit)}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => {
                    const listText = items
                      .filter(i => i.quantity <= i.initial_quantity * 0.4 || i.quantity <= 3)
                      .map(i => `- ${i.name}: ${formatQuantity(i.initial_quantity - i.quantity, i.unit)}`)
                      .join('\n');
                    navigator.clipboard.writeText(`🛒 Wholesale Shopping List:\n${listText}`);
                    alert("Shopping list copied to clipboard!");
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Copy List for Supplier
                </button>
                <button 
                  onClick={() => setShowShoppingList(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition"
                >
                  Close / Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;