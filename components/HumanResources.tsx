import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Employee, EmployeeDocument, HRSettings, Payroll, EmployeePayroll, PayrollAdjustment } from '../types';
import { Briefcase, PlusCircle, Trash2, Edit, Save, FileText, UserPlus, Search, Download, Edit2, Eye, Upload } from 'lucide-react';
import { useAppContext } from '../App';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { toBase64, base64ToBlob } from '../services/fileUtils';

// --- Add/Edit Employee Modal (Moved to top-level) ---
const EmployeeModal: React.FC<{
    employee?: Employee;
    onSave: (employee: Omit<Employee, 'id'> | Employee) => void;
    onClose: () => void;
}> = ({ employee, onSave, onClose }) => {
    const { employeeCategories } = useAppContext();
    const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
        name: employee?.name || '', category: employee?.category || '',
        netSalary: employee?.netSalary || 0, nonTaxableBonus: employee?.nonTaxableBonus || 0,
        registeredPercentage: employee?.registeredPercentage || 80, documents: employee?.documents || []
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const content = await toBase64(file);
            const newDoc: EmployeeDocument = { id: `doc-${Date.now()}`, fileName: file.name, fileType: file.type, uploadDate: new Date().toISOString(), content };
            setFormData(prev => ({ ...prev, documents: [...prev.documents, newDoc]}));
        }
    };
    
    const handleDeleteDocument = (docId: string) => setFormData(prev => ({...prev, documents: prev.documents.filter(d => d.id !== docId)}));
    const handleViewDocument = (doc: EmployeeDocument) => window.open(URL.createObjectURL(base64ToBlob(doc.content, doc.fileType)), '_blank');

    const handleSave = () => {
        if (!formData.name || !formData.category) { alert('Nombre y categoría son obligatorios.'); return; }
        onSave(employee ? { ...employee, ...formData } : formData);
        onClose();
    };

    return (
        <Modal title={employee ? 'Editar Empleado' : 'Añadir Empleado'} onClose={onClose} size="2xl">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Nombre Completo</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div><Label>Categoría</Label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="">Seleccionar...</option>{employeeCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Salario Neto</Label><Input type="number" value={formData.netSalary} onChange={e => setFormData({ ...formData, netSalary: Number(e.target.value) })} /></div>
                    <div><Label>Bonos No Remunerativos</Label><Input type="number" value={formData.nonTaxableBonus} onChange={e => setFormData({ ...formData, nonTaxableBonus: Number(e.target.value) })} /></div>
                    <div><Label>% Sueldo Registrado</Label><Input type="number" min="0" max="100" value={formData.registeredPercentage} onChange={e => setFormData({ ...formData, registeredPercentage: Number(e.target.value) })} /></div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Legajo Digital</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded-md dark:border-gray-600">
                       {formData.documents.map(doc => (<div key={doc.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"><p className="text-sm truncate">{doc.fileName}</p><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}><Eye className="h-4 w-4"/></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div></div>))}
                       {formData.documents.length === 0 && <p className="text-sm text-center text-gray-500 py-4">No hay documentos.</p>}
                    </div>
                     <Label htmlFor="doc-upload" className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"><Upload className="mr-2 h-4 w-4"/>Subir Documento</Label>
                    <input id="doc-upload" type="file" className="sr-only" onChange={handleFileChange} />
                </div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar</Button></div>
            </div>
        </Modal>
    );
};

// --- Adjustment Modal (Moved to top-level) ---
const AdjustmentModal: React.FC<{
    employee: Employee;
    payroll: EmployeePayroll;
    onSave: (adjustments: PayrollAdjustment[]) => void;
    onClose: () => void;
}> = ({ employee, payroll, onSave, onClose }) => {
    const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>(payroll.adjustments);
    const [newAdjustment, setNewAdjustment] = useState({ type: 'addition', description: '', amount: '' });

    const handleAdd = () => {
        if (!newAdjustment.description || !newAdjustment.amount) return;
        const newAdj: PayrollAdjustment = { id: `adj-${Date.now()}`, type: newAdjustment.type as 'addition' | 'deduction', description: newAdjustment.description, amount: parseFloat(newAdjustment.amount) };
        setAdjustments(prev => [...prev, newAdj]);
        setNewAdjustment({ type: 'addition', description: '', amount: '' });
    };

    const handleDelete = (id: string) => setAdjustments(prev => prev.filter(a => a.id !== id));
    const handleSave = () => { onSave(adjustments); onClose(); };

    return (
        <Modal title={`Novedades de ${employee.name}`} onClose={onClose} size="lg">
            <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-2">{adjustments.map(adj => (<div key={adj.id} className={`flex justify-between items-center p-2 rounded ${adj.type === 'addition' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}><div><p className="font-medium">{adj.description}</p><p className="text-xs text-gray-500">{adj.type === 'addition' ? 'Adicional' : 'Deducción'}</p></div><div className="flex items-center gap-2"><span className="font-bold">${adj.amount.toFixed(2)}</span><Button variant="ghost" size="sm" onClick={() => handleDelete(adj.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div>))}</div>
                <div className="p-4 border-t dark:border-gray-700 flex items-end gap-2"><div className="flex-grow"><Label>Descripción</Label><Input value={newAdjustment.description} onChange={e => setNewAdjustment(p => ({ ...p, description: e.target.value }))} /></div><div className="w-32"><Label>Monto</Label><Input type="number" value={newAdjustment.amount} onChange={e => setNewAdjustment(p => ({ ...p, amount: e.target.value }))} /></div><div className="w-32"><Label>Tipo</Label><select value={newAdjustment.type} onChange={e => setNewAdjustment(p => ({ ...p, type: e.target.value }))} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="addition">Adicional</option><option value="deduction">Deducción</option></select></div><Button onClick={handleAdd}><PlusCircle className="h-4 w-4" /></Button></div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>Guardar Novedades</Button></div>
            </div>
        </Modal>
    );
};

type ActiveTab = 'payroll' | 'personnel';

export const HumanResources: React.FC = () => {
    const { employees, setEmployees, employeeCategories, setEmployeeCategories, hrSettings: settings, setHrSettings, payrolls, setPayrolls, updateEmployee } = useAppContext();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<ActiveTab>('payroll');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editingPayrollFor, setEditingPayrollFor] = useState<Employee | null>(null);

    const onAddEmployee = (employee: Omit<Employee, 'id'>) => { setEmployees(prev => [...prev, { ...employee, id: `emp-${Date.now()}` }]); showToast('Empleado añadido', 'success'); };
    const onDeleteEmployee = (employeeId: string) => { if (window.confirm('¿Estás seguro?')) { setEmployees(prev => prev.filter(e => e.id !== employeeId)); showToast('Empleado eliminado', 'success'); }};
    const onUpdatePayroll = (payroll: Payroll) => { setPayrolls(prev => { const idx = prev.findIndex(p => p.monthYear === payroll.monthYear); if (idx > -1) { const newPayrolls = [...prev]; newPayrolls[idx] = payroll; return newPayrolls; } return [...prev, payroll]; }); };

    const selectedMonthYear = useMemo(() => `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`, [selectedYear, selectedMonth]);
    
    const calculateEmployeePayroll = (employee: Employee, adjustments: PayrollAdjustment[]): EmployeePayroll => {
        const totalAdditions = adjustments.filter(a => a.type === 'addition').reduce((sum, a) => sum + a.amount, 0);
        const totalDeductions = adjustments.filter(a => a.type === 'deduction').reduce((sum, a) => sum + a.amount, 0);
        const grossPay = employee.netSalary + employee.nonTaxableBonus + totalAdditions - totalDeductions;
        const registeredSalaryPortion = employee.netSalary * (employee.registeredPercentage / 100);
        const withholdings = registeredSalaryPortion * (settings.employeeWithholdingPercentage / 100);
        const netPay = grossPay - withholdings;
        const employerContributions = registeredSalaryPortion * (settings.socialContributionsPercentage / 100);
        const totalLaborCost = grossPay + employerContributions;
        return { employeeId: employee.id, baseSalary: employee.netSalary, nonTaxableBonus: employee.nonTaxableBonus, registeredPercentage: employee.registeredPercentage, adjustments, grossPay, withholdings, netPay, employerContributions, totalLaborCost };
    };

    const currentPayroll = useMemo<Payroll>(() => {
        const existing = payrolls.find(p => p.monthYear === selectedMonthYear);
        const activeEmployeeIds = new Set(employees.map(e => e.id));
        if (existing) {
             const updatedPayrolls = existing.employeePayrolls.filter(ep => activeEmployeeIds.has(ep.employeeId));
             const newEmployees = employees.filter(emp => !updatedPayrolls.some(ep => ep.employeeId === emp.id));
             const newPayrolls = newEmployees.map(emp => calculateEmployeePayroll(emp, []));
             return { ...existing, employeePayrolls: [...updatedPayrolls, ...newPayrolls]};
        }
        return { monthYear: selectedMonthYear, employeePayrolls: employees.map(emp => calculateEmployeePayroll(emp, [])) };
    }, [selectedMonthYear, payrolls, employees, settings]);

    const handleSaveAdjustments = (employeeId: string, adjustments: PayrollAdjustment[]) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) return;
        const newEmployeePayroll = calculateEmployeePayroll(employee, adjustments);
        const updatedPayroll: Payroll = { ...currentPayroll, employeePayrolls: currentPayroll.employeePayrolls.map(ep => ep.employeeId === employeeId ? newEmployeePayroll : ep), };
        onUpdatePayroll(updatedPayroll);
    };
    
    const handleSaveEmployee = (employeeData: Omit<Employee, 'id'> | Employee) => {
        if ('id' in employeeData) updateEmployee(employeeData);
        else onAddEmployee(employeeData);
    };
    
    const handleEditEmployee = (employee: Employee) => { setEditingEmployee(employee); setEmployeeModalOpen(true); };
    
    const handleExport = () => {
        const dataToExport = currentPayroll.employeePayrolls.map(ep => {
            const employee = employees.find(emp => emp.id === ep.employeeId);
            const additions = ep.adjustments.filter(a => a.type === 'addition').reduce((s, a) => s + a.amount, 0);
            const deductions = ep.adjustments.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0);
            return {
                "Empleado": employee?.name || 'N/A',
                "Categoría": employee?.category || 'N/A',
                "Salario Neto Base": ep.baseSalary,
                "Adicionales": additions,
                "Deducciones": deductions,
                "Sueldo Bruto": ep.grossPay,
                "Retenciones Empleado": ep.withholdings,
                "Sueldo Neto a Pagar": ep.netPay,
                "Cargas Sociales Empleador": ep.employerContributions,
                "Costo Laboral Total": ep.totalLaborCost,
            };
        });

        const totalRow = {
            "Empleado": "TOTALES",
            "Categoría": "",
            ...Object.keys(dataToExport[0] || {}).slice(2).reduce((acc, key) => {
                acc[key] = dataToExport.reduce((sum, row) => sum + (row[key as keyof typeof row] as number), 0);
                return acc;
            }, {} as Record<string, number>)
        };
        
        const exportData = [...dataToExport, totalRow];
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{wch: 25}, {wch: 15}, {wch:15}, {wch:12}, {wch:12}, {wch:15}, {wch:15}, {wch:18}, {wch:20}, {wch:20}];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Liquidacion ${selectedMonthYear}`);
        XLSX.writeFile(wb, `Liquidacion_Sueldos_${selectedMonthYear}.xlsx`);
    };

    const filteredEmployees = useMemo(() => employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())), [employees, searchQuery]);
    const totalLaborCost = useMemo(() => currentPayroll.employeePayrolls.reduce((sum, ep) => sum + ep.totalLaborCost, 0), [currentPayroll]);

    return (
        <div className="space-y-6">
            {isEmployeeModalOpen && <EmployeeModal employee={editingEmployee || undefined} onClose={() => { setEmployeeModalOpen(false); setEditingEmployee(null); }} onSave={handleSaveEmployee} />}
            {editingPayrollFor && <AdjustmentModal employee={editingPayrollFor} payroll={currentPayroll.employeePayrolls.find(ep => ep.employeeId === editingPayrollFor.id)!} onClose={() => setEditingPayrollFor(null)} onSave={(adjustments) => handleSaveAdjustments(editingPayrollFor.id, adjustments)}/>}
            <h2 className="text-2xl font-bold flex items-center"><Briefcase className="mr-2 h-6 w-6 text-indigo-500" />Recursos Humanos</h2>
            <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-8" aria-label="Tabs"><button onClick={() => setActiveTab('payroll')} className={`${activeTab === 'payroll' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Liquidación de Sueldos</button><button onClick={() => setActiveTab('personnel')} className={`${activeTab === 'personnel' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Gestión de Personal</button></nav></div>
            {activeTab === 'payroll' && (<> {employees.length > 0 ? (<Card><div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"><div><h3 className="text-lg font-bold">Liquidación de Sueldos</h3><p className="text-sm text-gray-500">Calcula y guarda la nómina mensual.</p></div><div className="flex items-center gap-2"><select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="h-10 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"><option value="" disabled>Mes</option>{Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-ES', {month: 'long'})}</option>)}</select><Input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-24" /></div><div className="text-right"><p className="text-sm text-gray-500">Costo Mensual Total</p><p className="text-2xl font-bold">${totalLaborCost.toFixed(2)}</p></div></div><div className="p-4 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="flex items-center gap-2 w-full sm:w-auto"><div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/><Input placeholder="Buscar empleado..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9"/></div></div><Button onClick={handleExport}><Download className="mr-2 h-4 w-4" />Exportar Liquidación</Button></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead className="text-right">Sueldo Bruto</TableHead><TableHead className="text-right">Retenciones</TableHead><TableHead className="text-right">Neto a Pagar</TableHead><TableHead className="text-right">Costo Total</TableHead><TableHead className="text-center">Novedades</TableHead></TableRow></TableHeader><TableBody>{filteredEmployees.map(employee => { const payrollData = currentPayroll.employeePayrolls.find(ep => ep.employeeId === employee.id); if (!payrollData) return null; return (<TableRow key={employee.id}><TableCell className="font-medium">{employee.name}</TableCell><TableCell className="text-right">${payrollData.grossPay.toFixed(2)}</TableCell><TableCell className="text-right text-red-500">(${payrollData.withholdings.toFixed(2)})</TableCell><TableCell className="text-right font-bold text-green-600">${payrollData.netPay.toFixed(2)}</TableCell><TableCell className="text-right font-semibold">${payrollData.totalLaborCost.toFixed(2)}</TableCell><TableCell className="text-center"><Button variant="ghost" size="sm" onClick={() => setEditingPayrollFor(employee)}><Edit2 className="h-4 w-4" /> {payrollData.adjustments.length > 0 && `(${payrollData.adjustments.length})`}</Button></TableCell></TableRow>);})}</TableBody></Table></div></Card>) : (<Card className="text-center p-8"><h3 className="text-lg font-semibold">No hay empleados en la nómina</h3><p className="mt-2 text-gray-500">Para comenzar a liquidar sueldos, primero debes añadir empleados a tu sistema.</p><Button onClick={() => setActiveTab('personnel')} className="mt-4">Ir a Gestión de Personal</Button></Card>)} </>)}
            {activeTab === 'personnel' && (<div className="space-y-6"><Card><div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4"><h3 className="text-lg font-bold">Gestión de Personal</h3><div className="flex items-center gap-2 w-full sm:w-auto"><div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/><Input placeholder="Buscar empleado..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9"/></div><Button onClick={() => { setEditingEmployee(null); setEmployeeModalOpen(true); }}><UserPlus className="mr-2 h-4 w-4" />Añadir</Button></div></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Salario Neto</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader><TableBody>{filteredEmployees.map(emp => (<TableRow key={emp.id}><TableCell className="font-medium">{emp.name}</TableCell><TableCell>{emp.category}</TableCell><TableCell className="text-right">${emp.netSalary.toFixed(2)}</TableCell><TableCell className="text-center"><div className="flex justify-center gap-2"><Button variant="ghost" size="sm" onClick={() => handleEditEmployee(emp)}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="sm" onClick={() => onDeleteEmployee(emp.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div></TableCell></TableRow>))}</TableBody></Table></div></Card><Card><div className="p-4"><h3 className="text-lg font-bold">Configuración de RRHH</h3></div><div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-700"><div><Label>% Cargas Sociales (Empleador)</Label><Input type="number" value={settings.socialContributionsPercentage} onChange={e => setHrSettings({...settings, socialContributionsPercentage: Number(e.target.value)})}/></div><div><Label>% Retenciones (Empleado)</Label><Input type="number" value={settings.employeeWithholdingPercentage} onChange={e => setHrSettings({...settings, employeeWithholdingPercentage: Number(e.target.value)})}/></div></div></Card></div>)}
        </div>
    );
};
