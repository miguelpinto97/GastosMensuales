import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Save, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function IncomesForm() {
    const { activeProject, getAuthHeaders, isOwner } = useAuth();
    const [categories, setCategories] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Grid Data (Mezcla de Categorías y Gastos)
    const [gridData, setGridData] = useState([]);

    // Estado de guardado por fila (para mostrar feedback visual)
    const [savingRows, setSavingRows] = useState({});

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [filterMonth, setFilterMonth] = useState(currentMonth);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeProject) {
            loadGridData();
        }
    }, [activeProject, filterMonth]);

    const loadGridData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Categories (Solo Ingresos)
            const resCat = await fetch('/.netlify/functions/categories?type=single', {
                headers: getAuthHeaders()
            });
            const dataCat = await resCat.json();
            const incomeCats = Array.isArray(dataCat) ? dataCat.filter(c => c.type === 'INGRESO') : [];

            // 2. Fetch Incomes del Mes Actual
            const resExp = await fetch(`/.netlify/functions/expenses?month=${filterMonth}`, { headers: getAuthHeaders() });
            const dataExp = await resExp.json();
            const monthIncomes = Array.isArray(dataExp) ? dataExp.filter(item => item.category_type === 'INGRESO') : [];

            // 3. Crear Grilla haciendo Match (Left Join)
            const grid = incomeCats.map(cat => {
                const catIncomes = monthIncomes.filter(e => e.category_id === cat.id);

                let totalAmount = 0;
                let primaryExpenseId = null;
                let concept = cat.name;

                if (catIncomes.length > 0) {
                    totalAmount = catIncomes.reduce((sum, e) => sum + parseFloat(e.amount), 0);
                    primaryExpenseId = catIncomes[0].id;
                    concept = catIncomes.length === 1 ? catIncomes[0].concept : `Varios ingresos (${catIncomes.length})`;
                }

                return {
                    categoryId: cat.id,
                    categoryName: cat.name,
                    categoryColor: cat.color,
                    expenseId: primaryExpenseId,
                    amount: totalAmount,
                    concept: concept,
                    originalAmount: totalAmount,
                    originalConcept: concept
                };
            });

            setCategories(incomeCats);
            setIncomes(monthIncomes);
            setGridData(grid);

        } catch (err) {
            console.error('Error fetching grid data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (catId, newAmount) => {
        setGridData(prev => prev.map(row =>
            row.categoryId === catId ? { ...row, amount: newAmount } : row
        ));
    };

    const handleConceptChange = (catId, newConcept) => {
        setGridData(prev => prev.map(row =>
            row.categoryId === catId ? { ...row, concept: newConcept } : row
        ));
    };

    const handleBlur = async (row) => {
        const currentAmount = parseFloat(row.amount) || 0;
        const originalAmount = parseFloat(row.originalAmount) || 0;

        const conceptChanged = row.concept !== row.originalConcept;
        const amountChanged = currentAmount !== originalAmount;

        if (!conceptChanged && !amountChanged) return; // Nada cambió

        setSavingRows(prev => ({ ...prev, [row.categoryId]: 'saving' }));

        try {
            // Si el moto es 0 y existía, eliminar
            if (currentAmount === 0 && row.expenseId) {
                const res = await fetch(`/.netlify/functions/expenses?id=${row.expenseId}`, {
                    method: 'DELETE', headers: getAuthHeaders()
                });
                if (res.ok) {
                    setGridData(prev => prev.map(r => r.categoryId === row.categoryId ? { ...r, expenseId: null, originalAmount: 0, amount: 0, originalConcept: r.concept } : r));
                }
            }
            // Si no existía y ahora es > 0, Crear (POST)
            else if (currentAmount > 0 && !row.expenseId) {
                const res = await fetch('/.netlify/functions/expenses', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        amount: currentAmount,
                        concept: row.concept,
                        category_id: row.categoryId,
                        date: `${filterMonth}-01`
                    })
                });
                if (res.ok) {
                    const newInc = await res.json();
                    setGridData(prev => prev.map(r => r.categoryId === row.categoryId ? { ...r, expenseId: newInc.id, originalAmount: currentAmount, originalConcept: row.concept } : r));
                }
            }
            // Si existía y es > 0, Actualizar (PUT)
            else if (currentAmount > 0 && row.expenseId) {
                const res = await fetch('/.netlify/functions/expenses', {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        id: row.expenseId,
                        amount: currentAmount,
                        concept: row.concept,
                        category_id: row.categoryId,
                        date: `${filterMonth}-01`
                    })
                });
                if (res.ok) {
                    setGridData(prev => prev.map(r => r.categoryId === row.categoryId ? { ...r, originalAmount: currentAmount, originalConcept: row.concept } : r));
                } else {
                    alert('No tienes permiso para editar este registro.');
                    setGridData(prev => prev.map(r => r.categoryId === row.categoryId ? { ...r, amount: originalAmount, concept: row.originalConcept } : r));
                }
            }

            setSavingRows(prev => ({ ...prev, [row.categoryId]: 'success' }));
            setTimeout(() => {
                setSavingRows(prev => { const n = { ...prev }; delete n[row.categoryId]; return n; });
            }, 2000);

        } catch (err) {
            console.error('Save error', err);
            setSavingRows(prev => ({ ...prev, [row.categoryId]: 'error' }));
            alert('Error guardando los datos.');
        }
    };

    const filteredGrid = gridData.filter(row => row.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));

    const totalMonth = gridData.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Planilla de Ingresos Fijos</h1>
                    <p className="text-slate-500 text-sm mt-1">Haga click en los montos para editar. Se guardará autómaticamente.</p>
                </div>

                <div className="flex bg-white px-2 py-1.5 rounded-xl shadow-sm border border-slate-200">
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="px-3 py-1.5 text-slate-700 bg-transparent outline-none font-medium cursor-pointer"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="col-span-1 md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="relative w-full max-w-sm">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar rubro..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto max-h-[600px] p-0">
                        {loading ? (
                            <div className="p-12 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white shadow-sm z-10">
                                    <tr className="text-xs font-semibold tracking-wide text-slate-500 uppercase border-b border-slate-200">
                                        <th className="px-5 py-3">Rubro / Concepto</th>
                                        <th className="px-5 py-3 w-48 text-right">Monto (S/)</th>
                                        <th className="px-3 py-3 w-12 text-center">Info</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredGrid.map(row => (
                                        <tr key={row.categoryId} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.categoryColor || '#10b981' }}></div>
                                                        <span className="font-semibold text-slate-700 text-sm">{row.categoryName}</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={row.concept}
                                                        onChange={e => handleConceptChange(row.categoryId, e.target.value)}
                                                        onBlur={() => handleBlur(row)}
                                                        className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none transition-colors ml-5 w-full max-w-[200px]"
                                                        placeholder="Añadir nota breve..."
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="relative group/input">
                                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                        <span className="text-slate-400 text-sm font-medium">S/</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={row.amount}
                                                        onChange={e => handleAmountChange(row.categoryId, e.target.value)}
                                                        onBlur={() => handleBlur(row)}
                                                        className={`w-full pl-8 pr-4 py-2 border rounded-lg text-right font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${row.amount > 0 ? 'border-emerald-200 text-emerald-700 bg-emerald-50/30' : 'border-slate-200 text-slate-600'}`}
                                                    />
                                                    {row.amount != row.originalAmount && (
                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white"></div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center align-middle">
                                                {savingRows[row.categoryId] === 'saving' && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin mx-auto" />}
                                                {savingRows[row.categoryId] === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredGrid.length === 0 && (
                                        <tr><td colSpan="3" className="p-8 text-center text-slate-400 text-sm">No se encontraron categorías de ingreso.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Panel Resumen */}
                <div className="col-span-1 space-y-4">
                    <div className="bg-emerald-50 rounded-2xl shadow-sm border border-emerald-100 p-6 flex flex-col items-center justify-center text-center">
                        <p className="text-emerald-700 text-sm font-medium mb-1">Monto Total Estimado</p>
                        <h2 className="text-4xl font-extrabold text-emerald-800">
                            <span className="text-emerald-600/60 font-medium text-2xl mr-1">S/</span>
                            {totalMonth.toFixed(2)}
                        </h2>
                        <p className="text-xs text-emerald-600/80 mt-2">Mes de {new Date(`${filterMonth}-02`).toLocaleString('es', { month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-slate-100 opacity-50">
                            <Save className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-semibold text-slate-700 mb-2">Autoguardado</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Esta planilla guarda los cambios instantáneamente cuando terminas de escribir y haces clic fuera de la celda.
                                Si deseas eliminar un ingreso, simplemente pon el monto en <b>0</b>.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
