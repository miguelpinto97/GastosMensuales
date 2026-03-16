import React, { useState, useEffect } from 'react';
import { Loader2, TrendingDown, TrendingUp, DollarSign, CalendarCheck, PiggyBank, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { activeProject, getAuthHeaders } = useAuth();
  const [summary, setSummary] = useState({ totalsByType: {}, byCategory: [] });
  const [loading, setLoading] = useState(true);
  
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState(currentMonth);

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

  // Filtrar categorías (Sólo Gastos)
  const catGastosFijos = summary.byCategory?.filter(c => c.type === 'GASTO' && c.is_single_time) || [];
  const catGastosAcumulativos = summary.byCategory?.filter(c => c.type === 'GASTO' && !c.is_single_time) || [];

  const CategorySection = ({ title, data, totalType, monthProgressPercentage }) => {
    if (data.length === 0) return null;
    
    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((cat, idx) => {
            const percentageUsed = cat.budget > 0 ? (cat.total / cat.budget) * 100 : 0;
            const isOverBudget = cat.budget > 0 && cat.total > cat.budget;
            
            // Lógica de Proyectado
            let projectedExpected = 0;
            let statusText = '';
            let statusColor = 'text-slate-500';

            if (cat.budget > 0) {
              if (cat.is_single_time) {
                // Gastos fijos (1 vez), deberían ejecutarse 100% o 0% sin importar día
                projectedExpected = cat.budget;
                statusText = cat.total >= cat.budget ? 'Pagado' : 'Pendiente';
                statusColor = cat.total >= cat.budget ? 'text-emerald-500' : 'text-amber-500';
              } else {
                // Gastos variables acumulativos
                projectedExpected = cat.budget * (monthProgressPercentage / 100);
                const difference = cat.total - projectedExpected;

                if (difference > (cat.budget * 0.1)) {
                  statusText = 'Gastando rápido';
                  statusColor = 'text-red-500';
                } else if (difference < -(cat.budget * 0.1)) {
                  statusText = 'Ahorrando';
                  statusColor = 'text-emerald-500';
                } else {
                  statusText = 'A ritmo normal';
                  statusColor = 'text-blue-500';
                }
              }
            }

            return (
              <div key={idx} className="relative bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: cat.color || '#cbd5e1' }}></span>
                    <div>
                      <p className="font-semibold text-slate-700 leading-tight">{cat.name}</p>
                      <p className="text-xs text-slate-500">
                        {cat.is_single_time ? 'Fijo (1 vez)' : 'Acumulable'}
                        {cat.budget > 0 && ` • Ppto: S/ ${cat.budget}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800">S/ {cat.total?.toFixed(2)}</span>
                    <p className="text-xs text-slate-500">{percentageUsed.toFixed(1)}% Usado</p>
                  </div>
                </div>
                
                {cat.budget > 0 && (
                  <div className="mt-3 relative">
                    <div className="flex justify-between text-[10px] font-medium mb-1">
                      <span className={statusColor}>{statusText}</span>
                      {!cat.is_single_time && monthProgressPercentage && (
                        <span className="text-slate-400">
                          Debería ir: S/ {projectedExpected.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Progress container */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
                      {/* Línea meta proyectada de tiempo (si no es fijo) */}
                      {!cat.is_single_time && monthProgressPercentage && (
                        <div 
                          className="absolute top-0 bottom-0 border-r-2 border-slate-900 z-10"
                          style={{ left: `${monthProgressPercentage}%`, width: '1px' }}
                          title={`Días transcurridos: ${monthProgressPercentage.toFixed(0)}%`}
                        ></div>
                      )}

                      {/* Barra de progreso real */}
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-red-500' : ''}`} 
                        style={{ 
                          width: `${Math.min(percentageUsed, 100)}%`, 
                          backgroundColor: isOverBudget ? undefined : cat.color || '#cbd5e1' 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 text-emerald-600 mb-2">
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                <span className="font-semibold">Ingresos</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalIngresos.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 text-red-600 mb-2">
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
                <span className="font-semibold">Gastos</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalGastos.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-3 text-amber-500 mb-2">
                <div className="p-2 bg-amber-50 rounded-lg"><PiggyBank className="w-5 h-5" /></div>
                <span className="font-semibold">Ahorro</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">S/ {totalAhorro.toFixed(2)}</p>
            </div>

            <div className={`${balanceNeto >= 0 ? 'bg-blue-600' : 'bg-rose-600'} text-white p-5 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden`}>
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
            <h2 className="text-xl font-bold text-slate-800 mb-8 border-b pb-4">Desglose de Gastos</h2>
            
            {(catGastosFijos.length === 0 && catGastosAcumulativos.length === 0) ? (
              <div className="py-10 text-center text-slate-500">No hay gastos registrados en este mes.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                <div>
                  <CategorySection 
                    title="📌 Gastos Fijos (1 sola vez)" 
                    data={catGastosFijos} 
                    totalType={totalGastos} 
                    monthProgressPercentage={summary.monthProgressPercentage}
                  />
                </div>
                <div>
                  <CategorySection 
                    title="🔄 Gastos Acumulativos" 
                    data={catGastosAcumulativos} 
                    totalType={totalGastos} 
                    monthProgressPercentage={summary.monthProgressPercentage}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
