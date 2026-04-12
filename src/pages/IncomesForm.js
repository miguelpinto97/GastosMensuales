import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Loader2, DollarSign, ArrowUpDown, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SnapCarousel from '../components/SnapCarousel';

export default function IncomesForm() {
  const { activeProject, getAuthHeaders, isOwner } = useAuth();
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
      const onlyIncomes = Array.isArray(data) ? data.filter(item => item.category_type === 'INGRESO') : [];

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
          date: form.date
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
    if (categoryFilter === 'all') return true;
    return item.category_id?.toString() === categoryFilter;
  });

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
        <h2 className="text-lg font-semibold text-emerald-800 mb-4">Nuevo Ingreso</h2>
        <form onSubmit={handleAddIncome} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-12">
            <label className="col-span-1 block text-sm font-medium text-emerald-700 mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="col-span-3 w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              required
            />
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
            <SnapCarousel 
              items={[
                { id: 'none', name: 'Sin Grupo', color: '#cbd5e1' }, 
                ...groups
              ]}
              activeId={filterGroupId}
              onChange={(id) => {
                setFilterGroupId(id);
                setForm(prev => ({ ...prev, category_id: '' }));
              }}
              themeColor="emerald"
            />
          </div>
          <div className="col-span-12">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Categoría</label>
            <SnapCarousel 
              items={categories
                .filter(c => {
                  if (filterGroupId === 'none') return c.group_id === null || c.group_id === undefined;
                  return c.group_id === filterGroupId;
                })
                .map(c => ({
                  id: c.id,
                  name: c.group_name ? `${c.group_name} - ${c.name}` : c.name,
                  color: c.color
                }))
              }
              activeId={form.category_id}
              onChange={(id) => setForm({ ...form, category_id: id })}
              themeColor="emerald"
            />
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
                      {item.concept || (item.group_name ? `${item.group_name} - ${item.category_name}` : item.category_name)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      S/ {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                      {item.created_by}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isOwner(item.created_by) ? (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">---</span>
                      )}
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
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-medium">{item.created_by}</span>
                    {isOwner(item.created_by) ? (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
    </div>
  );
}
