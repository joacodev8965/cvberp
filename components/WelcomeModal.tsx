
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Users, Wrench, Truck, Building2, Check, BookOpen } from 'lucide-react';

interface WelcomeModalProps {
  onClose: () => void;
  onDoNotShowAgain: () => void;
}

const sections = [
  {
    icon: Wrench,
    title: 'Producción: El Corazón de la Cocina',
    content: 'Define tus productos (SKUs), crea recetas detalladas y calcula los costos precisos. Cada cambio en un insumo desde Gestión de Proveedores se refleja aquí. Usa el Planificador para saber exactamente qué y cuánto producir basándose en los pedidos de tus clientes.',
    trainingPdf: '/training/Capacitacion_Modulo_Produccion.pdf',
  },
  {
    icon: Truck,
    title: 'Ventas: El Motor de Crecimiento',
    content: 'Gestiona los pedidos de tus locales mayoristas. Carga sus planillas de pedido semanales y el sistema genera automáticamente los remitos diarios, alimentando directamente el Plan de Producción para asegurar que nunca te falte stock.',
    trainingPdf: '/training/Capacitacion_Modulo_Ventas.pdf',
  },
  {
    icon: Users,
    title: 'Administración: La Gestión Inteligente',
    content: 'Aquí centralizas la operación. En "Gestión de Proveedores", sube una foto o PDF de una factura y la IA la analizará, actualizará el stock y los costos en toda la app. En "Cobranzas", gestiona las cuentas corrientes de tus clientes. En "Recursos Humanos", liquida los sueldos de tu equipo.',
    trainingPdf: '/training/Capacitacion_Modulo_Administracion.pdf',
  },
  {
    icon: Building2,
    title: 'Socios/Gerente: El Cerebro del Negocio',
    content: 'Desde aquí controlas la salud financiera. Analiza la Estructura de Costos, simula escenarios con IA en "What-If", calcula indemnizaciones y descubre la rentabilidad real de tus productos con la Matriz del Menú. Es tu centro de mando para la toma de decisiones.',
    trainingPdf: '/training/Capacitacion_Modulo_Socios_Gerente.pdf',
  },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onDoNotShowAgain }) => {
  const [doNotShow, setDoNotShow] = useState(false);

  const handleClose = () => {
    if (doNotShow) {
      onDoNotShowAgain();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">¡Bienvenido a CVB ERP!</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Una guía rápida para entender cómo funciona la aplicación.</p>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
                  <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{section.content}</p>
                  {section.trainingPdf && (
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(section.trainingPdf, '_blank', 'noopener,noreferrer')}
                        className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Ver capacitación del módulo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 mt-auto border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="doNotShowAgain"
              checked={doNotShow}
              onChange={(e) => setDoNotShow(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="doNotShowAgain" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
              No volver a mostrar
            </Label>
          </div>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            <Check className="mr-2 h-4 w-4" /> Entendido, ¡a trabajar!
          </Button>
        </div>
      </Card>
    </div>
  );
};