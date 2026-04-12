import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Target, Check, X, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CategoryGroupsManager() {
  const { activeProject, getAuthHeaders } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '' });

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
  
  const handleStartEdit = (group) => {
    setEditingId(group.id);
    setEditForm({ name: group.name, color: group.color });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', color: '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !activeProject) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingId,
          name: editForm.name.trim(),
          color: editForm.color
        })
      });
      if (res.ok) {
        await fetchGroups();
        handleCancelEdit();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Error al actualizar el grupo.');
      }
    } catch (err) {
      console.error('Error updating group:', err);
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
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
            {groups.map(group => {
              const isEditing = editingId === group.id;
              
              if (isEditing) {
                return (
                  <div key={group.id} className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/30 flex flex-col gap-3 shadow-md animate-in zoom-in-95 duration-200">
                    <input 
                      type="text" 
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-1.5 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                    />
                    <div className="flex justify-between items-center">
                      <input 
                        type="color" 
                        value={editForm.color}
                        onChange={e => setEditForm({...editForm, color: e.target.value})}
                        className="w-12 h-8 border border-indigo-200 rounded cursor-pointer p-0.5 bg-white"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveEdit}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                          title="Guardar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={group.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group/item">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: group.color }}></div>
                    <span className="font-semibold text-slate-700">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleStartEdit(group)}
                      className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar Grupo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(group.id)}
                      className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
