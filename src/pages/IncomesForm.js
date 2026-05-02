import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Loader2, DollarSign, Mic, MicOff, ArrowUpDown, ChevronUp, ChevronDown, Filter, Pencil, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


export default function IncomesForm() {
  const { activeProject, getAuthHeaders, isOwner, filterMonth, setFilterMonth } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    concept: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [groups, setGroups] = useState([]);
  const [filterGroupId, setFilterGroupId] = useState('none');



  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState({ key: 'correlative', direction: 'desc' });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(null);
  
  // Update date range and form date when filterMonth changes
  const dateRange = useMemo(() => {
    if (!filterMonth) return { min: '', max: '' };
    const [year, month] = filterMonth.split('-');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      min: `${filterMonth}-01`,
      max: `${filterMonth}-${String(lastDay).padStart(2, '0')}`
    };
  }, [filterMonth]);

  useEffect(() => {
    if (filterMonth && (!form.date || !form.date.startsWith(filterMonth))) {
      // If today is in the selected month, use today, otherwise use the 1st
      const today = new Date().toISOString().split('T')[0];
      if (today.startsWith(filterMonth)) {
        setForm(prev => ({ ...prev, date: today }));
      } else {
        setForm(prev => ({ ...prev, date: `${filterMonth}-01` }));
      }
    }
  }, [filterMonth]);

  useEffect(() => {
    if (activeProject) {
      fetchCategories();
      fetchGroups();
    }
  }, [activeProject]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchIncomes(filterMonth);
    }
  }, [filterMonth, activeProject]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/.netlify/functions/categories?type=accumulative', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const incomeCategories = Array.isArray(data) ? data.filter(c => c.type === 'INGRESO') : [];
      setCategories(incomeCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchIncomes = async (month) => {
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/expenses?month=${month}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      // Filtrar solo los movimientos que pertenecen a categorías tipo 'INGRESO'
      const onlyIncomes = Array.isArray(data) ? data.filter(item => item.transaction_type === 'INGRESO') : [];

      // Asignar correlativo basado en el ID (orden de creación)
      const withCorrelative = [...onlyIncomes]
        .sort((a, b) => a.id - b.id)
        .map((item, index) => ({ ...item, correlative: index + 1 }));

      setIncomes(withCorrelative);
    } catch (err) {
      console.error('Error fetching incomes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.date || !activeProject) return;

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          concept: form.concept,
          category_id: form.category_id ? parseInt(form.category_id) : null,
          date: form.date,
          type: 'INGRESO'
        })
      });
      if (res.ok) {
        setForm(prev => ({ ...prev, amount: '', concept: '' }));
        await fetchIncomes(filterMonth);
      }
    } catch (err) {
      console.error('Error adding income:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este ingreso?')) return;

    try {
      const res = await fetch(`/.netlify/functions/expenses?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchIncomes(filterMonth);
      } else {
        alert('No tienes permiso para eliminar este registro.');
      }
    } catch (err) {
      console.error('Error deleting income:', err);
    }
  };

  // Sorting logic
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1 text-emerald-600" />
      : <ChevronDown className="w-3 h-3 ml-1 text-emerald-600" />;
  };

  // Filter and Sort Processing
  const filteredIncomes = incomes.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category_id?.toString() === categoryFilter;
    const matchesUser = userFilter === 'all' || item.created_by === userFilter;
    return matchesCategory && matchesUser;
  });

  // Get unique users for the filter
  const uniqueUsers = useMemo(() => {
    const users = incomes.map(item => item.created_by);
    return [...new Set(users)].filter(Boolean).sort();
  }, [incomes]);

  const sortedIncomes = [...filteredIncomes].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    // Handle special cases
    if (key === 'category') {
      aValue = a.category_name || '';
      bValue = b.category_name || '';
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ amount: '', concept: '', category_id: '', date: '' });
  const [editFilterGroupId, setEditFilterGroupId] = useState('none');

  const DateSelector = ({ value, onChange, min, max, colorClass = "emerald" }) => {
    const inputRef = useRef(null);

    const handlePrevDay = () => {
      const d = new Date(value + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const newDate = d.toISOString().split('T')[0];
      if (newDate >= min) onChange(newDate);
    };

    const handleNextDay = () => {
      const d = new Date(value + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const newDate = d.toISOString().split('T')[0];
      if (newDate <= max) onChange(newDate);
    };

    const handleOpenPicker = (e) => {
      if (inputRef.current) {
        try {
          if (inputRef.current.showPicker) {
            inputRef.current.showPicker();
          } else {
            inputRef.current.click();
          }
        } catch (err) {
          inputRef.current.click();
        }
      }
    };

    const dateObj = new Date(value + 'T12:00:00');
    const dayNumber = dateObj.getDate();
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });

    return (
      <div className="flex items-center gap-1">
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); handlePrevDay(); }}
          disabled={value <= min}
          className={`p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-colors`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div 
          className="relative flex-1 group cursor-pointer" 
          onClick={handleOpenPicker}
        >
          <input
            ref={inputRef}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
            required
            onClick={(e) => e.stopPropagation()}
          />
          <div className={`flex items-center justify-between px-4 py-2 border border-slate-300 rounded-lg bg-white group-hover:border-${colorClass}-400 transition-colors shadow-sm`}>
            <span className="font-bold text-slate-700 capitalize text-sm">
              {dayNumber} - {dayName}
            </span>
            <Calendar className={`w-4 h-4 text-slate-400`} />
          </div>
        </div>

        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); handleNextDay(); }}
          disabled={value >= max}
          className={`p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-colors`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      amount: item.amount,
      concept: item.concept || '',
      category_id: item.category_id || '',
      date: item.date ? item.date.split('T')[0] : ''
    });
    // Find category to set initial filter group
    const cat = categories.find(c => c.id === item.category_id);
    setEditFilterGroupId(cat ? (cat.group_id || 'none') : 'none');
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      parseVoiceInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const parseVoiceInput = (text) => {
    const amountMatch = text.match(/(\d+([.,]\d+)?)/);
    if (!amountMatch) {
      alert("No pude detectar un monto. Formato sugerido: 'Categoría Monto Concepto'");
      return;
    }

    const amount = amountMatch[1].replace(',', '.');
    const amountStr = amountMatch[0];
    const amountIndex = text.indexOf(amountStr);

    const beforeAmount = text.substring(0, amountIndex).trim();
    const afterAmount = text.substring(amountIndex + amountStr.length).trim();

    let matchedCat = null;
    let categoryFound = false;
    let matchedGroup = null;

    const searchTextBefore = beforeAmount.toLowerCase().trim();

    if (searchTextBefore) {
      // First, try to identify a SuperCategory (Group)
      for (const g of groups) {
        const groupName = g.name.toLowerCase();
        if (searchTextBefore.includes(groupName)) {
          matchedGroup = g;
          break;
        }
      }

      // Filter categories to prioritize those in the matched group if any
      let searchPool = [...categories];
      if (matchedGroup) {
        searchPool = categories.filter(c => c.group_id === matchedGroup.id);
      }

      const sortedPool = searchPool.sort((a, b) => b.name.length - a.name.length);
      const spokenWords = searchTextBefore.split(/\s+/).filter(w => w.length >= 3);

      for (const cat of sortedPool) {
        const catNameFull = cat.name.toLowerCase();
        const catNameClean = catNameFull.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        const catWords = catNameClean.split(/\s+/).filter(w => w.length >= 3);

        const spokenContainsCat = searchTextBefore.includes(catNameClean) || searchTextBefore.includes(catNameFull);
        const catContainsSpoken = catNameClean.includes(searchTextBefore) || catNameFull.includes(searchTextBefore);
        const wordMatch = spokenWords.some(sw => catWords.some(cw => cw.includes(sw) || sw.includes(cw)));

        if (spokenContainsCat || catContainsSpoken || wordMatch) {
          matchedCat = cat;
          categoryFound = true;
          break;
        }
      }

      // Fallback: If no category was found in the matched group, search in ALL categories
      if (!categoryFound && matchedGroup) {
        const allSorted = [...categories].sort((a, b) => b.name.length - a.name.length);
        for (const cat of allSorted) {
          const catNameFull = cat.name.toLowerCase();
          const catNameClean = catNameFull.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
          const spokenContainsCat = searchTextBefore.includes(catNameClean) || searchTextBefore.includes(catNameFull);
          if (spokenContainsCat) {
            matchedCat = cat;
            categoryFound = true;
            break;
          }
        }
      }
    }

    let concept = afterAmount;
    const fillers = ['gané', 'recibí', 'el', 'la', 'un', 'una', 'de', 'del', 'por', 'con', 'en', 'registra', 'agrega', 'cobré', 'pago'];
    
    concept = concept.split(/\s+/)
      .filter(word => !fillers.includes(word))
      .join(' ')
      .trim();

    if (concept.length > 0) {
      concept = concept.charAt(0).toUpperCase() + concept.slice(1);
    }

    if (categoryFound && matchedCat) {
      setFilterGroupId(matchedCat.group_id || 'none');
      setForm(prev => ({
        ...prev,
        amount: amount,
        concept: concept || prev.concept,
        category_id: matchedCat.id
      }));
      setVoiceFeedback(`Capturado: [${matchedCat.name}] S/ ${amount} ${concept ? `- "${concept}"` : ''}`);
    } else {
      setForm(prev => ({
        ...prev,
        amount: amount,
        concept: concept || prev.concept
      }));
      setVoiceFeedback(`Capturado: S/ ${amount} ${concept ? `- "${concept}"` : ''} (Categoría no detectada)`);
    }

    setTimeout(() => setVoiceFeedback(null), 6000);
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/.netlify/functions/expenses', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingItem.id,
          amount: parseFloat(editForm.amount),
          concept: editForm.concept,
          category_id: editForm.category_id ? parseInt(editForm.category_id) : null,
          date: editForm.date,
          type: 'INGRESO'
        })
      });
      if (res.ok) {
        setEditingItem(null);
        await fetchIncomes(filterMonth);
      }
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Registro de Ingresos</h1>

        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-emerald-800">Nuevo Ingreso</h2>
          <button
            onClick={startVoiceInput}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isListening
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
              }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Escuchando...' : 'Registrar por voz'}
          </button>
        </div>
        {voiceFeedback && (
          <div className="mb-4 p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-lg animate-in fade-in duration-300">
            {voiceFeedback}
          </div>
        )}
        <form onSubmit={handleAddIncome} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="col-span-12 md:col-span-4">
              <DateSelector 
                value={form.date} 
                onChange={(val) => setForm({ ...form, date: val })}
                min={dateRange.min}
                max={dateRange.max}
              />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Monto (S/)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full pl-9 pr-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="col-span-12">
            <label className="block text-sm font-medium text-emerald-700 mb-1">SuperCategoría (Filtro)</label>
            <div className="flex flex-wrap gap-2 py-2">
              {(() => {
                const hasUngrouped = categories.some(c => !c.group_id);
                const groupsWithCategories = groups.filter(g => categories.some(c => c.group_id === g.id));
                
                const groupOptions = [
                  ...(hasUngrouped ? [{ id: 'none', name: 'Sin Grupo', color: '#cbd5e1' }] : []),
                  ...groupsWithCategories
                ];

                return groupOptions.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFilterGroupId(item.id);
                      setForm(prev => ({ ...prev, category_id: '' }));
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all flex items-center gap-2 shadow-sm ${
                      filterGroupId === item.id 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: filterGroupId === item.id ? 'white' : (item.color || '#cbd5e1') }}
                    ></div>
                    {item.name}
                  </button>
                ));
              })()}
            </div>
          </div>
          <div className="col-span-12">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Categoría</label>
            <div className="flex flex-wrap gap-2 py-2">
              {categories
                .filter(c => {
                  if (filterGroupId === 'none') return c.group_id === null || c.group_id === undefined;
                  return c.group_id === filterGroupId;
                })
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setForm({ ...form, category_id: c.id })}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all flex items-center gap-2 shadow-sm ${
                      form.category_id === c.id 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: form.category_id === c.id ? 'white' : (c.color || '#cbd5e1') }}
                    ></div>
                    {c.name}
                  </button>
                ))
              }
            </div>
          </div>
          <div className="col-span-12">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Concepto <span className="text-emerald-500/50 font-normal">(Opcional)</span></label>
            <input
              type="text"
              value={form.concept}
              onChange={e => setForm({ ...form, concept: e.target.value })}
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              placeholder="Ej. Sueldo, Transferencia..."
            />
          </div>
        </form>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddIncome}
            disabled={submitting || !form.amount || !activeProject}
            className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Añadir Ingreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Historial de Ingresos
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {sortedIncomes.length} registros
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:ring-0 outline-none truncate max-w-[100px] md:max-w-[150px]"
              >
                <option value="all">Categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="text-xs bg-transparent border-none focus:ring-0 outline-none truncate max-w-[100px] md:max-w-[150px]"
              >
                <option value="all">Usuarios</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>

            {/* Selector de ordenamiento para móvil */}
            <div className="md:hidden flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortConfig.key}
                onChange={(e) => setSortConfig(prev => ({ ...prev, key: e.target.value }))}
                className="text-xs bg-transparent border-none focus:ring-0 outline-none"
              >
                <option value="correlative">N°</option>
                <option value="date">Fecha</option>
                <option value="category">Cat.</option>
                <option value="concept">Conc.</option>
                <option value="amount">Monto</option>
              </select>
              <button 
                onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                title="Cambiar dirección"
              >
                {sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className='overflow-auto'>
          {loading ? (
            <div className="p-8 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : sortedIncomes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {incomes.length === 0 ? "No hay ingresos registrados en este mes." : "No hay ingresos que coincidan con el filtro."}
            </div>
          ) : (
            <>
              {/* Vista de Tabla (Desktop) */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-medium">
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('correlative')}
                  >
                    <div className="flex items-center">N° {getSortIcon('correlative')}</div>
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('date')}
                  >
                    <div className="flex items-center">Fecha {getSortIcon('date')}</div>
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('category')}
                  >
                    <div className="flex items-center">Categoría {getSortIcon('category')}</div>
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('concept')}
                  >
                    <div className="flex items-center">Concepto {getSortIcon('concept')}</div>
                  </th>
                  <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center justify-end">Monto {getSortIcon('amount')}</div>
                  </th>
                  <th className="px-6 py-4 text-center">Usuario</th>
                  <th className="px-6 py-4 text-center">Editado por</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedIncomes.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                      {item.correlative}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${item.category_color}20`,
                          color: item.category_color || '#475569'
                        }}
                      >
                        {item.group_name ? `${item.group_name} - ${item.category_name}` : (item.category_name || 'Sin categoría')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {item.concept || '---'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      S/ {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                      {item.created_by}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-400 font-medium">
                      {item.updated_by || '---'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isOwner(item.created_by) ? (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">---</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de Tarjetas (Mobile) */}
          <div className="md:hidden divide-y divide-slate-100">
            {sortedIncomes.map(item => (
              <div key={item.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N° {item.correlative}</span>
                    <span className="text-xs font-medium text-slate-500">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">S/ {parseFloat(item.amount).toFixed(2)}</div>
                </div>
                
                <div className="text-sm font-semibold text-slate-800 mb-2">
                  {item.concept || (item.group_name ? `${item.group_name} - ${item.category_name}` : item.category_name)}
                </div>
                
                <div className="flex justify-between items-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: `${item.category_color}20`,
                      color: item.category_color || '#475569'
                    }}
                  >
                    {item.group_name ? `${item.group_name} - ${item.category_name}` : (item.category_name || 'Sin categoría')}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">Por: {item.created_by}</span>
                    {item.updated_by && <span className="text-[10px] text-slate-400 italic">Edit: {item.updated_by}</span>}
                    {isOwner(item.created_by) ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-400 hover:text-blue-600 p-1"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="w-6 h-6"></span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>

      </div>
      {/* Modal de Edición */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Editar Registro</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Fecha</label>
                  <DateSelector 
                    value={editForm.date}
                    onChange={(val) => setEditForm({ ...editForm, date: val })}
                    min={dateRange.min}
                    max={dateRange.max}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Monto (S/)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">SuperCategoría (Filtro)</label>
                <div className="flex flex-wrap gap-2 py-1">
                  {(() => {
                    const hasUngroupedEdit = categories.some(c => !c.group_id);
                    const groupsWithCategoriesEdit = groups.filter(g => categories.some(c => c.group_id === g.id));
                    
                    const editGroupOptions = [
                      ...(hasUngroupedEdit ? [{ id: 'none', name: 'Sin Grupo', color: '#cbd5e1' }] : []),
                      ...groupsWithCategoriesEdit
                    ];

                    return editGroupOptions.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setEditFilterGroupId(item.id);
                          setEditForm(prev => ({ ...prev, category_id: '' }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all flex items-center gap-2 shadow-sm ${
                          editFilterGroupId === item.id 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: editFilterGroupId === item.id ? 'white' : (item.color || '#cbd5e1') }}
                        ></div>
                        {item.name}
                      </button>
                    ));
                  })()}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Categoría</label>
                <div className="flex flex-wrap gap-2 py-1">
                  {categories
                    .filter(c => {
                      if (editFilterGroupId === 'none') return c.group_id === null || c.group_id === undefined;
                      return c.group_id === editFilterGroupId;
                    })
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, category_id: c.id })}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all flex items-center gap-2 shadow-sm ${
                          editForm.category_id === c.id 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: editForm.category_id === c.id ? 'white' : (c.color || '#cbd5e1') }}
                        ></div>
                        {c.name}
                      </button>
                    ))
                  }
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Concepto</label>
                <input
                  type="text"
                  value={editForm.concept}
                  onChange={e => setEditForm({ ...editForm, concept: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. Sueldo..."
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
