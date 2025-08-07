import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Ingredient, Supplier } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { PlusCircle, Trash2, Edit, Save, Package, Search } from 'lucide-react';
import { useAppContext } from '../App';

const initialFormState = { name: '', unit: '', purchaseUnit: '', unitsPerPackage: '', minStock: '', maxStock: '' };

const IngredientSuppliers: React.FC<{ ingredient: Ingredient, suppliers: Supplier[] }> = ({ ingredient, suppliers }) => {
    const suppliersOfIngredient = suppliers.filter(supplier => 
        ingredient.priceHistory.some(ph => ph.supplierId === supplier.id)
    ).map(supplier => {
        const latestPriceHistory = [...ingredient.priceHistory]
            .filter(ph => ph.supplierId === supplier.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return {
            supplierName: supplier.name,
            lastCost: latestPriceHistory.cost,
            lastDate: latestPriceHistory.date,
        };
    });

    if (suppliersOfIngredient.length === 0) {
        return <p className="text-sm text-gray-500 px-4 pb-4">Este insumo aún no ha sido comprado a ningún proveedor.</p>;
    }

    return (
        <div className="px-4 pb-4">
            <h4 className="text-md font-semibold mb-2">Proveedores de este Insumo</h4>
            <Table>
                <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead className="text-right">Último Costo</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
                <TableBody>
                    {suppliersOfIngredient.map(s => (
                        <TableRow key={s.supplierName}>
                            <TableCell>{s.supplierName}</TableCell>
                            <TableCell className="text-right font-medium">${s.lastCost.toFixed(2)}</TableCell>
                            <TableCell>{new Date(s.lastDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export const IngredientManagement: React.FC = () => {
    const { ingredients, suppliers, addIngredient, updateIngredient, deleteIngredient, getLatestIngredientCost } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [formData, setFormData] = useState<{name: string, unit: string, purchaseUnit: string, unitsPerPackage: string | number, minStock: string | number, maxStock: string | number}>(initialFormState);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [ingredients, searchQuery]);

    const handleEdit = (ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setFormData({ 
            name: ingredient.name, 
            unit: ingredient.unit,
            purchaseUnit: ingredient.purchaseUnit || '',
            unitsPerPackage: ingredient.unitsPerPackage || '',
            minStock: ingredient.minStock || '',
            maxStock: ingredient.maxStock || ''
        });
        setIsAdding(false);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingIngredient(null);
        setFormData(initialFormState);
    };

    const handleSave = () => {
        if (!formData.name || !formData.unit) {
            alert('Nombre y unidad son obligatorios.');
            return;
        }
        
        const unitsPerPackageNumber = formData.unitsPerPackage ? parseInt(String(formData.unitsPerPackage), 10) : undefined;
        const purchaseUnitValue = formData.purchaseUnit || undefined;
        const minStock = formData.minStock ? parseInt(String(formData.minStock), 10) : undefined;
        const maxStock = formData.maxStock ? parseInt(String(formData.maxStock), 10) : undefined;

        if (editingIngredient) {
            updateIngredient({ 
                ...editingIngredient, 
                name: formData.name, 
                unit: formData.unit,
                purchaseUnit: purchaseUnitValue,
                unitsPerPackage: unitsPerPackageNumber,
                minStock,
                maxStock
            });
        } else {
            addIngredient({ 
                name: formData.name,
                unit: formData.unit,
                purchaseUnit: purchaseUnitValue,
                unitsPerPackage: unitsPerPackageNumber,
                minStock,
                maxStock
            });
        }
        handleCancel();
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center"><Package className="mr-2 h-5 w-5"/>Gestión de Insumos</h2>
                    {!isAdding && !editingIngredient && (
                        <Button onClick={() => { setIsAdding(true); setEditingIngredient(null); setFormData(initialFormState);}}>
                            <PlusCircle className="mr-2 h-4 w-4"/>Añadir Insumo
                        </Button>
                    )}
                </div>

                {(isAdding || editingIngredient) && (
                    <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-semibold">{editingIngredient ? 'Editando Insumo' : 'Nuevo Insumo'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label htmlFor="ingName">Nombre</Label><Input id="ingName" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Harina 0000"/></div>
                            <div><Label htmlFor="ingUnit">Unidad de Stock</Label><Input id="ingUnit" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Ej: kg, litro, unidad"/></div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="ingPurchaseUnit">Unidad de Compra (Opcional)</Label>
                                <Input id="ingPurchaseUnit" value={formData.purchaseUnit} onChange={e => setFormData({...formData, purchaseUnit: e.target.value})} placeholder="Ej: Caja, Pack, Bolsa"/>
                            </div>
                            <div>
                                <Label htmlFor="ingUnitsPerPackage">Unidades por Paquete (Opcional)</Label>
                                <Input id="ingUnitsPerPackage" type="number" value={formData.unitsPerPackage} onChange={e => setFormData({...formData, unitsPerPackage: e.target.value})} placeholder="Ej: 6"/>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="ingMinStock">Stock Mínimo (Alerta)</Label>
                                <Input id="ingMinStock" type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="Ej: 10"/>
                            </div>
                             <div>
                                <Label htmlFor="ingMaxStock">Stock Máximo (Opcional)</Label>
                                <Input id="ingMaxStock" type="number" value={formData.maxStock} onChange={e => setFormData({...formData, maxStock: e.target.value})} placeholder="Ej: 100"/>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar</Button>
                            <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
                        </div>
                        {editingIngredient && <IngredientSuppliers ingredient={editingIngredient} suppliers={suppliers} />}
                    </div>
                )}
                
                <div className="p-4 border-t dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <Input 
                            placeholder="Buscar insumo por nombre..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 w-full sm:w-72"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Unidad Stock</TableHead>
                                <TableHead>Unidad Compra</TableHead>
                                <TableHead className="text-right">Último Costo</TableHead>
                                <TableHead className="text-right">Stock Actual</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredIngredients.map(ing => (
                                <TableRow key={ing.id}>
                                    <TableCell className="font-medium">{ing.name}</TableCell>
                                    <TableCell>{ing.unit}</TableCell>
                                    <TableCell>{ing.purchaseUnit ? `${ing.purchaseUnit} (${ing.unitsPerPackage} ${ing.unit}s)` : '-'}</TableCell>
                                    <TableCell className="text-right">${getLatestIngredientCost(ing).toFixed(2)} / {ing.unit}</TableCell>
                                    <TableCell className="text-right font-semibold">{ing.quantityInStock.toLocaleString()}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(ing)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteIngredient(ing.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};