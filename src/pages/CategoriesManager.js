import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, ArrowUpCircle, ArrowDownCircle, Info, PiggyBank, Edit2, X, Check, Target, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
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

  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');

  // Group Editing State
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: '', color: '' });

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [filterType, setFilterType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterFrequency, setFilterFrequency] = useState('all');

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
          budget: parseFloat(newBudget) || 0,
          group_id: newGroupId || null
        })
      });
      if (res.ok) {
        setNewName('');
        setNewBudget('0');
        setNewGroupId('');
        setNewColor('#3b82f6'); // Reset to default
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
          budget: parseFloat(editForm.budget) || 0,
          group_id: editForm.group_id || null
        })
      });
      if (res.ok) {
        await fetchCategories();
        cancelEdit();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'No tienes permiso para editar este registro o ocurrió un error.');
      }
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !activeProject) return;
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newGroupName.trim(), color: newGroupColor })
      });
      if (res.ok) {
        setNewGroupName('');
        fetchGroups();
      }
    } catch (err) {
      console.error('Error adding group:', err);
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm('¿Eliminar este grupo? Las categorías asociadas quedarán sin grupo.')) return;
    try {
      const res = await fetch(`/.netlify/functions/category_groups?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        fetchGroups();
        fetchCategories(); // To refresh category list which might have had this group
      }
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const handleStartEditGroup = (group) => {
    setEditingGroupId(group.id);
    setEditGroupForm({ name: group.name, color: group.color });
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditGroupForm({ name: '', color: '' });
  };

  const handleSaveEditGroup = async () => {
    if (!editGroupForm.name.trim() || !activeProject) return;
    try {
      const res = await fetch('/.netlify/functions/category_groups', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingGroupId,
          name: editGroupForm.name.trim(),
          color: editGroupForm.color
        })
      });
      if (res.ok) {
        await fetchGroups();
        await fetchCategories(); // Refresh categories to show updated group name/color
        handleCancelEditGroup();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Error al actualizar el grupo.');
      }
    } catch (err) {
      console.error('Error updating group:', err);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getFilteredAndSortedCategories = () => {
    let filtered = [...categories];

    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    if (filterGroup !== 'all') {
      if (filterGroup === 'none') {
        filtered = filtered.filter(c => !c.group_id);
      } else {
        filtered = filtered.filter(c => c.group_id === parseInt(filterGroup));
      }
    }

    if (filterFrequency !== 'all') {
      const isSingle = filterFrequency === 'single';
      filtered = filtered.filter(c => c.is_single_time === isSingle);
    }

    return filtered.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'group_name') {
        valA = a.group_name || '';
        valB = b.group_name || '';
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
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
        <button 
          onClick={() => setShowGroupManager(!showGroupManager)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            showGroupManager ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}
        >
          <Edit2 className="w-4 h-4" />
          {showGroupManager ? 'Cerrar Grupos' : 'Gestionar Grupos'}
        </button>
      </div>

      {showGroupManager && (
        <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" /> Grupos de Categorías (SuperCategorías)
          </h2>
          
          <form onSubmit={handleAddGroup} className="flex flex-wrap gap-3 mb-6">
            <input 
              type="text" 
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Nuevo nombre de grupo..."
              className="flex-1 min-w-[200px] px-4 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input 
              type="color" 
              value={newGroupColor}
              onChange={e => setNewGroupColor(e.target.value)}
              className="w-12 h-10 p-1 bg-white border border-indigo-200 rounded-lg cursor-pointer"
            />
            <button 
              type="submit"
              disabled={!newGroupName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear Grupo
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map(g => {
              const isEditingGroup = editingGroupId === g.id;

              if (isEditingGroup) {
                return (
                  <div key={g.id} className="bg-white p-3 rounded-lg border-2 border-indigo-500 shadow-md flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={editGroupForm.name}
                      onChange={e => setEditGroupForm({...editGroupForm, name: e.target.value})}
                      className="w-full px-2 py-1 border border-indigo-200 rounded text-sm outline-none"
                      autoFocus
                    />
                    <div className="flex justify-between items-center">
                      <input 
                        type="color" 
                        value={editGroupForm.color}
                        onChange={e => setEditGroupForm({...editGroupForm, color: e.target.value})}
                        className="w-10 h-8 p-0.5 border border-indigo-200 rounded cursor-pointer"
                      />
                      <div className="flex gap-1">
                        <button 
                          onClick={handleSaveEditGroup}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Guardar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={handleCancelEditGroup}
                          className="p-1.5 text-slate-500 hover:bg-slate-50 rounded transition-colors"
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
                <div key={g.id} className="bg-white p-3 rounded-lg border border-indigo-100 flex justify-between items-center shadow-sm hover:border-indigo-300 transition-colors group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: g.color }} />
                    <span className="font-medium text-slate-700">{g.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => handleStartEditGroup(g)}
                      className="text-slate-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                      title="Editar Grupo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteGroup(g.id)}
                      className="text-slate-500 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      title="Eliminar Grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Añadir Nuevo Concepto</h2>
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end text-sm">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Grupo (Opcional)</label>
            <select 
              value={newGroupId}
              onChange={e => {
                const gid = e.target.value;
                setNewGroupId(gid);
                if (gid) {
                  const group = groups.find(g => g.id === parseInt(gid));
                  if (group) setNewColor(group.color);
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white appearance-none h-10 text-sm"
            >
              <option value="">Ninguno</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Presupuesto</label>
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
            {newGroupId ? (
              <div className="flex items-center gap-2 h-10 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: newColor }} />
                <span>Heredado</span>
              </div>
            ) : (
              <input 
                type="color" 
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
              />
            )}
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
              </div>
              
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los Tipos</option>
                <option value="GASTO">Gastos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="AHORRO">Ahorros</option>
              </select>

              <select 
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las SuperCategorías</option>
                <option value="none">Sin Grupo</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <select 
                value={filterFrequency}
                onChange={e => setFilterFrequency(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las Frecuencias</option>
                <option value="single">Solo una vez (Fijo)</option>
                <option value="accumulative">Se acumula (Variable)</option>
              </select>

              {(filterType !== 'all' || filterGroup !== 'all' || filterFrequency !== 'all') && (
                <button 
                  onClick={() => { setFilterType('all'); setFilterGroup('all'); setFilterFrequency('all'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpiar Filtros
                </button>
              )}
              
              <div className="ml-auto text-xs text-slate-400">
                {getFilteredAndSortedCategories().length} resultados
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                    <th 
                      className="px-6 py-4 w-16 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('color')}
                    >
                      <div className="flex items-center gap-1">
                        Color 
                        {sortConfig.key === 'color' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 w-40 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('group_name')}
                    >
                      <div className="flex items-center gap-2">
                        Grupo 
                        {sortConfig.key === 'group_name' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-10 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Nombre 
                        {sortConfig.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-10 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Tipo 
                        {sortConfig.key === 'type' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-10 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 w-40 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('is_single_time')}
                    >
                      <div className="flex items-center gap-2">
                        Frecuencia 
                        {sortConfig.key === 'is_single_time' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-10 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-right w-32 cursor-pointer hover:bg-slate-100 transition-colors group/head"
                      onClick={() => requestSort('budget')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Presupuesto 
                        {sortConfig.key === 'budget' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-10 group-hover/head:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedCategories().map(cat => {
                    const isEditing = editingId === cat.id;

                    if (isEditing) {
                      return (
                        <tr key={cat.id} className="border-b border-slate-100 bg-blue-50/50 text-sm">
                          <td className="px-6 py-3">
                            {editForm.group_id ? (
                               <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center" title="Heredado del grupo">
                                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: editForm.color }} />
                               </div>
                            ) : (
                              <input 
                                type="color" 
                                value={editForm.color}
                                onChange={e => setEditForm({...editForm, color: e.target.value})}
                                className="w-8 h-8 border border-slate-300 rounded cursor-pointer p-0 shadow-sm"
                              />
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <select 
                              value={editForm.group_id || ''}
                              onChange={e => {
                                const gid = e.target.value;
                                const updates = { group_id: gid || null };
                                if (gid) {
                                  const group = groups.find(g => g.id === parseInt(gid));
                                  if (group) updates.color = group.color;
                                }
                                setEditForm({...editForm, ...updates});
                              }}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            >
                              <option value="">(Sin Grupo)</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
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
                      );
                    }

                    return (
                      <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm group">
                        <td className="px-6 py-4">
                          <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                        </td>
                        <td className="px-6 py-4">
                          {cat.group_id ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium" 
                                 style={{ backgroundColor: `${cat.group_color}15`, color: cat.group_color }}>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.group_color }} />
                              {cat.group_name}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin grupo</span>
                          )}
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
            
            {getFilteredAndSortedCategories().length === 0 && (
              <div className="p-12 text-center text-slate-500 border-t border-slate-100">
                No se encontraron categorías con los filtros seleccionados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
