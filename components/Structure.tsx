
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { ExpenseItem, Budget } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { PlusCircle, Trash2, Info, Banknote, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, FolderCog } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis } from 'recharts';
import { KpiCard } from './KpiCard';
import { useAppContext } from '../App';
import { useToast } from './ui/Toast';
import { CategoryManagementModal } from './ui/CategoryManagementModal';

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#f97316', '#22c55e', '#dc2626'];

interface ExpenseCategoryCardProps {
  category: string,
  items: ExpenseItem[],
  budget: Budget | undefined,
  currentDate: Date,
}

const ExpenseCategoryCard: React.FC<ExpenseCategoryCardProps> = ({ category, items, budget, currentDate }) => {
    const { setExpenses, setBudgets } = useAppContext();
    const { showToast } = useToast();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [type, setType] = useState<'fixed' | 'variable'>('variable');
    const monthYear = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const isReadOnly = category === 'Salarios' || category === 'Proveedores';

    const onAdd = (expense: Omit<ExpenseItem, 'id'>) => { setExpenses(prev => [...prev, { ...expense, id: `exp-${Date.now()}` }]); showToast('Gasto añadido', 'success'); };
    const onUpdate = (updatedExpense: ExpenseItem) => { setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e)); showToast('Gasto actualizado', 'info'); };
    const onDelete = (expenseId: string) => { setExpenses(prev => prev.filter(exp => exp.id !== expenseId)); showToast('Gasto eliminado', 'success'); };
    const onUpdateBudget = (budget: Budget) => { setBudgets(prev => { const existingIndex = prev.findIndex(b => b.id === budget.id); if (existingIndex > -1) { const newBudgets = [...prev]; newBudgets[existingIndex] = budget; return newBudgets; } return [...prev, budget]; }); showToast('Presupuesto actualizado', 'success'); };

    const handleAdd = () => {
        if (description && typeof amount === 'number' && amount > 0) {
            onAdd({ category, description, amount, type, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString().split('T')[0] });
            setDescription(''); setAmount(''); setType('variable');
        } else { alert('Por favor, ingresa una descripción y un monto válido.'); }
    };
    
    const handleFieldChange = (item: ExpenseItem, field: keyof ExpenseItem, value: string | number) => {
        onUpdate({ ...item, [field]: value });
    };

    const handleBudgetChange = (amount: number) => {
        onUpdateBudget({ id: `${monthYear}-${category}`, monthYear, category, amount });
    };

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const budgetAmount = budget?.amount || 0;
    const budgetProgress = budgetAmount > 0 ? (total / budgetAmount) * 100 : 0;

    const getReadOnlyMessage = () => {
        if (category === 'Salarios') return "El costo de salarios se calcula desde Recursos Humanos.";
        if (category === 'Proveedores') return "Los costos de proveedores se registran desde Gestión de Proveedores.";
        return "";
    };

    const groupedBySupplier = useMemo(() => {
        if (category !== 'Proveedores') return null;
        return items.reduce((acc, item) => {
            if (item.supplierName) acc[item.supplierName] = (acc[item.supplierName] || 0) + item.amount;
            return acc;
        }, {} as Record<string, number>);
    }, [items, category]);

    return (
        <Card>
            <div className="p-4">
                <h3 className="text-lg font-bold">{category}</h3>
                <div className="flex justify-between items-baseline"><span className="text-2xl font-bold text-gray-800 dark:text-gray-100">${total.toFixed(2)}</span>{budgetAmount > 0 && <span className="text-sm text-gray-500">de ${budgetAmount.toFixed(2)}</span>}</div>
                {budgetAmount > 0 && (<div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div></div>)}
            </div>
            <div className="p-4 border-t dark:border-gray-700"><Label>Presupuesto Mensual</Label><Input type="number" defaultValue={budgetAmount > 0 ? budgetAmount : ''} onBlur={(e) => handleBudgetChange(Number(e.target.value))} placeholder="Establecer presupuesto" /></div>
            <div className="overflow-x-auto max-h-60">
                {category === 'Proveedores' && groupedBySupplier ? (
                    <Table><TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead className="text-right">Monto Total</TableHead></TableRow></TableHeader><TableBody>{Object.entries(groupedBySupplier).map(([supplierName, totalAmount]) => (<TableRow key={supplierName}><TableCell className="font-medium">{supplierName}</TableCell><TableCell className="text-right">${totalAmount.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table>
                ) : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Monto</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell><Input defaultValue={item.description} onBlur={(e) => handleFieldChange(item, 'description', e.target.value)} className="h-8" disabled={isReadOnly || !!item.sourceDocumentId} title={isReadOnly ? getReadOnlyMessage() : ''} /></TableCell>
                                    <TableCell><select value={item.type} onChange={e => handleFieldChange(item, 'type', e.target.value)} className="h-8 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent" disabled={isReadOnly || !!item.sourceDocumentId}><option value="fixed">Fijo</option><option value="variable">Variable</option></select></TableCell>
                                    <TableCell className="text-right"><Input type="number" defaultValue={item.amount.toFixed(2)} onBlur={(e) => handleFieldChange(item, 'amount', parseFloat(e.target.value) || 0)} className="w-28 h-8 text-right" disabled={isReadOnly || !!item.sourceDocumentId} title={isReadOnly ? getReadOnlyMessage() : ''} /></TableCell>
                                    <TableCell><Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} disabled={isReadOnly || !!item.sourceDocumentId}><Trash2 className="h-4 w-4 text-red-500"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
            {isReadOnly ? (
                <div className="p-4 border-t dark:border-gray-700 text-sm text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2"><Info className="h-4 w-4 flex-shrink-0" /><span><strong>{getReadOnlyMessage()}</strong></span></div>
            ) : (
                <div className="p-4 border-t dark:border-gray-700 flex items-end gap-2"><div className="flex-grow"><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Nueva Descripción"/></div><div className="w-24"><Input type="number" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Monto"/></div><Button onClick={handleAdd} size="sm"><PlusCircle className="h-4 w-4"/></Button></div>
            )}
        </Card>
    )
}

export const Structure: React.FC = () => {
    const { expenses, setExpenses, budgets, setBudgets, expenseCategories, setExpenseCategories, suppliers } = useAppContext();
    const { showToast } = useToast();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);

    const onAddCategory = (newCategory: string) => { setExpenseCategories(prev => [...prev, newCategory].sort()); showToast('Categoría añadida', 'success'); };
    const onUpdateCategory = (oldName: string, newName: string) => { setExpenseCategories(prev => prev.map(c => c === oldName ? newName : c)); setExpenses(prev => prev.map(exp => exp.category === oldName ? { ...exp, category: newName } : exp)); setBudgets(prev => prev.map(b => b.category === oldName ? { ...b, category: newName, id: `${b.monthYear}-${newName}` } : b)); showToast('Categoría actualizada', 'success'); };
    const onDeleteCategory = (categoryToDelete: string) => { if(window.confirm(`¿Seguro que quieres eliminar la categoría "${categoryToDelete}"?`)) { setExpenseCategories(prev => prev.filter(c => c !== categoryToDelete)); showToast('Categoría eliminada', 'success'); } };

    const checkCategoryUsage = (category: string) => {
        return expenses.some(e => e.category === category) || budgets.some(b => b.category === category) || suppliers.some(s => s.documents.some(d => d.expenseCategory === category)) ? 1 : 0;
    };

    const expensesForMonth = useMemo(() => expenses.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth(); }), [expenses, currentDate]);
    
    const kpis = useMemo(() => {
        const total = expensesForMonth.reduce((sum, e) => sum + e.amount, 0);
        const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevMonthExpenses = expenses.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth(); });
        const prevMonthTotal = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const change = total - prevMonthTotal;
        const percentageChange = prevMonthTotal > 0 ? (change / prevMonthTotal) * 100 : total > 0 ? Infinity : 0;
        const dailyAvg = total > 0 ? total / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() : 0;
        const grouped = expensesForMonth.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>);
        const topCategory = Object.entries(grouped).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
        return { total, percentageChange, dailyAvg, topCategory, change };
    }, [expensesForMonth, expenses, currentDate]);

    const donutChartData = useMemo(() => { const grouped = expensesForMonth.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>); return Object.entries(grouped).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })); }, [expensesForMonth]);
    const lineChartData = useMemo(() => {
        const data = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthStr = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            const monthExpenses = expenses.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth(); });
            const totalCost = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
            data.push({ month: monthStr, "Costo Total": parseFloat(totalCost.toFixed(2)) });
        }
        return data;
    }, [expenses, currentDate]);

    const handleMonthChange = (offset: number) => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    const groupedExpenses = expensesForMonth.reduce((acc, expense) => { (acc[expense.category] = acc[expense.category] || []).push(expense); return acc; }, {} as Record<string, ExpenseItem[]>);
    const monthYear = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6">
        <CategoryManagementModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Gestionar Categorías de Gasto" categories={expenseCategories} itemUsageCheck={checkCategoryUsage} onAddCategory={onAddCategory} onUpdateCategory={onUpdateCategory} onDeleteCategory={onDeleteCategory} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold flex items-center"><Banknote className="mr-2 h-6 w-6 text-indigo-500" />Estructura de Costos</h2>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" onClick={() => setCategoryModalOpen(true)}><FolderCog className="mr-2 h-4 w-4" /> Gestionar Categorías</Button>
                <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg"><Button variant="ghost" size="sm" onClick={() => handleMonthChange(-1)}><ChevronLeft className="h-5 w-5"/></Button><span className="font-semibold w-36 text-center capitalize">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span><Button variant="ghost" size="sm" onClick={() => handleMonthChange(1)}><ChevronRight className="h-5 w-5"/></Button></div>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><KpiCard title="Costo Total del Mes" value={`$${kpis.total.toFixed(2)}`} icon={DollarSign} /><KpiCard title="% vs. Mes Anterior" value={isFinite(kpis.percentageChange) ? `${kpis.percentageChange.toFixed(1)}%` : 'N/A'} icon={kpis.change >= 0 ? TrendingUp : TrendingDown} changeType={kpis.change === 0 ? undefined : kpis.change > 0 ? 'increase' : 'decrease'} /><KpiCard title="Costo Promedio Diario" value={`$${kpis.dailyAvg.toFixed(2)}`} icon={DollarSign} /><KpiCard title="Categoría de Mayor Gasto" value={kpis.topCategory} icon={Banknote}/></div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3 p-4"><h3 className="text-lg font-semibold mb-4">Evolución de Costos Mensuales</h3><ResponsiveContainer width="100%" height={300}><LineChart data={lineChartData}><XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value/1000}k`} /><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}/><Legend /><Line type="monotone" dataKey="Costo Total" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></Card>
             <Card className="lg:col-span-2 p-4"><h3 className="text-lg font-semibold mb-4">Distribución de Costos ({currentDate.toLocaleString('es-ES', { month: 'long' })})</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={donutChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{donutChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', borderRadius: '0.5rem', color: '#fff' }}/><Legend /></PieChart></ResponsiveContainer></Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{expenseCategories.map(category => (<ExpenseCategoryCard key={category} category={category} items={groupedExpenses[category] || []} budget={budgets.find(b => b.monthYear === monthYear && b.category === category)} currentDate={currentDate} />))}</div>
    </div>
  );
};
