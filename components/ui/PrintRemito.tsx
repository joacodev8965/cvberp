
import React, { useMemo } from 'react';
import { Remito, Store } from '../../types';

interface PrintRemitoProps {
    remito: Remito;
    store: Store | undefined;
}

const safeParseYYYYMMDD = (dateString: any): Date | null => {
    if (typeof dateString !== 'string') return null;
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
        return date;
    }
    return null;
};


export const PrintRemito: React.FC<PrintRemitoProps> = ({ remito, store }) => {
    const deliveryDate = useMemo(() => {
        const date = safeParseYYYYMMDD(remito.date);
        if (date) {
            return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        }
        return "Fecha inválida";
    }, [remito.date]);
    
    const totals = useMemo(() => {
        let itemsSubtotal = 0;
        remito.items.forEach(item => {
            const discountedLineTotal = item.quantity * item.unitPrice * (1 - item.discountPercentage / 100);
            itemsSubtotal += discountedLineTotal;
        });
        const finalSubtotal = itemsSubtotal - (remito.discount || 0);
        
        // Recalculate IVA on the final subtotal, assuming a uniform rate for simplicity or using an average if needed.
        // This is a simplified approach. A more accurate one would be itemized.
        const averageIVARate = remito.items.length > 0 ? remito.items.reduce((sum, item) => sum + item.ivaRate, 0) / remito.items.length : 21;
        const finalIvaTotal = finalSubtotal * (averageIVARate / 100);
        
        const finalTotal = finalSubtotal + finalIvaTotal;

        return { subtotal: finalSubtotal, ivaTotal: finalIvaTotal, total: finalTotal };
    }, [remito]);

    return (
        <div className="p-8 bg-white text-black font-sans text-sm">
            <style>{`@media print { body { -webkit-print-color-adjust: exact; color-adjust: exact; } .no-print { display: none; } } body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; } .remito-table th, .remito-table td { padding: 8px; }`}</style>
            <header className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-black">REMITO</h1>
                    <p className="text-black">Fecha de Emisión: {new Date().toLocaleDateString('es-ES')}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-black">CRAFT VEGAN BAKERY</h2>
                    <p className="text-black">Av. Corrientes 1234, CABA</p>
                    <p className="text-black">CUIT: 30-12345678-9</p>
                </div>
            </header>
            <section className="mb-6 p-4 border border-black rounded-lg">
                <h3 className="font-bold text-black mb-1">Cliente:</h3>
                <p className="font-semibold text-lg text-black">{store?.name || remito.storeName}</p>
                <p className="text-black">{store?.address}</p>
                <p className="mt-2 text-black">Fecha de Entrega: <span className="font-semibold">{deliveryDate}</span></p>
            </section>
            <table className="w-full text-left border-collapse border border-black remito-table">
                <thead className="bg-gray-200 border-b-2 border-black">
                    <tr>
                        <th className="border-r border-black font-bold text-black">Producto</th>
                        <th className="text-right border-r border-black font-bold text-black">Cantidad</th>
                        <th className="text-right border-r border-black font-bold text-black">P. Unitario</th>
                        <th className="text-right border-r border-black font-bold text-black">Desc. (%)</th>
                        <th className="text-right font-bold text-black">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {remito.items.map(item => {
                         const lineSubtotal = item.quantity * item.unitPrice * (1 - item.discountPercentage / 100);
                        return (
                        <tr key={item.skuId} className="border-b border-gray-400">
                            <td className="border-r border-black text-black">{item.skuName}</td>
                            <td className="text-right border-r border-black text-black">{item.quantity}</td>
                            <td className="text-right border-r border-black text-black">${item.unitPrice.toFixed(2)}</td>
                            <td className="text-right border-r border-black text-black">{item.discountPercentage}%</td>
                            <td className="text-right font-semibold text-black">${lineSubtotal.toFixed(2)}</td>
                        </tr>);
                    })}
                </tbody>
            </table>
            <div className="flex justify-end mt-4">
                <div className="w-full max-w-sm">
                    <div className="flex justify-between py-1"><span className="text-black">Subtotal:</span><span className="font-semibold text-black">${totals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1"><span className="text-black">IVA ({totals.ivaTotal > 0 ? '21' : '0'}%):</span><span className="font-semibold text-black">${totals.ivaTotal.toFixed(2)}</span></div>
                    {remito.discount > 0 && <div className="flex justify-between py-1 text-red-600"><span className="text-black">Descuento Global:</span><span className="font-semibold text-black">-${remito.discount.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-xl mt-2 pt-2 border-t-2 border-black">
                        <span className="text-black">TOTAL:</span>
                        <span className="text-black">${totals.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <footer className="mt-20 pt-10 border-t border-gray-300 text-black">
                <div className="flex justify-between">
                    <div className="w-1/2">
                        <p className="mb-10 text-black">Firma Aclaración:</p>
                        <p className="border-t border-gray-500 pt-2 text-black">Recibí Conforme</p>
                    </div>
                    <div className="text-xs text-center text-gray-600">
                        <p>Documento no válido como factura.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};