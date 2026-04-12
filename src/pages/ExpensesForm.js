import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Plus, Trash2, Loader2, DollarSign, Mic, MicOff, ArrowUpDown, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ExpensesForm() {
  const { activeProject, getAuthHeaders, isOwner } = useAuth();
  const [expenses, setExpenses] = useState([]);
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
  const [filterGroupId, setFilterGroupId] = useState('all');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  // Sorting and Filtering State
  const [sortConfig, setSortConfig] = useState({ key: 'correlative', direction: 'desc' });
  const [categoryFilter, setCategoryFilter] = useState('all');

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
      fetchExpenses(filterMonth);
    }
  }, [filterMonth, activeProject]);

  // Filter for only GASTO and AHORRO categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/.netlify/functions/categories?type=accumulative', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const expenseCategories = Array.isArray(data) ? data.filter(c => c.type !== 'INGRESO') : [];
      setCategories(expenseCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchExpenses = async (month) => {
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/expenses?month=${month}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const onlyExpenses = Array.isArray(data) ? data.filter(item => item.category_type !== 'INGRESO') : [];

      // Asignar correlativo basado en el ID (orden de creación)
      const withCorrelative = [...onlyExpenses]
        .sort((a, b) => a.id - b.id)
        .map((item, index) => ({ ...item, correlative: index + 1 }));

      setExpenses(withCorrelative);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
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
          date: form.date
        })
      });
      if (res.ok) {
        setForm(prev => ({ ...prev, amount: '', concept: '' }));
        await fetchExpenses(filterMonth);
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este gasto?')) return;

    try {
      const res = await fetch(`/.netlify/functions/expenses?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchExpenses(filterMonth);
      } else {
        alert('No tienes permiso para eliminar este registro.');
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
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
      ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  // Filter and Sort Processing
  const filteredExpenses = expenses.filter(exp => {
    if (categoryFilter === 'all') return true;
    return exp.category_id?.toString() === categoryFilter;
  });

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    // Handle special cases for names coming from related fields
    if (key === 'category') {
      aValue = a.category_name || '';
      bValue = b.category_name || '';
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(null);

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
      console.log('Transcript:', transcript);
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
    // 1. Extract Amount and its position
    const amountMatch = text.match(/(\d+([.,]\d+)?)/);
    if (!amountMatch) {
      alert("No pude detectar un monto. Formato sugerido: 'Concepto Monto Categoría'");
      return;
    }

    const amount = amountMatch[1].replace(',', '.');
    const amountStr = amountMatch[0];
    const amountIndex = text.indexOf(amountStr);

    // 2. Split by Amount to respect strict order: [Concepto] [Monto] [Categoría]
    const beforeAmount = text.substring(0, amountIndex).trim();
    const afterAmount = text.substring(amountIndex + amountStr.length).trim();

    // 3. Identify Category in the text AFTER the amount
    let matchedCategoryId = form.category_id;
    let categoryFound = false;
    let matchedCatName = '';

    // Sort categories by length descending to match longer names first
    const sortedCategories = [...categories].sort((a, b) => b.name.length - a.name.length);

    // Primary search: after the amount (as per requested order)
    const searchTextAfter = afterAmount.toLowerCase().trim();
    if (searchTextAfter) {
      const spokenWords = searchTextAfter.split(/\s+/).filter(w => w.length >= 3);

      for (const cat of sortedCategories) {
        const catNameFull = cat.name.toLowerCase();
        // Clean name removes parentheses but we keep the content for matching if needed
        const catNameClean = catNameFull.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        const catWords = catNameClean.split(/\s+/).filter(w => w.length >= 3);

        // 1. Exact or partial string match (Bidirectional)
        const spokenContainsCat = searchTextAfter.includes(catNameClean) || searchTextAfter.includes(catNameFull);
        const catContainsSpoken = catNameClean.includes(searchTextAfter) || catNameFull.includes(searchTextAfter);

        // 2. Word-level match (e.g. "Trabajo" matching "Transportes (Trabajo)")
        const wordMatch = spokenWords.some(sw => catWords.some(cw => cw.includes(sw) || sw.includes(cw)));

        if (spokenContainsCat || catContainsSpoken || wordMatch) {
          matchedCategoryId = cat.id;
          matchedCatName = cat.name;
          categoryFound = true;
          break;
        }
      }
    }

    // 4. Identify Concept (Text before amount)
    let concept = beforeAmount;

    // Clean up concept (remove common filler words)
    const fillers = ['gasté', 'pagé', 'pagué', 'el', 'la', 'un', 'una', 'de', 'del', 'por', 'con', 'en'];
    concept = concept.split(/\s+/)
      .filter(word => !fillers.includes(word))
      .join(' ')
      .trim();

    // If concept is empty but we have text after amount that wasn't the category, 
    // maybe parts of it are the concept? (Fallback but following order)
    if (!concept && afterAmount && !categoryFound) {
      concept = afterAmount;
    }

    if (concept.length > 0) {
      concept = concept.charAt(0).toUpperCase() + concept.slice(1);
    }

    setForm(prev => ({
      ...prev,
      amount: amount,
      concept: concept || prev.concept,
      category_id: matchedCategoryId
    }));

    if (categoryFound) {
      setVoiceFeedback(`Capturado: "${concept}" S/ ${amount} en [${matchedCatName}]`);
    } else {
      setVoiceFeedback(`Capturado: "${concept}" S/ ${amount} (Categoría no detectada)`);
    }

    setTimeout(() => setVoiceFeedback(null), 6000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Registro de Gastos</h1>

        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Formulario */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Nuevo Gasto</h2>
          <button
            onClick={startVoiceInput}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isListening
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening ? 'Escuchando...' : 'Registrar por voz'}
          </button>
        </div>
        {voiceFeedback && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-lg animate-in fade-in duration-300">
            {voiceFeedback}
          </div>
        )}
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-12">
            <label className="col-span-1 block text-sm font-medium text-slate-600 mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="col-span-3 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Monto (S/)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">SuperCategoría (Filtro)</label>
            <Select
              options={[
                { value: 'all', label: 'Todas las SuperCategorías' },
                ...groups.map(g => ({ value: g.id, label: g.name }))
              ]}
              value={
                filterGroupId === 'all' 
                  ? { value: 'all', label: 'Todas las SuperCategorías' }
                  : groups.map(g => ({ value: g.id, label: g.name })).find(o => o.value === filterGroupId) || null
              }
              onChange={(option) => {
                setFilterGroupId(option?.value || 'all');
                setForm(prev => ({ ...prev, category_id: '' }));
              }}
              placeholder="Filtrar por grupo..."
              className="mb-1"
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
            <Select
              options={categories
                .filter(c => filterGroupId === 'all' || c.group_id === filterGroupId)
                .map(c => ({
                  value: c.id,
                  label: c.name
                }))}
              value={
                categories
                  .map(c => ({ value: c.id, label: c.name }))
                  .find(o => o.value === form.category_id) || null
              }
              onChange={(option) =>
                setForm({ ...form, category_id: option?.value || null })
              }
              placeholder="Selecciona categoría..."
              isClearable
              className=""
            />
          </div>
          <div className="col-span-12">
            <label className="block text-sm font-medium text-slate-600 mb-1">Concepto <span className="text-slate-400 font-normal">(Opcional)</span></label>
            <input
              type="text"
              value={form.concept}
              onChange={e => setForm({ ...form, concept: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. Almuerzo, Gasolina, Supermercado..."
            />
          </div>
        </form>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddExpense}
            disabled={submitting || !form.amount || !activeProject}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Añadir Gasto
          </button>
        </div>
      </div>

      {/* Tabla Histórica */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            Historial de Gastos
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {sortedExpenses.length} registros
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
                className="text-blue-600 hover:text-blue-800 transition-colors"
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
          ) : sortedExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {expenses.length === 0 ? "No hay gastos en este mes." : "No hay gastos que coincidan con el filtro."}
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
                  <th
                    className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center justify-end">Monto {getSortIcon('amount')}</div>
                  </th>
                  <th className="px-6 py-4 text-center">Usuario</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                      {exp.correlative}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${exp.category_color}20`,
                          color: exp.category_color || '#475569'
                        }}
                      >
                        {exp.category_name || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{exp.concept}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      S/ {parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                      {exp.created_by}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de Tarjetas (Mobile) */}
          <div className="md:hidden divide-y divide-slate-100">
            {sortedExpenses.map(exp => (
              <div key={exp.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N° {exp.correlative}</span>
                    <span className="text-xs font-medium text-slate-500">{new Date(exp.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">S/ {parseFloat(exp.amount).toFixed(2)}</div>
                </div>
                
                <div className="text-sm font-semibold text-slate-800 mb-2">{exp.concept}</div>
                
                <div className="flex justify-between items-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: `${exp.category_color}20`,
                      color: exp.category_color || '#475569'
                    }}
                  >
                    {exp.category_name || 'Sin categoría'}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-medium">{exp.created_by}</span>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>

      </div>
    </div>
  );
}
