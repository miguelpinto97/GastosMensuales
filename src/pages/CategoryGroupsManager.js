import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Target, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CategoryGroupsManager() {
  const { activeProject, getAuthHeaders } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeProject) {
      fetchGroups();
    }
  }, [activeProject]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !activeProject) return;

    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newName.trim(), color: newColor })
      });
      if (res.ok) {
        setNewName('');
        await fetchGroups();
      }
    } catch (err) {
      console.error('Error adding group:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este grupo? Las categorías asociadas quedarán sin grupo.')) return;
    
    try {
      const res = await fetch(`/.netlify/functions/category_groups?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchGroups();
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">SuperCategorías</h1>
        <p className="text-slate-500">Agrupa tus categorías para un mejor análisis</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Crear Nuevo Grupo</h2>
        <form onSubmit={handleAddGroup} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Grupo</label>
            <input 
              type="text" 
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej. Hogar, Ocio, Servicios..."
              required
            />
          </div>
          
          <div className="w-20">
            <label className="block text-sm font-medium text-slate-600 mb-1">Color</label>
            <input 
              type="color" 
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer bg-white p-1"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting || !newName.trim() || !activeProject}
            className="bg-indigo-600 text-white px-6 h-10 font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Guardar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No tienes grupos creados aún.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {groups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                  <span className="font-semibold text-slate-700">{group.name}</span>
                </div>
                <button 
                  onClick={() => handleDelete(group.id)}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
