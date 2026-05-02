import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingDown, TrendingUp, DollarSign, CalendarCheck, PiggyBank, Target, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChevronDown } from 'lucide-react';

export default function Dashboard() {
  const { activeProject, getAuthHeaders, filterMonth, setFilterMonth } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ totalsByType: {}, byCategory: [] });
  const [loading, setLoading] = useState(true);


  const [viewMode, setViewMode] = useState('category'); // 'category' o 'group'

  useEffect(() => {
    if (activeProject) {
      fetchSummary(filterMonth);
    }
  }, [filterMonth, activeProject]);

  const fetchSummary = async (month) => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/.netlify/functions/summary?month=${month}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary({ totalsByType: {}, byCategory: [] });
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  };

  const totalIngresos = summary.totalsByType?.INGRESO || 0;
  const totalGastos = summary.totalsByType?.GASTO || 0;
  const totalAhorro = summary.totalsByType?.AHORRO || 0;

  const balanceNeto = totalIngresos - totalGastos - totalAhorro;

  // Lógica de Agrupamiento por SuperCategoría (Grupos)
  const groupData = (list) => {
    const grouped = {};
    const ungrouped = [];

    list.forEach(cat => {
      if (cat.group_id) {
        if (!grouped[cat.group_id]) {
          grouped[cat.group_id] = {
            id: cat.group_id,
            name: cat.group_name,
            isGroup: true,
            color: cat.group_color || cat.color,
            total: 0,
            budget: 0,
            is_single_time: cat.is_single_time,
            categories: []
          };
        }
        grouped[cat.group_id].total += parseFloat(cat.total || 0);
        grouped[cat.group_id].budget += parseFloat(cat.budget || 0);
        grouped[cat.group_id].categories.push(cat);
      } else {
        ungrouped.push(cat);
      }
    });

    return [...Object.values(grouped), ...ungrouped].sort((a, b) => b.total - a.total);
  };

  // Filtrar categorías (Sólo Gastos) para vista normal
  const catGastosFijos = (summary.byCategory?.filter(c => c.type === 'GASTO' && c.is_single_time) || [])
    .sort((a, b) => b.total - a.total);
  const catGastosAcumulativos = (summary.byCategory?.filter(c => c.type === 'GASTO' && !c.is_single_time) || [])
    .sort((a, b) => b.total - a.total);

  const CategorySection = ({ title, data, monthProgressPercentage }) => {
    const [open, setOpen] = useState(true);

    if (data.length === 0) return null;

    // Grouping for the "Columnar" view
    const superGroups = {};
    data.forEach(item => {
      const gid = item.group_id || 'none';
      if (!superGroups[gid]) {
        superGroups[gid] = {
          id: gid,
          name: item.group_name || 'Otros / Sin Grupo',
          color: item.group_color || '#94a3b8',
          items: []
        };
      }
      superGroups[gid].items.push(item);
    });

    const superGroupsList = Object.values(superGroups).map(group => ({
      ...group,
      items: group.items.sort((a, b) => a.name.localeCompare(b.name))
    }));

    const forceBlackText = true; // Cambiar a false para volver a usar el color de la categoría en el texto

    return (
      <div className="mb-12 last:mb-0">
        {/* HEADER (clickable) */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center mb-6 pb-2 border-b-2 border-slate-100"
        >
          <h3 className="text-xl font-bold text-slate-700 text-left flex items-center gap-2">
            {title}
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {superGroupsList.length} Grupos
            </span>
          </h3>

          <ChevronDown
            className={`w-6 h-6 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* CONTENT - GRID DINÁMICO */}
        {open && (
          <div className={superGroupsList.length >= 3 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start" 
            : "flex flex-col gap-8"
          }>
            {superGroupsList.map((group, gIdx) => (
              <div 
                key={group.id} 
                className={`flex flex-col gap-3 ${superGroupsList.length < 3 ? 'w-full' : ''}`}
              >
                {/* TÍTULO DE LA COLUMNA / SECCIÓN */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                  <h4 className="font-black text-slate-500 uppercase text-[11px] tracking-widest">
                    {group.name}
                  </h4>
                </div>

                {/* LISTA DE CATEGORÍAS - Grid si hay pocos grupos, Columna si hay muchos */}
                <div className={`grid gap-3 ${superGroupsList.length < 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {group.items.map((cat, idx) => {
                    const percentageUsed = cat.budget > 0 ? (cat.total / cat.budget) * 100 : 0;
                    const isOverBudget = cat.budget > 0 && cat.total > cat.budget;

                    let statusText = '';
                    if (cat.budget > 0) {
                      if (cat.is_single_time) {
                        statusText = cat.total >= cat.budget ? 'Pagado' : 'Pendiente';
                      } else {
                        const projectedExpected = cat.budget * (monthProgressPercentage / 100);
                        const difference = cat.total - projectedExpected;
                        if (difference > (cat.budget * 0.1)) statusText = 'Rápido';
                        else if (difference < -(cat.budget * 0.1)) statusText = 'Ahorro';
                        else statusText = 'Normal';
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl shadow-sm border transition-all hover:shadow-md bg-white/80"
                        style={{ 
                          backgroundColor: `${cat.color}15`,
                          borderColor: `${cat.color}40`,
                          color: forceBlackText ? '#1e293b' : cat.color
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className={`font-bold text-xs truncate max-w-[140px] ${forceBlackText ? 'text-slate-800' : ''}`}>{cat.name}</p>
                          <p className={`font-black text-xs shrink-0 ${forceBlackText ? 'text-slate-800' : ''}`}>S/ {cat.total?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                        </div>

                        {cat.budget > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="opacity-70">Pres: S/ {cat.budget}</span>
                              <span className={isOverBudget ? 'text-red-600' : 'opacity-90'}>
                                {percentageUsed.toFixed(0)}% • {statusText}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-white/50 rounded-full relative overflow-hidden border border-black/5">
                              {!cat.is_single_time && monthProgressPercentage && (
                                <div className="absolute inset-y-0 border-r border-black/10 z-10" style={{ left: `${monthProgressPercentage}%` }} />
                              )}
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : ""}`}
                                style={{ width: `${Math.min(percentageUsed, 100)}%`, backgroundColor: isOverBudget ? undefined : cat.color }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Resumen Mensual</h1>
          <p className="text-slate-500 mt-1 capitalize">{getMonthName(filterMonth)}</p>
        </div>

        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-blue-500"><Loader2 className="w-10 h-10 animate-spin" /></div>
      ) : (
        <>
          {/* Tarjetas KPI Superiores */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => navigate('/incomes')}
              className="col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/10 transition-all group"
            >
              <div className="flex items-center space-x-3 text-emerald-600 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors"><TrendingUp className="w-5 h-5" /></div>
                <span className="font-semibold">Ingresos</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalIngresos.toFixed(2)}</p>
            </div>

            <div 
              onClick={() => navigate('/expenses')}
              className="col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-red-500/50 hover:bg-red-50/10 transition-all group"
            >
              <div className="flex items-center space-x-3 text-red-600 mb-2">
                <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors"><TrendingDown className="w-5 h-5" /></div>
                <span className="font-semibold">Gastos</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalGastos.toFixed(2)}</p>
            </div>

            <div className="col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 text-amber-500 mb-2">
                <div className="p-2 bg-amber-50 rounded-lg"><PiggyBank className="w-5 h-5" /></div>
                <span className="font-semibold">Ahorro</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalAhorro.toFixed(2)}</p>
            </div>

            <div className={`${balanceNeto >= 0 ? 'bg-blue-600' : 'bg-rose-600'} col-span-1  text-white p-5 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden`}>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 text-white/90 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="font-medium text-sm">Balance Libre</span>
                </div>
                <p className="text-2xl font-bold">S/ {balanceNeto.toFixed(2)}</p>
              </div>
              <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
            </div>
          </div>

          {/* Gráfico / Distribución por Categoría Dividida */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b gap-4">
              <h2 className="text-xl font-bold text-slate-800">Desglose de Gastos</h2>
              
            <div className="flex flex-col md:flex-row items-center gap-4">
              <button 
                onClick={() => navigate('/export')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all border border-blue-100"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </button>

              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setViewMode('category')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'category' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Categorías
                </button>
                <button 
                  onClick={() => setViewMode('group')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'group' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Grupos
                </button>
              </div>
            </div>
            </div>

            {(summary.byCategory?.length === 0) ? (
              <div className="py-10 text-center text-slate-500">No hay gastos registrados en este mes.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-x-12 gap-y-8">
                <CategorySection
                  title={viewMode === 'category' ? "📌 Gastos Fijos (1 sola vez)" : "📂 Grupos: Gastos Fijos"}
                  data={viewMode === 'category' ? catGastosFijos : groupData(catGastosFijos)}
                  totalType={totalGastos}
                  monthProgressPercentage={summary.monthProgressPercentage}
                />
                <CategorySection
                  title={viewMode === 'category' ? "🔄 Gastos Acumulativos" : "📂 Grupos: Gastos Acumulativos"}
                  data={viewMode === 'category' ? catGastosAcumulativos : groupData(catGastosAcumulativos)}
                  totalType={totalGastos}
                  monthProgressPercentage={summary.monthProgressPercentage}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
