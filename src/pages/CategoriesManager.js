import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ArrowUpCircle, ArrowDownCircle, Info, PiggyBank, Edit2, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CategoriesManager() {
  const { activeProject, getAuthHeaders, isOwner } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [newType, setNewType] = useState('GASTO');
  const [newIsSingleTime, setNewIsSingleTime] = useState(false);
  const [newBudget, setNewBudget] = useState('0');
  
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (activeProject) {
      fetchCategories();
    }
  }, [activeProject]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/categories', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !activeProject) return;

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          name: newName.trim(), 
          color: newColor,
          type: newType,
          is_single_time: newIsSingleTime,
          budget: parseFloat(newBudget) || 0
        })
      });
      if (res.ok) {
        setNewName('');
        setNewBudget('0');
        await fetchCategories();
      }
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta categoría? Se desvinculará de los gastos asociados.')) return;
    
    try {
      const res = await fetch(`/.netlify/functions/categories?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchCategories();
      } else {
        alert('No tienes permiso para eliminar este registro.');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ ...cat });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.name.trim() || !activeProject) return;
    try {
      const res = await fetch('/.netlify/functions/categories', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name.trim(),
          color: editForm.color,
          type: editForm.type,
          is_single_time: editForm.is_single_time,
          budget: parseFloat(editForm.budget) || 0
        })
      });
      if (res.ok) {
        await fetchCategories();
        cancelEdit();
      } else {
         alert('No tienes permiso para editar este registro.');
      }
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'INGRESO': return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
      case 'GASTO': return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
      case 'AHORRO': return <PiggyBank className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Categorías y Presupuestos</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Añadir Nuevo Concepto</h2>
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
            <input 
              type="text" 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. Comida, Internet..."
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
            <select 
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="GASTO">Gasto</option>
              <option value="INGRESO">Ingreso</option>
              <option value="AHORRO">Ahorro</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Presupuesto</label>
            <input 
              type="number" 
              step="0.01"
              value={newBudget}
              onChange={e => setNewBudget(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex items-center h-full mb-2">
            <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
              <input 
                type="checkbox" 
                checked={newIsSingleTime}
                onChange={e => setNewIsSingleTime(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Sólo una vez</span>
            </label>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Color</label>
            <input 
              type="color" 
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
            />
          </div>

          <div className="md:col-span-2 mb-[1px]">
            <button 
              type="submit" 
              disabled={submitting || !newName.trim() || !activeProject}
              className="w-full h-10 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Guardar
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
        {loading ? (
          <div className="p-8 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay categorías registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                  <th className="px-6 py-4 w-16">Color</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4 w-32">Tipo</th>
                  <th className="px-6 py-4 w-40">Frecuencia</th>
                  <th className="px-6 py-4 text-right w-32">Presupuesto</th>
                  <th className="px-6 py-4 text-right w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const isEditing = editingId === cat.id;

                  if (isEditing) {
                    return (
                      <tr key={cat.id} className="border-b border-slate-100 bg-blue-50/50 text-sm">
                        <td className="px-6 py-3">
                          <input 
                            type="color" 
                            value={editForm.color}
                            onChange={e => setEditForm({...editForm, color: e.target.value})}
                            className="w-8 h-8 border border-slate-300 rounded cursor-pointer p-0"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <select 
                            value={editForm.type}
                            onChange={e => setEditForm({...editForm, type: e.target.value})}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-sm"
                          >
                            <option value="GASTO">Gasto</option>
                            <option value="INGRESO">Ingreso</option>
                            <option value="AHORRO">Ahorro</option>
                          </select>
                        </td>
                        <td className="px-6 py-3">
                          <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={editForm.is_single_time}
                              onChange={e => setEditForm({...editForm, is_single_time: e.target.checked})}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>Una vez</span>
                          </label>
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.budget}
                            onChange={e => setEditForm({...editForm, budget: e.target.value})}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={saveEdit}
                              className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded transition-colors"
                              title="Guardar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={cancelEdit}
                              className="text-slate-500 hover:bg-slate-200 p-1.5 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  // Vista normal (Sólo lectura)
                  return (
                    <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm group">
                      <td className="px-6 py-4">
                        <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(cat.type)}
                          <span className="capitalize">{cat.type?.toLowerCase() || 'Gasto'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {cat.is_single_time ? 'Una vez (Fijo)' : 'Se acumula (Variable)'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">
                        S/ {parseFloat(cat.budget || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOwner(cat.created_by) ? (
                          <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(cat)}
                              className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(cat.id)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Solo Vista</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
