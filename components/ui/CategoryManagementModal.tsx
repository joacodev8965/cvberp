
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { Label } from './Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { PlusCircle, Save, X, Pencil, Trash2 } from 'lucide-react';

interface CategoryManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    categories: string[];
    itemUsageCheck: (category: string) => number;
    onUpdateCategory: (oldName: string, newName: string) => void;
    onAddCategory: (newName: string) => void;
    onDeleteCategory: (category: string) => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
    isOpen,
    onClose,
    title,
    categories,
    itemUsageCheck,
    onUpdateCategory,
    onAddCategory,
    onDeleteCategory,
}) => {
    const [editingCategory, setEditingCategory] = useState<{ oldName: string; newName: string } | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    if (!isOpen) return null;

    const handleSaveRename = () => {
        if (editingCategory && editingCategory.newName.trim()) {
            onUpdateCategory(editingCategory.oldName, editingCategory.newName.trim());
            setEditingCategory(null);
        }
    };

    const handleAddClick = () => {
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName);
            setNewCategoryName('');
        }
    };
    
    const isReadOnly = (category: string) => ['Salarios', 'Proveedores'].includes(category);

    return (
        <Modal title={title} onClose={onClose} size="2xl">
            <div className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-center">Uso</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {categories.map(category => {
                                const usageCount = itemUsageCheck(category);
                                const isBeingEdited = editingCategory?.oldName === category;

                                return (
                                    <TableRow key={category}>
                                        <TableCell>
                                            {isBeingEdited ? (
                                                <Input
                                                    value={editingCategory.newName}
                                                    onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                                                />
                                            ) : ( <span className="font-medium">{category}</span> )}
                                        </TableCell>
                                        <TableCell className="text-center">{usageCount}</TableCell>
                                        <TableCell className="text-center">
                                            {isReadOnly(category) ? (
                                                <span className="text-xs text-gray-500">Automática</span>
                                            ) : isBeingEdited ? (
                                                <div className="flex justify-center gap-2">
                                                    <Button size="sm" onClick={handleSaveRename}><Save className="h-4 w-4"/></Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingCategory({ oldName: category, newName: category })}><Pencil className="h-4 w-4"/></Button>
                                                    <Button
                                                        variant="ghost" size="sm" disabled={usageCount > 0}
                                                        title={usageCount > 0 ? "No se puede eliminar una categoría en uso." : "Eliminar"}
                                                        onClick={() => onDeleteCategory(category)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex items-end gap-2 mt-auto flex-shrink-0">
                    <div className="flex-grow">
                        <Label htmlFor="newCategoryName">Nueva Categoría</Label>
                        <Input
                            id="newCategoryName" value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="Nombre de la nueva categoría"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddClick(); }}
                        />
                    </div>
                    <Button onClick={handleAddClick}><PlusCircle className="mr-2 h-4 w-4"/> Crear</Button>
                </div>
            </div>
        </Modal>
    );
};
