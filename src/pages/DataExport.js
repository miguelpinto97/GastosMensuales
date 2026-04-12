import React, { useState } from 'react';
import { Download, Calendar, Filter, FileSpreadsheet, Loader2, ArrowLeft, Clock, CalendarRange } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';

export default function DataExport() {
  const { activeProject, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportMode, setExportMode] = useState('month'); // 'year', 'month', 'week', 'day', 'custom'
  
  // Selection States
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const getDateRange = () => {
    let start, end;
    
    switch (exportMode) {
      case 'year':
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
        break;
      case 'month':
        const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
        start = `${selectedYear}-${selectedMonth}-01`;
        end = `${selectedYear}-${selectedMonth}-${lastDay}`;
        break;
      case 'week':
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
        start = monday.toISOString().split('T')[0];
        end = sunday.toISOString().split('T')[0];
        break;
      case 'day':
        start = selectedDate;
        end = selectedDate;
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      default:
        start = startDate;
        end = endDate;
    }
    return { start, end };
  };

  const handleExport = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await fetch(`/.netlify/functions/export?start=${start}&end=${end}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        alert('No hay datos para exportar en el rango seleccionado.');
        setLoading(false);
        return;
      }

      // Preparar datos para Excel
      const excelData = data.map(item => ({
        'Fecha': item.date.split('T')[0],
        'Tipo': item.type,
        'Supercategoría': item.supercategory || 'Sin Grupo',
        'Categoría': item.category,
        'Concepto': item.concept || '',
        'Monto': parseFloat(item.amount)
      }));

      // Crear Libro y Hoja
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

      // Ajustar anchos de columna (opcional pero profesional)
      const wscols = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Tipo
        { wch: 15 }, // Supercat
        { wch: 20 }, // Cat
        { wch: 30 }, // Concepto
        { wch: 12 }, // Monto
      ];
      worksheet['!cols'] = wscols;

      // Descargar
      let valDisplay = '';
      if (exportMode === 'year') valDisplay = selectedYear;
      else if (exportMode === 'month') valDisplay = `${selectedYear}-${selectedMonth}`;
      else if (exportMode === 'day') valDisplay = selectedDate;
      else valDisplay = `${start}_a_${end}`; // Para week y custom

      const modeLabel = modes.find(m => m.id === exportMode)?.label || 'Export';
      const fileName = `Reporte_Finanzas_${modeLabel}_${valDisplay}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Error al generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 'year', label: 'Anual', icon: Calendar },
    { id: 'month', label: 'Mensual', icon: Clock },
    { id: 'week', label: 'Semanal', icon: CalendarRange },
    { id: 'day', label: 'Diario', icon: Filter },
    { id: 'custom', label: 'Rango', icon: FileSpreadsheet },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h1 className="text-3xl font-bold text-slate-800">Exportar Datos</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cabecera de Selección de Modo */}
        <div className="bg-slate-50 border-b border-slate-200 p-2">
          <div className="flex flex-wrap gap-1">
            {modes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setExportMode(mode.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                  exportMode === mode.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Formulario de Parámetros */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            
            {/* Vistas condicionales según el modo */}
            {exportMode === 'year' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Seleccionar Año</label>
                <select 
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {exportMode === 'month' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Año</label>
                  <select 
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mes</label>
                  <select 
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none capitalize"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={(i+1).toString().padStart(2, '0')}>
                        {new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(exportMode === 'week' || exportMode === 'day') && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">
                  {exportMode === 'week' ? 'Elija un día de la semana a exportar' : 'Elija la fecha'}
                </label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {exportMode === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Desde</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Hasta</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-center">
            <button
              onClick={handleExport}
              disabled={loading || !activeProject}
              className="group relative flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              ) : (
                <Download className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
              )}
              {loading ? 'Preparando archivo...' : 'Generar reporte Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900">¿Qué contiene el archivo?</h3>
          <p className="text-sm text-blue-700 mt-1 leading-relaxed">
            Se generará un archivo .xlsx con una sola hoja llamada "Movimientos" que incluye todas las transacciones (Ingresos, Gastos y Ahorro) en el periodo seleccionado. Incluye detalles de concepto, supercategoría y categoría vinculados.
          </p>
        </div>
      </div>
    </div>
  );
}
