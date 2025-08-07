
import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/Table';
import { Calculator, AlertCircle } from 'lucide-react';

type TerminationReason =
  | 'despido_sin_causa'
  | 'despido_con_causa'
  | 'renuncia'
  | 'mutuo_acuerdo'
  | 'despido_indirecto'
  | 'falta_trabajo_fuerza_mayor';

interface FormData {
  fechaIngreso: string;
  fechaEgreso: string;
  mejorRemuneracion: number;
  remuneracionEgreso: number;
  baseSac: number;
  motivoFinalizacion: TerminationReason;
  preavisoOtorgado: boolean;
  topeIndemnizatorio?: number;
  agravantes: {
    maternidad: boolean;
    matrimonio: boolean;
    noRegistrado: boolean;
  };
}

interface CalculationResult {
  [key: string]: {
    value: number;
    description: string;
  };
}

export const SeveranceCalculator: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [formData, setFormData] = useState<FormData>({
        fechaIngreso: '',
        fechaEgreso: today,
        mejorRemuneracion: 0,
        remuneracionEgreso: 0,
        baseSac: 0,
        motivoFinalizacion: 'despido_sin_causa',
        preavisoOtorgado: false,
        agravantes: { maternidad: false, matrimonio: false, noRegistrado: false },
    });
    const [result, setResult] = useState<CalculationResult | null>(null);

    const handleInputChange = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleAgravanteChange = (field: keyof FormData['agravantes']) => {
        setFormData(prev => ({
            ...prev,
            agravantes: { ...prev.agravantes, [field]: !prev.agravantes[field] },
        }));
    };

    const handleCalculate = () => {
        const {
            fechaIngreso,
            fechaEgreso,
            mejorRemuneracion,
            remuneracionEgreso,
            baseSac,
            motivoFinalizacion,
            preavisoOtorgado,
            topeIndemnizatorio,
            agravantes,
        } = formData;

        if (!fechaIngreso || !fechaEgreso || mejorRemuneracion <= 0 || remuneracionEgreso <= 0 || baseSac <= 0) {
            alert('Por favor, complete todas las fechas y remuneraciones con valores válidos.');
            return;
        }

        const startDate = new Date(fechaIngreso + 'T00:00:00');
        const endDate = new Date(fechaEgreso + 'T00:00:00');
        
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalMonths = diffDays / 30.4375;
        const yearsOfService = Math.floor(totalMonths / 12);
        const monthsOfService = Math.floor(totalMonths % 12);
        let antiguedadAnios = yearsOfService;
        if (monthsOfService > 3) {
            antiguedadAnios += 1;
        }
        if (antiguedadAnios === 0 && diffDays > 90) { // Minimum 1 month indemnity if past probation
            antiguedadAnios = 1;
        }

        const newResult: CalculationResult = {};

        // --- Indemnización por Antigüedad ---
        if (['despido_sin_causa', 'despido_indirecto', 'falta_trabajo_fuerza_mayor'].includes(motivoFinalizacion)) {
            let baseCalculo = mejorRemuneracion;
            if (topeIndemnizatorio && topeIndemnizatorio > 0) {
                const baseConTope = Math.min(mejorRemuneracion, topeIndemnizatorio);
                const minimoVizzoti = (mejorRemuneracion * antiguedadAnios) * 0.67;
                const indemnizacionConTope = baseConTope * antiguedadAnios;
                baseCalculo = Math.max(baseConTope, minimoVizzoti / antiguedadAnios);
            }
            let indemnizacionAntiguedad = baseCalculo * antiguedadAnios;
            if (motivoFinalizacion === 'falta_trabajo_fuerza_mayor') {
                indemnizacionAntiguedad *= 0.5;
            }
            newResult.indemnizacionAntiguedad = { value: indemnizacionAntiguedad, description: `Art. 245 LCT (${antiguedadAnios} años x $${baseCalculo.toFixed(2)})`};
        }

        // --- Preaviso e Integración ---
        if (['despido_sin_causa', 'despido_indirecto'].includes(motivoFinalizacion) && !preavisoOtorgado) {
            // Preaviso
            const mesesPreaviso = yearsOfService >= 5 ? 2 : 1;
            const indemnizacionPreaviso = mesesPreaviso * remuneracionEgreso;
            newResult.indemnizacionPreaviso = { value: indemnizacionPreaviso, description: `Art. 232 LCT (${mesesPreaviso} mes/es)`};
            newResult.sacSobrePreaviso = { value: indemnizacionPreaviso / 12, description: `Proporcional SAC`};
            
            // Integración
            const ultimoDiaMes = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            if (endDate.getDate() < ultimoDiaMes) {
                const diasRestantes = ultimoDiaMes - endDate.getDate();
                const integracionMesDespido = (remuneracionEgreso / 30) * diasRestantes;
                newResult.integracionMesDespido = { value: integracionMesDespido, description: `Art. 233 LCT (${diasRestantes} días)`};
                newResult.sacSobreIntegracion = { value: integracionMesDespido / 12, description: `Proporcional SAC`};
            }
        }

        // --- Haberes Proporcionales (siempre se pagan) ---
        // Días trabajados
        const diasTrabajados = endDate.getDate();
        newResult.diasTrabajados = { value: (remuneracionEgreso / 30) * diasTrabajados, description: `${diasTrabajados} días trabajados en el mes`};
        
        // SAC Proporcional
        const startOfSemester = new Date(endDate.getFullYear(), endDate.getMonth() < 6 ? 0 : 6, 1);
        const endOfSemester = new Date(endDate.getFullYear(), endDate.getMonth() < 6 ? 6 : 12, 0);
        
        const daysWorkedInSemester = Math.round((endDate.getTime() - startOfSemester.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalDaysInSemester = Math.round((endOfSemester.getTime() - startOfSemester.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        newResult.sacProporcional = { value: (baseSac / 2) * (daysWorkedInSemester / totalDaysInSemester), description: `Proporcional semestre`};

        // Vacaciones No Gozadas
        let diasVacacionesAnuales = 14;
        if (yearsOfService > 20) diasVacacionesAnuales = 35;
        else if (yearsOfService > 10) diasVacacionesAnuales = 28;
        else if (yearsOfService > 5) diasVacacionesAnuales = 21;
        const startOfYear = new Date(endDate.getFullYear(), 0, 1);
        const daysWorkedInYear = (endDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1;
        const diasProporcionales = (daysWorkedInYear / 365) * diasVacacionesAnuales;
        const vacacionesNoGozadas = (remuneracionEgreso / 25) * diasProporcionales;
        newResult.vacacionesNoGozadas = { value: vacacionesNoGozadas, description: `${diasProporcionales.toFixed(2)} días proporcionales`};
        newResult.sacSobreVacaciones = { value: vacacionesNoGozadas / 12, description: 'Proporcional SAC'};

        // --- Agravantes ---
        if (agravantes.maternidad && ['despido_sin_causa', 'despido_indirecto'].includes(motivoFinalizacion)) {
            newResult.agravanteMaternidad = { value: mejorRemuneracion * 12, description: 'Art. 178 LCT (1 año de remuneración)' };
        }
        if (agravantes.matrimonio && ['despido_sin_causa', 'despido_indirecto'].includes(motivoFinalizacion)) {
            newResult.agravanteMatrimonio = { value: mejorRemuneracion * 12, description: 'Art. 182 LCT (1 año de remuneración)' };
        }
        if (agravantes.noRegistrado && newResult.indemnizacionAntiguedad) {
            newResult.agravanteNoRegistrado = { value: newResult.indemnizacionAntiguedad.value, description: 'Art. 1 Ley 25.323 (duplica Antigüedad)' };
        }

        setResult(newResult);
    };
    
    const totalIndemnizacion = useMemo(() => {
        if (!result) return 0;
        return Object.values(result).reduce((sum, item) => sum + item.value, 0);
    }, [result]);

    const resultOrder: (keyof CalculationResult)[] = [
        'diasTrabajados', 'sacProporcional', 'vacacionesNoGozadas', 'sacSobreVacaciones',
        'indemnizacionAntiguedad', 'indemnizacionPreaviso', 'sacSobrePreaviso', 'integracionMesDespido', 'sacSobreIntegracion',
        'agravanteMaternidad', 'agravanteMatrimonio', 'agravanteNoRegistrado'
    ];


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center"><Calculator className="mr-2 h-6 w-6 text-indigo-500" />Calculadora de Indemnización</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-1">
                    <div className="p-4"><h3 className="font-bold">Datos para el Cálculo</h3></div>
                    <div className="p-4 space-y-4 border-t dark:border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Fecha Ingreso</Label><Input type="date" value={formData.fechaIngreso} onChange={e => handleInputChange('fechaIngreso', e.target.value)} /></div>
                            <div><Label>Fecha Egreso</Label><Input type="date" value={formData.fechaEgreso} onChange={e => handleInputChange('fechaEgreso', e.target.value)} /></div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div><Label>Mejor Remun. (Bruta)</Label><Input type="number" value={formData.mejorRemuneracion} onChange={e => handleInputChange('mejorRemuneracion', Number(e.target.value))} /></div>
                            <div><Label>Remun. Egreso (Bruta)</Label><Input type="number" value={formData.remuneracionEgreso} onChange={e => handleInputChange('remuneracionEgreso', Number(e.target.value))} /></div>
                            <div><Label>Base SAC (Bruta)</Label><Input type="number" value={formData.baseSac} onChange={e => handleInputChange('baseSac', Number(e.target.value))} /></div>
                        </div>
                        <div>
                           <Label>Tope Indemnizatorio (Opcional)</Label>
                           <Input type="number" placeholder="Ingresar si aplica CCT" value={formData.topeIndemnizatorio || ''} onChange={e => handleInputChange('topeIndemnizatorio', Number(e.target.value))} />
                        </div>
                         <div>
                            <Label>Motivo Finalización</Label>
                            <select value={formData.motivoFinalizacion} onChange={e => handleInputChange('motivoFinalizacion', e.target.value)} className="w-full h-10 px-2 mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent">
                                <option value="despido_sin_causa">Despido sin Justa Causa</option>
                                <option value="despido_indirecto">Despido Indirecto (Autodespido)</option>
                                <option value="falta_trabajo_fuerza_mayor">Falta de Trabajo / Fuerza Mayor</option>
                                <option value="renuncia">Renuncia</option>
                                <option value="despido_con_causa">Despido con Justa Causa</option>
                                <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
                            </select>
                        </div>
                        <div className="flex items-center space-x-2">
                           <input type="checkbox" id="preaviso" checked={formData.preavisoOtorgado} onChange={e => handleInputChange('preavisoOtorgado', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                           <Label htmlFor="preaviso">Se otorgó preaviso</Label>
                        </div>
                        <div>
                            <Label>Agravantes (si aplican)</Label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <div className="flex items-center space-x-2"><input type="checkbox" id="maternidad" checked={formData.agravantes.maternidad} onChange={()=>handleAgravanteChange('maternidad')} className="h-4 w-4 rounded"/><Label htmlFor="maternidad">Maternidad</Label></div>
                                <div className="flex items-center space-x-2"><input type="checkbox" id="matrimonio" checked={formData.agravantes.matrimonio} onChange={()=>handleAgravanteChange('matrimonio')} className="h-4 w-4 rounded"/><Label htmlFor="matrimonio">Matrimonio</Label></div>
                                <div className="flex items-center space-x-2"><input type="checkbox" id="noRegistrado" checked={formData.agravantes.noRegistrado} onChange={()=>handleAgravanteChange('noRegistrado')} className="h-4 w-4 rounded"/><Label htmlFor="noRegistrado">Empleo no Registrado</Label></div>
                            </div>
                        </div>
                        <Button onClick={handleCalculate} className="w-full">Calcular Liquidación Final</Button>
                    </div>
                </Card>
                <Card className="lg:col-span-1">
                     <div className="p-4 flex justify-between items-center">
                        <h3 className="font-bold">Resultado de la Liquidación</h3>
                        <div className="text-right"><p className="text-sm text-gray-500">Total a Pagar</p><p className="text-2xl font-bold">${totalIndemnizacion.toFixed(2)}</p></div>
                    </div>
                     <div className="p-4 border-t dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                        {result ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead>Detalle</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {resultOrder.map(key => {
                                        if (result[key] && result[key].value > 0) {
                                            const item = result[key];
                                            return (
                                                <TableRow key={key}>
                                                    <TableCell className="font-medium capitalize">{String(key).replace(/([A-Z])/g, ' $1').replace('agravante', 'Agravante:')}</TableCell>
                                                    <TableCell className="text-sm text-gray-500">{item.description}</TableCell>
                                                    <TableCell className="text-right font-semibold">${item.value.toFixed(2)}</TableCell>
                                                </TableRow>
                                            );
                                        }
                                        return null;
                                    })}
                                     <TableRow className="border-t-2 border-gray-300 dark:border-gray-600">
                                        <TableCell colSpan={2} className="text-right font-bold text-lg">TOTAL</TableCell>
                                        <TableCell className="text-right font-bold text-lg">${totalIndemnizacion.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center p-8 text-gray-500">
                                <p>Ingrese los datos y haga clic en "Calcular" para ver el desglose de la liquidación.</p>
                            </div>
                        )}
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-md flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-300 mt-1 flex-shrink-0" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>Aviso:</strong> Este cálculo es una estimación basada en la Ley de Contrato de Trabajo (LCT) de Argentina y no reemplaza el asesoramiento legal profesional. No considera retenciones de impuestos ni deducciones.
                            </p>
                        </div>
                     </div>
                </Card>
            </div>
        </div>
    );
};