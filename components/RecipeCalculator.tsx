import React, { useState, useMemo, useEffect } from 'react';
import { Ingredient, RecipeItem, SKU } from '../types';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Button } from './ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { PlusCircle, Trash2, Save, ShoppingCart, RefreshCcw } from 'lucide-react';
import { useAppContext } from '../App';
import { Modal } from './ui/Modal';

interface RecipeCalculatorProps {
  skuToEdit: SKU | null;
  isModalMode?: boolean;
  onCloseModal?: () => void;
}

const EMPTY_SKU_STATE = {
    name: '',
    category: '',
    wastageFactor: 0.05,
    laborCost: 0,
    overheadCost: 0,
    franchiseFee: 0,
};

const QuickAddIngredientModal: React.FC<{
    onClose: () => void;
    onIngredientCreated: (newIngredient: Ingredient) => void;
}> = ({ onClose, onIngredientCreated }) => {
    const { addIngredient } = useAppContext();
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    
    const handleCreate = () => {
        if (!name || !unit) {
            alert('Nombre y unidad son obligatorios.');
            return;
        }
        const newIngredient = addIngredient({ name, unit });
        onIngredientCreated(newIngredient);
    };

    return (
        <Modal title="Añadir Insumo Rápido" onClose={onClose} size="lg" className="z-[60]">
            <div className="space-y-4">
                <div><Label htmlFor="quick-ing-name">Nombre del Insumo</Label><Input id="quick-ing-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Nueces"/></div>
                <div><Label htmlFor="quick-ing-unit">Unidad de Medida</Label><Input id="quick-ing-unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="kg, litro, unidad"/></div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleCreate}>Crear y Usar</Button>
                </div>
            </div>
        </Modal>
    );
};

export const RecipeCalculator: React.FC<RecipeCalculatorProps> = ({ skuToEdit, isModalMode = false, onCloseModal }) => {
    const { ingredients, skuCategories, addSku, updateSku, getLatestIngredientCost } = useAppContext();
    const [isQuickAddModalOpen, setQuickAddModalOpen] = useState(false);

    const isEditing = !!skuToEdit;

    const [skuDetails, setSkuDetails] = useState(EMPTY_SKU_STATE);
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [markup, setMarkup] = useState(100);
    
    const [selectedIngredient, setSelectedIngredient] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);

    useEffect(() => {
        if (isEditing && skuToEdit) {
            setSkuDetails({
                name: skuToEdit.name,
                category: skuToEdit.category,
                wastageFactor: skuToEdit.wastageFactor,
                laborCost: skuToEdit.laborCost,
                overheadCost: skuToEdit.overheadCost,
                franchiseFee: skuToEdit.franchiseFee,
            });
            setRecipeItems(skuToEdit.recipe);
            
            const currentTotalCost = skuToEdit.calculatedCost || 0;
            if (currentTotalCost > 0 && skuToEdit.salePrice > 0) {
                const calculatedMarkup = ((skuToEdit.salePrice / currentTotalCost) - 1) * 100;
                setMarkup(calculatedMarkup);
            } else {
                setMarkup(100);
            }

        } else {
            setSkuDetails(EMPTY_SKU_STATE);
            setRecipeItems([]);
            setMarkup(100);
            setSelectedIngredient('');
        }
    }, [skuToEdit, isEditing]);


    const handleDetailChange = (field: string, value: string | number) => {
        setSkuDetails(prev => ({...prev, [field]: value}));
    };

    const handleAddIngredient = () => {
        if (!selectedIngredient || quantity <= 0) return;
        
        const existingItem = recipeItems.find(item => item.ingredientId === selectedIngredient);
        if (existingItem) {
            setRecipeItems(recipeItems.map(item => item.ingredientId === selectedIngredient ? { ...item, quantity: item.quantity + quantity } : item));
        } else {
            setRecipeItems([...recipeItems, { ingredientId: selectedIngredient, quantity }]);
        }
        setQuantity(1);
    };

    const handleRemoveIngredient = (ingredientId: string) => {
        setRecipeItems(recipeItems.filter(item => item.ingredientId !== ingredientId));
    };

    const { ingredientsCost, totalCost, salePrice, margin } = useMemo(() => {
        const iCost = recipeItems.reduce((total, item) => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            return total + (ingredient ? getLatestIngredientCost(ingredient) * item.quantity : 0);
        }, 0);
        const costBeforeWastage = iCost + skuDetails.laborCost + skuDetails.overheadCost + skuDetails.franchiseFee;
        const tCost = costBeforeWastage / (1 - skuDetails.wastageFactor);
        const sPrice = tCost * (1 + markup / 100);
        const mgn = sPrice > 0 ? ((sPrice - tCost) / sPrice) * 100 : 0;
        
        return { 
            ingredientsCost: iCost, 
            totalCost: tCost,
            salePrice: sPrice,
            margin: mgn
        };
    }, [recipeItems, ingredients, skuDetails, markup, getLatestIngredientCost]);
        
    const handleSave = () => {
        if (!skuDetails.name || !skuDetails.category || recipeItems.length === 0) {
            alert("Por favor, completa el Nombre, Categoría y añade al menos un ingrediente a la receta.");
            return;
        }

        const skuData = {
            ...skuDetails,
            recipe: recipeItems,
            salePrice: salePrice,
        };

        if (isEditing && skuToEdit) {
            updateSku({ ...skuToEdit, ...skuData });
        } else {
            addSku(skuData);
            setSkuDetails(EMPTY_SKU_STATE);
            setRecipeItems([]);
            setMarkup(100);
        }
        if (isModalMode && onCloseModal) {
            onCloseModal();
        }
    };

    return (
        <>
        {isQuickAddModalOpen && (
            <QuickAddIngredientModal 
                onClose={() => setQuickAddModalOpen(false)}
                onIngredientCreated={(newIngredient) => {
                    setQuickAddModalOpen(false);
                    setSelectedIngredient(newIngredient.id);
                }}
            />
        )}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isModalMode ? 'p-4' : ''}`}>
            <div className="lg:col-span-2">
                <Card>
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold">{isEditing && skuToEdit ? `Editando: ${skuToEdit.name}` : 'Crear Nuevo Producto'}</h2>
                        {isModalMode && <Button variant="ghost" size="sm" onClick={onCloseModal}>Cerrar</Button>}
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor="skuName">Nombre del Producto</Label><Input id="skuName" value={skuDetails.name} onChange={e => handleDetailChange('name', e.target.value)} placeholder="Ej: Croissant de Almendras"/></div>
                        <div>
                            <Label htmlFor="skuCategory">Categoría</Label>
                            <Input id="skuCategory" list="recipe-sku-categories" value={skuDetails.category} onChange={e => handleDetailChange('category', e.target.value)} placeholder="Ej: Viennoiserie"/>
                             <datalist id="recipe-sku-categories">
                                {skuCategories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="p-4 border-t dark:border-gray-700">
                        <h2 className="text-xl font-bold flex items-center"><ShoppingCart className="mr-2 h-5 w-5"/>Construir Receta</h2>
                    </div>
                    {ingredients.length > 0 ? (
                        <div className="p-4 border-t dark:border-gray-700 space-y-4">
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="flex-grow">
                                    <Label htmlFor="ingredient">Ingrediente</Label>
                                    <div className="flex items-center gap-1">
                                    <select id="ingredient" value={selectedIngredient} onChange={e => setSelectedIngredient(e.target.value)} className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-indigo-500">
                                        <option value="" disabled>Seleccionar...</option>
                                        {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                    </select>
                                    <Button variant="ghost" size="sm" className="h-10" onClick={() => setQuickAddModalOpen(true)} title="Añadir Insumo Rápido">
                                        <PlusCircle className="h-5 w-5" />
                                    </Button>
                                    </div>
                                </div>
                                <div className="w-24">
                                    <Label htmlFor="quantity">Cantidad</Label>
                                    <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value))} min="0.001" step="0.001" />
                                </div>
                                <Button onClick={handleAddIngredient} className="h-10" disabled={!selectedIngredient}><PlusCircle className="mr-2 h-4 w-4"/>Añadir</Button>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Ingrediente</TableHead><TableHead>Cantidad</TableHead><TableHead>Unidad</TableHead><TableHead className="text-right">Costo</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {recipeItems.map(item => {
                                        const ingredient = ingredients.find(i => i.id === item.ingredientId);
                                        if (!ingredient) return null;
                                        return (
                                            <TableRow key={item.ingredientId}>
                                                <TableCell>{ingredient.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{ingredient.unit}</TableCell>
                                                <TableCell className="text-right">${(getLatestIngredientCost(ingredient) * item.quantity).toFixed(3)}</TableCell>
                                                <TableCell><Button variant="ghost" size="sm" onClick={() => handleRemoveIngredient(item.ingredientId)}><Trash2 className="h-4 w-4 text-red-500"/></Button></TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                           <p>No has añadido insumos. Ve a la sección de "Proveedores e Insumos" para empezar.</p>
                        </div>
                    )}
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <div className="p-4 border-b dark:border-gray-700"><h2 className="text-xl font-bold">Costos y Precios</h2></div>
                    <div className="p-4 space-y-3">
                        <div><Label htmlFor="laborCost">Costo Mano de Obra ($)</Label><Input id="laborCost" type="number" value={skuDetails.laborCost} onChange={e => handleDetailChange('laborCost', parseFloat(e.target.value) || 0)} step="0.01"/></div>
                        <div><Label htmlFor="overheadCost">Gastos Generales ($)</Label><Input id="overheadCost" type="number" value={skuDetails.overheadCost} onChange={e => handleDetailChange('overheadCost', parseFloat(e.target.value) || 0)} step="0.01"/></div>
                        <div><Label htmlFor="franchiseFee">Royalty / Franquicia ($)</Label><Input id="franchiseFee" type="number" value={skuDetails.franchiseFee} onChange={e => handleDetailChange('franchiseFee', parseFloat(e.target.value) || 0)} step="0.01"/></div>
                        <div><Label htmlFor="wastageFactor">Factor de Merma (%)</Label><Input id="wastageFactor" type="number" value={skuDetails.wastageFactor * 100} onChange={e => handleDetailChange('wastageFactor', parseFloat(e.target.value) / 100 || 0)} step="1"/></div>
                        
                        <div className="!mt-6 pt-4 border-t dark:border-gray-600">
                            <Label htmlFor="markup">Markup sobre Costo (%)</Label>
                            <Input id="markup" type="number" value={markup} onChange={e => setMarkup(parseFloat(e.target.value) || 0)} step="1"/>
                            <p className="text-xs text-gray-500 mt-1">Define el % de ganancia sobre el costo total.</p>
                        </div>
                    </div>
                    <div className="p-4 border-t dark:border-gray-700 space-y-2">
                        <div className="flex justify-between text-sm"><span>Costo Insumos:</span> <strong>${ingredientsCost.toFixed(2)}</strong></div>
                        <div className="flex justify-between text-base"><span>Costo Total Unitario:</span> <strong>${totalCost.toFixed(2)}</strong></div>
                        <hr className="my-2 dark:border-gray-600"/>
                        <div className="flex justify-between text-lg font-bold"><span>PRECIO VENTA:</span> <span>${salePrice.toFixed(2)}</span></div>
                        <div className={`flex justify-between text-lg font-bold ${margin < 15 ? 'text-red-500' : 'text-green-500'}`}><span>MARGEN BRUTO:</span> <span>{margin.toFixed(2)}%</span></div>
                    </div>
                </Card>
                <Button onClick={handleSave} className="w-full text-lg" disabled={!skuDetails.name || recipeItems.length === 0}>
                   {isEditing ? <><RefreshCcw className="mr-2 h-5 w-5"/>Actualizar Producto</> : <><Save className="mr-2 h-5 w-5"/>Guardar Producto</>}
                </Button>
            </div>
        </div>
        </>
    );
};
