import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { SKU, Supplier } from '../types';
import { Button } from './ui/Button';
import { Trash2, Pencil, PlusCircle, Save, FolderCog, ClipboardPen, ShoppingBag, Search } from 'lucide-react';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Modal } from './ui/Modal';
import { CategoryManagementModal } from './ui/CategoryManagementModal';
import { RecipeCalculator } from './RecipeCalculator';
import { useAppContext } from '../App';
import { useToast } from './ui/Toast';

const AddPurchasedSkuForm: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const { skuCategories, addSku } = useAppContext();
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [salePrice, setSalePrice] = useState(0);
    const [purchaseUnit, setPurchaseUnit] = useState('');
    const [unitsPerPackage, setUnitsPerPackage] = useState('');

    const handleSave = () => {
        if (!name || !category || salePrice <= 0) {
            alert('Nombre, categoría y precio de venta son obligatorios.');
            return;
        }
        addSku({ name, category, salePrice, purchaseUnit: purchaseUnit || undefined, unitsPerPackage: unitsPerPackage ? parseInt(unitsPerPackage, 10) : undefined, recipe: [], wastageFactor: 0, laborCost: 0, overheadCost: 0, franchiseFee: 0 });
        onClose();
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="skuName">Nombre del Producto</Label><Input id="skuName" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Gaseosa Cola"/></div>
                <div>
                    <Label htmlFor="skuCategory">Categoría</Label>
                    <Input id="skuCategory" list="sku-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Bebidas"/>
                    <datalist id="sku-categories">{skuCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
                </div>
            </div>
             <div><Label htmlFor="skuSalePrice">Precio de Venta</Label><Input id="skuSalePrice" type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="skuPurchaseUnit">Unidad de Compra (Opcional)</Label><Input id="skuPurchaseUnit" value={purchaseUnit} onChange={e => setPurchaseUnit(e.target.value)} placeholder="Ej: Pack"/></div>
                <div><Label htmlFor="skuUnitsPerPackage">Unidades por Paquete (Opcional)</Label><Input id="skuUnitsPerPackage" type="number" value={unitsPerPackage} onChange={e => setUnitsPerPackage(e.target.value)} placeholder="Ej: 6"/></div>
            </div>
             <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Guardar SKU</Button></div>
        </div>
    );
};

const EditPurchasedSkuModalContent: React.FC<{ sku: SKU; onClose: () => void; }> = ({ sku, onClose }) => {
    const { updateSku, suppliers } = useAppContext();
    const [formData, setFormData] = useState<SKU>(sku);
    const cost = formData.calculatedCost || 0;
    const [markup, setMarkup] = useState(0);

    useEffect(() => {
        setFormData(sku);
        const currentCost = sku.calculatedCost || 0;
        const newMarkup = currentCost > 0 ? ((sku.salePrice / currentCost) - 1) * 100 : 0;
        setMarkup(newMarkup);
    }, [sku]);

    const handleMarkupChange = (newMarkupValue: number) => {
        setMarkup(newMarkupValue);
        if (cost > 0) {
            const newSalePrice = cost * (1 + newMarkupValue / 100);
            setFormData(prev => ({ ...prev, salePrice: newSalePrice }));
        }
    };
    
    const handleSave = (updatedSku: SKU) => {
        updateSku(updatedSku);
        onClose();
    };
    
    return (
        <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="flex justify-between">
                    <span className="font-medium">Último Costo de Compra</span>
                    <span className="font-bold">${cost.toFixed(2)}</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="markup">Markup (%)</Label>
                    <Input id="markup" type="number" value={markup} onChange={e => handleMarkupChange(Number(e.target.value))} />
                </div>
                <div>
                    <Label htmlFor="salePrice">Precio de Venta</Label>
                    <Input id="salePrice" type="number" value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: Number(e.target.value) })} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="skuPurchaseUnit">Unidad de Compra (Opcional)</Label><Input id="skuPurchaseUnit" value={formData.purchaseUnit || ''} onChange={e => setFormData({ ...formData, purchaseUnit: e.target.value })} /></div>
                <div><Label htmlFor="skuUnitsPerPackage">Unidades por Paquete (Opcional)</Label><Input id="skuUnitsPerPackage" type="number" value={formData.unitsPerPackage || ''} onChange={e => setFormData({ ...formData, unitsPerPackage: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="minStock">Stock Mínimo (Alerta)</Label><Input id="minStock" type="number" value={formData.minStock || ''} onChange={e => setFormData({...formData, minStock: Number(e.target.value) || undefined })}/></div>
                <div><Label htmlFor="maxStock">Stock Máximo (Opcional)</Label><Input id="maxStock" type="number" value={formData.maxStock || ''} onChange={e => setFormData({...formData, maxStock: Number(e.target.value) || undefined })}/></div>
            </div>

            {formData.priceHistory && formData.priceHistory.length > 0 && (
                <div>
                    <Label>Historial de Costos de Compra</Label>
                    <div className="mt-2 max-h-40 overflow-y-auto border rounded-md dark:border-gray-700">
                        <Table>
                            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {[...formData.priceHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ph => (
                                    <TableRow key={ph.id}>
                                        <TableCell>{new Date(ph.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{suppliers.find(s => s.id === ph.supplierId)?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium">${ph.cost.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button onClick={() => handleSave(formData)}><Save className="mr-2 h-4 w-4" />Guardar Cambios</Button>
            </div>
        </div>
    );
};

export const SkuManagement: React.FC = () => {
    const { skus, skuCategories, setSkuCategories, setSkus } = useAppContext();
    const { showToast } = useToast();

    const [editingSku, setEditingSku] = useState<SKU | null>(null);
    const [isAddChoiceModalOpen, setAddChoiceModalOpen] = useState(false);
    const [isAddPurchasedModalOpen, setAddPurchasedModalOpen] = useState(false);
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSkus = useMemo(() => {
        return skus.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [skus, searchQuery]);

    const handleDeleteSku = (skuId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este SKU?')) {
            setSkus(prev => prev.filter(s => s.id !== skuId));
            showToast('SKU eliminado', 'success');
        }
    };
    
    const checkCategoryUsage = (category: string) => skus.filter(s => s.category === category).length;
    const onAddCategory = (newCategory: string) => { setSkuCategories(prev => [...prev, newCategory].sort()); showToast('Categoría añadida', 'success'); };
    const onUpdateCategory = (oldName: string, newName: string) => { setSkuCategories(prev => prev.map(c => c === oldName ? newName : c)); setSkus(prev => prev.map(sku => sku.category === oldName ? { ...sku, category: newName } : sku)); showToast('Categoría actualizada', 'success'); };
    const onDeleteCategory = (categoryToDelete: string) => { if(window.confirm(`¿Seguro que quieres eliminar la categoría "${categoryToDelete}"?`)) { setSkuCategories(prev => prev.filter(c => c !== categoryToDelete)); showToast('Categoría eliminada', 'success'); } };

    const handleCreateManufactured = () => {
        setAddChoiceModalOpen(false);
        setEditingSku({ id: '', name: '', category: '', recipe: [], wastageFactor: 0.05, laborCost: 0, overheadCost: 0, franchiseFee: 0, salePrice: 0, quantityInStock: 0, priceHistory: [] });
    };

    const handleCreatePurchased = () => {
        setAddChoiceModalOpen(false);
        setAddPurchasedModalOpen(true);
    };

    const isManufactured = (sku: SKU) => sku.recipe && sku.recipe.length > 0;

    return (
        <div className="space-y-6">
            {isAddChoiceModalOpen && (
                <Modal title="Añadir Nuevo SKU" onClose={() => setAddChoiceModalOpen(false)} size="lg">
                    <div className="p-4 text-center">
                        <p className="mb-6">¿Qué tipo de producto quieres añadir?</p>
                        <div className="flex justify-center gap-4">
                            <Button onClick={handleCreateManufactured} className="flex-1">
                                <ClipboardPen className="mr-2 h-5 w-5"/> Fabricado (con receta)
                            </Button>
                            <Button onClick={handleCreatePurchased} className="flex-1">
                                <ShoppingBag className="mr-2 h-5 w-5"/> Comprado
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            {isAddPurchasedModalOpen && <Modal title="Añadir Nuevo SKU (Comprado)" onClose={() => setAddPurchasedModalOpen(false)} size="lg"><AddPurchasedSkuForm onClose={() => setAddPurchasedModalOpen(false)} /></Modal>}
            {isCategoryModalOpen && <CategoryManagementModal isOpen={isCategoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Gestionar Categorías de SKU" categories={skuCategories} itemUsageCheck={checkCategoryUsage} onAddCategory={onAddCategory} onUpdateCategory={onUpdateCategory} onDeleteCategory={onDeleteCategory} />}
            {editingSku && (isManufactured(editingSku) || editingSku.name === '') && (
                <Modal title={editingSku.name ? `Editando Receta: ${editingSku.name}` : 'Crear Nuevo Producto Fabricado'} onClose={() => setEditingSku(null)} size="6xl">
                    <RecipeCalculator 
                        skuToEdit={editingSku.name ? editingSku : null}
                        isModalMode={true}
                        onCloseModal={() => setEditingSku(null)}
                    />
                </Modal>
            )}
            {editingSku && !isManufactured(editingSku) && editingSku.name !== '' && (
                 <Modal title={`Editar ${editingSku.name}`} onClose={() => setEditingSku(null)} size="lg">
                    <EditPurchasedSkuModalContent sku={editingSku} onClose={() => setEditingSku(null)} />
                </Modal>
            )}
            
            <Card>
                <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold">Gestión de SKUs</h2>
                     <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setCategoryModalOpen(true)}><FolderCog className="mr-2 h-4 w-4"/>Categorías</Button>
                        <Button onClick={() => setAddChoiceModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Nuevo SKU</Button>
                    </div>
                </div>
                <div className="p-4 border-b dark:border-gray-700">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <Input 
                            placeholder="Buscar SKU por nombre..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 w-full sm:w-72"
                        />
                    </div>
                </div>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Precio Venta</TableHead><TableHead className="text-right">Margen</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredSkus.map(sku => {
                            const cost = sku.calculatedCost || 0;
                            const margin = sku.salePrice > 0 ? ((sku.salePrice - cost) / sku.salePrice) * 100 : 0;
                            return (
                                <TableRow key={sku.id}>
                                    <TableCell className="font-medium">{sku.name}</TableCell>
                                    <TableCell>{sku.category}</TableCell>
                                    <TableCell>{isManufactured(sku) ? "Fabricado" : "Comprado"}</TableCell>
                                    <TableCell className="text-right font-semibold">{sku.quantityInStock}</TableCell>
                                    <TableCell className="text-right">${cost.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">${sku.salePrice.toFixed(2)}</TableCell>
                                    <TableCell className={`text-right font-semibold ${margin < 15 ? 'text-red-500' : 'text-green-500'}`}>{margin.toFixed(2)}%</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingSku(sku)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSku(sku.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
