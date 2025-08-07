

import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { MaintenanceTask } from '../types';
import { PlusCircle, Trash2, Edit, Save, Wrench, CheckCircle } from 'lucide-react';
import { useAppContext } from '../App';
import { useToast } from './ui/Toast';

export const Maintenance: React.FC = () => {
  const { maintenanceTasks, setMaintenanceTasks } = useAppContext();
  const { showToast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = { equipmentName: '', description: '', frequencyDays: 30, lastCompleted: new Date().toISOString().split('T')[0] };
  const [formData, setFormData] = useState<Omit<MaintenanceTask, 'id'>>(initialFormState);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({...prev, [field]: value}));
  };
  
  const onAdd = (task: Omit<MaintenanceTask, 'id'>) => { setMaintenanceTasks(prev => [...prev, { ...task, id: `task-${Date.now()}` }]); showToast('Tarea añadida', 'success'); };
  const onUpdate = (updatedTask: MaintenanceTask) => { setMaintenanceTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)); showToast('Tarea actualizada', 'success'); };
  const onDelete = (taskId: string) => { setMaintenanceTasks(prev => prev.filter(t => t.id !== taskId)); showToast('Tarea eliminada', 'success'); };


  const handleSave = () => {
    if (!formData.equipmentName || !formData.description || formData.frequencyDays <= 0) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    if (editingId) {
      onUpdate({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      onAdd(formData);
    }
    setFormData(initialFormState);
    setIsAdding(false);
  };
  
  const handleEdit = (task: MaintenanceTask) => {
    setEditingId(task.id);
    setFormData(task);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(initialFormState);
  };
  
  const handleCompleteTask = (task: MaintenanceTask) => {
    if(window.confirm(`¿Confirmas que la tarea "${task.description}" para ${task.equipmentName} ha sido completada hoy?`)) {
        onUpdate({ ...task, lastCompleted: new Date().toISOString().split('T')[0] });
    }
  }

  const getNextDueDate = (lastCompleted: string, frequencyDays: number): { date: Date, isOverdue: boolean, isDueSoon: boolean } => {
    const lastDate = new Date(lastCompleted);
    lastDate.setDate(lastDate.getDate() + frequencyDays);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(lastDate);
    dueDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: dueDate,
      isOverdue: diffDays < 0,
      isDueSoon: diffDays >= 0 && diffDays <= 7,
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center"><Wrench className="mr-2 h-5 w-5"/>Plan de Mantenimiento de Equipos</h2>
          {!isAdding && !editingId && <Button onClick={() => setIsAdding(true)}><PlusCircle className="mr-2 h-4 w-4"/>Nueva Tarea</Button>}
        </div>
        
        {(isAdding || editingId) && (
            <div className="p-4 space-y-4">
                 <h3 className="font-semibold">{editingId ? 'Editando Tarea' : 'Nueva Tarea de Mantenimiento'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><Label>Equipo</Label><Input value={formData.equipmentName} onChange={e => handleInputChange('equipmentName', e.target.value)} placeholder="Horno #1"/></div>
                    <div className="lg:col-span-2"><Label>Descripción de la Tarea</Label><Input value={formData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Limpieza de quemadores"/></div>
                    <div><Label>Frecuencia (días)</Label><Input type="number" value={formData.frequencyDays} onChange={e => handleInputChange('frequencyDays', Number(e.target.value))}/></div>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar Tarea</Button>
                    <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
                </div>
            </div>
        )}
        
        <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Tarea</TableHead><TableHead>Frecuencia</TableHead><TableHead>Última vez</TableHead><TableHead>Próximo Vencimiento</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {maintenanceTasks.map(task => {
                    const { date, isOverdue, isDueSoon } = getNextDueDate(task.lastCompleted, task.frequencyDays);
                    const dueDateString = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                    const statusColor = isOverdue ? 'bg-red-100 dark:bg-red-900/30' : isDueSoon ? 'bg-yellow-50 dark:bg-yellow-400/20' : '';
                    const statusText = isOverdue ? 'text-red-500' : isDueSoon ? 'text-yellow-500' : '';
                  return (
                    <TableRow key={task.id} className={statusColor}>
                      <TableCell className="font-medium">{task.equipmentName}</TableCell>
                      <TableCell>{task.description}</TableCell>
                      <TableCell>{task.frequencyDays} días</TableCell>
                      <TableCell>{new Date(task.lastCompleted).toLocaleDateString()}</TableCell>
                      <TableCell className={`font-semibold ${statusText}`}>{dueDateString}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-1">
                          <Button variant="ghost" size="sm" title="Marcar como completado" onClick={() => handleCompleteTask(task)}><CheckCircle className="h-5 w-5 text-green-500"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}><Edit className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
        </div>
      </Card>
    </div>
  );
};
