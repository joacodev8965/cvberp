

import { GoogleGenAI, Type } from "@google/genai";
import type { SKU, Ingredient, SalesReportData, SalesSummary, Store, HistoricalSale, WholesaleOrder, AnalyzedItem } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set. Gemini API calls cannot be made. Please configure it.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Retry Logic ---
const withRetry = async <T>(apiCall: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await apiCall();
    } catch (error) {
        if (retries > 0) {
            console.warn(`API call failed. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(apiCall, retries - 1, delay * 2); // Exponential backoff
        } else {
            console.error("API call failed after multiple retries.", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Propagate specific errors if they are meaningful, otherwise use a generic message.
            if (errorMessage.includes("La IA no devolvió")) {
                 throw error;
            }
            throw new Error(`La IA no pudo procesar la solicitud después de varios intentos. Error original: ${errorMessage}`);
        }
    }
};

function formatDataForPrompt(skus: SKU[], ingredients: Ingredient[], getLatestIngredientCost: (ing: Ingredient) => number): string {
  let dataString = 'DATOS ACTUALES DE LA PANADERÍA:\n\n';

  dataString += 'Insumos Principales (ID, Nombre, Costo por Unidad):\n';
  ingredients.forEach(i => {
    dataString += `- ${i.id}, ${i.name}, $${getLatestIngredientCost(i).toFixed(2)} por ${i.unit}\n`;
  });
  dataString += '\n';

  dataString += 'Productos (SKUs):\n';
  skus.forEach(s => {
    const totalCost = s.calculatedCost || 0;
    const margin = s.salePrice > 0 ? ((s.salePrice - totalCost) / s.salePrice) * 100 : 0;
    dataString += `- ${s.name} (Categoría: ${s.category})\n`;
    dataString += `  - Costo Unitario Actual: $${totalCost.toFixed(2)}\n`;
    dataString += `  - Precio de Venta: $${s.salePrice.toFixed(2)}\n`;
    dataString += `  - Margen Bruto Actual: ${margin.toFixed(2)}%\n`;
    dataString += `  - Receta (ID Insumo, Cantidad): ${s.recipe.map(r => `${r.ingredientId}: ${r.quantity}`).join(', ')}\n`;
    dataString += `  - Costo Mano de Obra: $${s.laborCost.toFixed(2)}, Gastos Generales: $${s.overheadCost.toFixed(2)}, Franquicia: $${s.franchiseFee.toFixed(2)}, Merma: ${(s.wastageFactor * 100).toFixed(1)}%\n`;
  });

  return dataString;
}

export async function analyzeInvoice(
    fileContent: string, // base64 string
    mimeType: string,
): Promise<Omit<AnalyzedItem, 'id' | 'matchedIngredientId'>[]> {
    const textPart = { text: "Analiza la imagen de esta factura o remito. Extrae cada línea de producto. Para cada línea, identifica: 1. El nombre del producto o descripción. 2. La cantidad comprada. 3. El precio unitario NETO (sin IVA u otros impuestos). Si solo está el precio total, calcúlalo dividiendo por la cantidad. Ignora subtotales, totales, impuestos y cualquier otra información que no sea un producto. Devuelve un array de objetos JSON con los datos extraídos, siguiendo el esquema." };
    const imagePart = { inlineData: { mimeType, data: fileContent } };
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                productName: { type: Type.STRING, description: "Nombre o descripción del producto." },
                quantity: { type: Type.NUMBER, description: "Cantidad de unidades compradas." },
                unitPrice: { type: Type.NUMBER, description: "Precio unitario neto (sin impuestos)." }
            }
        }
    };

    const apiCall = async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, imagePart] },
            config: { responseMimeType: "application/json", responseSchema }
        });
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida. El contenido puede haber sido bloqueado por seguridad o no se pudo generar.");
        return JSON.parse(responseText.trim());
    };
    
    return withRetry(apiCall);
}


export async function analyzeScenario(
  scenarioPrompt: string,
  skus: SKU[],
  ingredients: Ingredient[],
  getLatestIngredientCost: (ing: Ingredient) => number
): Promise<any> {
    const formattedData = formatDataForPrompt(skus, ingredients, getLatestIngredientCost);
    const fullPrompt = `
Eres un analista financiero experto para una panadería. Tu tarea es simular el impacto de un escenario económico en los costos y márgenes de los productos.

**Instrucciones:**
1.  Lee el escenario descrito por el usuario.
2.  Analiza los DATOS ACTUALES DE LA PANADERÍA para entender la estructura de costos.
3.  Calcula los nuevos costos unitarios para cada SKU afectado por el escenario. Considera cambios en insumos, mano de obra, etc.
4.  Calcula el nuevo margen bruto para cada SKU afectado.
5.  Escribe un resumen ejecutivo claro y conciso del impacto general.
6.  Lista únicamente los SKUs que fueron afectados, mostrando su costo y margen antes y después.
7.  Proporciona 2 o 3 recomendaciones estratégicas accionables basadas en el análisis (ej. ajustar precios, cambiar receta, promocionar un producto).

**Formato de Respuesta:**
Responde únicamente con un objeto JSON que siga el esquema proporcionado. No incluyas explicaciones fuera del JSON.

**DATOS ACTUALES DE LA PANADERÍA:**
${formattedData}

**ESCENARIO A ANALIZAR:**
"${scenarioPrompt}"
`;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: 'Resumen ejecutivo del impacto del escenario.'},
        affectedSkus: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { skuName: { type: Type.STRING }, oldCost: { type: Type.NUMBER }, newCost: { type: Type.NUMBER }, oldMargin: { type: Type.NUMBER }, newMargin: { type: Type.NUMBER } } } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    };
    
    const apiCall = async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: { responseMimeType: "application/json", responseSchema }
        });
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        return JSON.parse(responseText.trim());
    };
    
    return withRetry(apiCall);
}

export async function analyzeSalesReport(fileContent: string): Promise<{ salesData: SalesReportData[], summary: SalesSummary }> {
    const prompt = `Analiza el siguiente reporte de ventas (en formato CSV o texto plano). Extrae cada producto vendido, la cantidad, el precio unitario y calcula el ingreso total por producto. Además, provee un resumen general que incluya el ingreso total, el total de unidades vendidas, y el nombre y unidades vendidas del producto más vendido. El contenido es:\n\n${fileContent}`;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        salesData: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              quantitySold: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
              totalRevenue: { type: Type.NUMBER }
            }
          }
        },
        summary: {
          type: Type.OBJECT,
          properties: {
            totalRevenue: { type: Type.NUMBER },
            totalUnitsSold: { type: Type.NUMBER },
            bestSellingProduct: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                unitsSold: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        return JSON.parse(responseText.trim());
    };
    return withRetry(apiCall);
}

export async function analyzeSalesFileForHistory(fileContent: string, storeId: string): Promise<HistoricalSale[]> {
    const prompt = `Analiza el siguiente archivo de ventas (CSV, Excel o texto plano) y extrae cada transacción individual. Para cada transacción, necesito la fecha y hora, el nombre del producto (SKU), la cantidad y el precio unitario. El formato de fecha y hora debe ser YYYY-MM-DDTHH:mm:ss. Ignora cualquier línea que no represente una venta de un producto. El contenido del archivo es:\n\n${fileContent}`;
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          datetime: { type: Type.STRING },
          skuName: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER }
        },
        required: ["datetime", "skuName", "quantity", "unitPrice"]
      }
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        const parsedSales = JSON.parse(responseText.trim());
        return parsedSales.map((sale: any) => ({ ...sale, id: `sale-${Date.now()}-${Math.random()}`, storeId }));
    };
    return withRetry(apiCall);
}

export async function analyzeTransactions(sales: HistoricalSale[], skus: SKU[]): Promise<any> {
    const prompt = `Eres un analista de datos de retail. Analiza los siguientes datos de ventas para un local. Realiza dos análisis:\n1. Análisis de Horas Pico: Para los 5 SKUs más vendidos, agrupa las ventas por hora del día (0-23) y devuelve la cantidad total vendida en cada hora.\n2. Análisis de Cesta de Compra: Identifica los 5 pares de productos que se compran juntos con más frecuencia. Para cada par, proporciona una breve recomendación de marketing (ej: 'Crear un combo', 'Exhibir juntos').\nDatos de ventas: ${JSON.stringify(sales)}\nCatálogo de SKUs: ${JSON.stringify(skus)}`;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        peakHoursAnalysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              skuName: { type: Type.STRING },
              hourlySales: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hour: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        },
        marketBasketAnalysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemPair: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING }
            }
          }
        }
      }
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        return JSON.parse(responseText.trim());
    };
    return withRetry(apiCall);
}

export async function getPricingSuggestion(sku: SKU, historicalSales: HistoricalSale[]): Promise<any> {
    const prompt = `Eres un estratega de precios para una panadería. Para el siguiente producto, sugiere un nuevo precio de venta. Basa tu sugerencia en su costo actual, precio de venta actual, y el historial de ventas. Proporciona un razonamiento claro y el impacto esperado en el margen y/o volumen de ventas.\nProducto: ${JSON.stringify(sku)}\nHistorial de ventas: ${JSON.stringify(historicalSales.filter(s => s.skuName.toLowerCase() === sku.name.toLowerCase()))}`;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        suggestedPrice: { type: Type.NUMBER },
        reasoning: { type: Type.STRING },
        expectedImpact: { type: Type.STRING }
      },
      required: ["suggestedPrice", "reasoning", "expectedImpact"]
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        return JSON.parse(responseText.trim());
    };
    return withRetry(apiCall);
}

export async function getMenuEngineeringAnalysis(skus: SKU[], historicalSales: HistoricalSale[]): Promise<any> {
     const salesBySku = historicalSales.reduce((acc, sale) => {
        const key = sale.skuName.trim().toLowerCase();
        if (!acc[key]) acc[key] = { quantity: 0, revenue: 0 };
        acc[key].quantity += sale.quantity;
        acc[key].revenue += sale.quantity * sale.unitPrice;
        return acc;
    }, {} as Record<string, {quantity: number, revenue: number}>);

    if (Object.keys(salesBySku).length === 0) throw new Error("No hay suficientes datos de ventas para realizar un análisis de ingeniería de menú.");
    
    const prompt = `Realiza un análisis de ingeniería de menú (Matriz de Boston) para los siguientes productos, usando sus datos de costo, precio y ventas. Clasifica cada SKU en una de estas 4 categorías: 'Estrella' (alta popularidad, alta rentabilidad), 'Caballo de Batalla' (alta popularidad, baja rentabilidad), 'Vaca Lechera' (baja popularidad, alta rentabilidad), o 'Perro' (baja popularidad, baja rentabilidad). Para cada SKU, proporciona una recomendación estratégica breve.\nDatos de SKUs (costo y precio): ${JSON.stringify(skus)}\nDatos de ventas (popularidad): ${JSON.stringify(salesBySku)}`;
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skuName: { type: Type.STRING },
          classification: { type: Type.STRING, enum: ["Estrella", "Vaca Lechera", "Caballo de Batalla", "Perro"] },
          recommendation: { type: Type.STRING }
        },
        required: ["skuName", "classification", "recommendation"]
      }
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        return JSON.parse(responseText.trim());
    };
    return withRetry(apiCall);
}

export async function analyzeWholesaleOrderFile(fileContent: string, skus: SKU[], storeName: string, weekStartDate: string): Promise<WholesaleOrder[]> {
    const prompt = `
Eres un asistente de entrada de datos para una panadería. Tu tarea es analizar el contenido de un archivo de pedido mayorista (probablemente en formato CSV o similar) y convertirlo en una serie de pedidos diarios.

**Contexto:**
- El archivo representa el pedido de una semana completa para la tienda: "${storeName}".
- La semana de este pedido comienza en la fecha: ${weekStartDate} (Lunes).
- Las filas representan productos y las columnas representan los días de la semana (LUNES, MARTES, etc.).
- Los valores en las celdas son las cantidades pedidas para ese producto en ese día.
- Ignora las filas que no tengan cantidades pedidas para ningún día.
- Ignora las columnas de 'TOTALES', 'CATEGORÍA' o cualquier otra que no sea un día de la semana.
- Si un día no tiene pedidos, no generes un objeto para ese día.

**Tu Tarea:**
Genera un array JSON de objetos. Cada objeto representa el pedido de UN DÍA específico.
- Para cada día de la semana (de Lunes a Domingo) que tenga al menos un producto pedido, crea un objeto.
- Calcula la fecha correcta (en formato YYYY-MM-DD) para cada día, comenzando desde ${weekStartDate} (Lunes=fecha de inicio, Martes=fecha de inicio+1, etc.).
- El campo \`storeName\` debe ser siempre "${storeName}".
- El campo \`items\` debe ser un array que contenga solo los productos pedidos ESE DÍA, con su \`skuName\` y \`quantity\`.

**Lista de SKUs válidos para referencia:**
${skus.map(s => `- ${s.name}`).join('\n')}

**Contenido del Archivo a analizar:**
"""
${fileContent}
"""

Responde únicamente con el array JSON, siguiendo el esquema proporcionado. No incluyas explicaciones adicionales.
`;
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                storeName: { type: Type.STRING, description: 'Nombre de la tienda.' },
                date: { type: Type.STRING, description: 'Fecha del pedido en formato YYYY-MM-DD.' },
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            skuName: { type: Type.STRING, description: 'Nombre del producto (SKU).' },
                            quantity: { type: Type.NUMBER, description: 'Cantidad pedida.' }
                        },
                        required: ["skuName", "quantity"]
                    }
                }
            },
            required: ["storeName", "date", "items"]
        }
    };
    const apiCall = async () => {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema }});
        const responseText = response.text;
        if (!responseText) throw new Error("La IA no devolvió una respuesta de texto válida.");
        const parsedResponse = JSON.parse(responseText.trim());
        if (!Array.isArray(parsedResponse)) {
            throw new Error("La respuesta de la IA no es un array como se esperaba.");
        }
        return parsedResponse;
    };
    return withRetry(apiCall);
}
