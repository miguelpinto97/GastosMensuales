import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  useEffect(() => {
    if (activeProject) {
      fetchCategories();
    }
  }, [activeProject]);

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
      if (incomeCategories.length > 0) {
        setForm(prev => ({ ...prev, category_id: incomeCategories[0].id.toString() }));
      }
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
      setIncomes(onlyIncomes);
    } catch (err) {
      console.error('Error fetching incomes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.concept || !form.date || !activeProject) return;

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
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Concepto</label>
            <input
              type="text"
              value={form.concept}
              onChange={e => setForm({ ...form, concept: e.target.value })}
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              placeholder="Ej. Sueldo, Transferencia..."
              required
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-emerald-700 mb-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </form>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddIncome}
            disabled={submitting || !form.amount || !form.concept || !activeProject}
            className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Añadir Ingreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : incomes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay ingresos registrados en este mes.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-medium">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
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
                      {item.category_name || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{item.concept}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">
                    S/ {parseFloat(item.amount).toFixed(2)}
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
        )}
      </div>
    </div>
  );
}
