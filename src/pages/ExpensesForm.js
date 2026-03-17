import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, DollarSign } from 'lucide-react';
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

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  useEffect(() => {
    if (activeProject) {
      fetchCategories();
    }
  }, [activeProject]);

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
      if (expenseCategories.length > 0) {
        setForm(prev => ({ ...prev, category_id: expenseCategories[0].id.toString() }));
      }
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
      setExpenses(onlyExpenses);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
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
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Nuevo Gasto</h2>
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
            <label className="block text-sm font-medium text-slate-600 mb-1">Concepto</label>
            <input
              type="text"
              value={form.concept}
              onChange={e => setForm({ ...form, concept: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. Almuerzo, Gasolina, Supermercado..."
              required
            />
          </div>
          <div className="col-span-12 md:col-span-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </form>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAddExpense}
            disabled={submitting || !form.amount || !form.concept || !activeProject}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Añadir Gasto
          </button>
        </div>
      </div>

      {/* Tabla Histórica */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay gastos en este mes.</div>
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
              {expenses.map(exp => (
                <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
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
        )}
      </div>
    </div>
  );
}
