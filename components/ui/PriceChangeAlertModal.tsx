import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export interface PriceChange {
    name: string;
    oldCost: number;
    newCost: number;
}

interface PriceChangeAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    changes: PriceChange[];
}

export const PriceChangeAlertModal: React.FC<PriceChangeAlertModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    changes
}) => {
    if (!isOpen) return null;

    return (
        <Modal title="¡Alerta de Cambio de Precios!" onClose={onClose} size="2xl">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Se han detectado cambios en los costos.</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">Revisa el impacto antes de continuar. Al aceptar, los nuevos costos se usarán para futuros cálculos.</p>
                    </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto border dark:border-gray-700 rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Insumo</TableHead>
                                <TableHead className="text-right">Costo Anterior</TableHead>
                                <TableHead className="text-right">Costo Nuevo</TableHead>
                                <TableHead className="text-right">Variación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {changes.map(change => {
                                const variation = ((change.newCost - change.oldCost) / change.oldCost) * 100;
                                const isIncrease = variation > 0;
                                const color = isIncrease ? 'text-red-500' : 'text-green-500';
                                const Icon = isIncrease ? TrendingUp : TrendingDown;

                                return (
                                    <TableRow key={change.name}>
                                        <TableCell className="font-medium">{change.name}</TableCell>
                                        <TableCell className="text-right">${change.oldCost.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-bold">${change.newCost.toFixed(3)}</TableCell>
                                        <TableCell className={`text-right font-semibold ${color} flex items-center justify-end gap-1`}>
                                            {isFinite(variation) ? (
                                                <>
                                                    <Icon className="h-4 w-4" />
                                                    {variation.toFixed(2)}%
                                                </>
                                            ) : (
                                                'Nuevo'
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={onConfirm}>
                        Aceptar y Continuar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};