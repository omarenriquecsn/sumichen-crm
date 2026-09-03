import fs from 'fs';
import path from 'path';

/**
 * Lista de precios de productos (PDF).
 *
 * Mayerlin sube desde `ExcelProductos` un PDF (ej. "LISTA SUMICHEM ... USD
 * dd-mm-yyyy.pdf") que contiene la tabla con las columnas:
 *
 *   Codigo | Producto | Presentación | Procedencia | Precio OFERTA ESPECIAL $/kg | Disponibilidad
 *
 * El archivo se guarda SIEMPRE con el mismo nombre (`lista_precios.pdf`) en la
 * carpeta `uploads/productos` (se sustituye en cada subida). De esa tabla:
 *   1. Se actualiza `productos.precio_base` con la columna "Precio OFERTA
 *      ESPECIAL $/kg" (matcheando `productos.descripcion` con el código).
 *   2. El asistente de WhatsApp genera el catálogo para el cliente
 *      (Código · Producto · Presentación) leyendo este mismo archivo.
 *
 * El parseo se hace con pdf.js (pdfjs-dist) extrayendo el texto con
 * coordenadas, agrupando por fila (y) y asignando cada token a su columna
 * según el eje x. El layout del PDF es una tabla estable generada desde
 * Excel, así que las bandas de columnas son fijas.
 */

export const NOMBRE_LISTA = 'lista_precios.pdf';

/** Carpeta donde se guarda la lista de precios (configurable con PRODUCTOS_UPLOAD_PATH). */
export const getCarpetaProductos = () =>
  process.env.PRODUCTOS_UPLOAD_PATH || path.resolve(__dirname, '../../uploads/productos');

/** Ruta completa del archivo fijo de la lista de precios. */
export const getRutaListaPrecios = () =>
  path.join(getCarpetaProductos(), NOMBRE_LISTA);

export interface FilaListaPrecios {
  codigo: string;
  producto: string;
  presentacion: string;
  /** Valor de la columna "Precio OFERTA ESPECIAL $/kg" ya parseado (null si viene vacío). */
  precioOfertaKg: number | null;
  disponibilidad: string;
}

// Bandas horizontales de columnas (en puntos, origen arriba-izquierda). Están
// calibradas con el layout real del PDF exportado desde Excel.
const X_CODE_MAX = 98;
const X_PRODUCTO_MAX = 299.5;
const X_PRESENTACION_MAX = 384;
const X_PROCEDENCIA_MAX = 432;
const X_PRECIO_MAX = 476;

/** Altura (y, desde arriba) a partir de la cual empiezan las filas de datos. */
const Y_DATOS_MIN = 97;

// pdfjs-dist es ESM; en este proyecto CommonJS se carga con import() dinámico.
// Se resuelve la ruta con require.resolve para que TS no intente resolverla
// de forma estática (no hay declaraciones de tipos en el subpath legacy).
const PDFJS_PATH = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');

type PdfjsModule = {
  getDocument: (params: { data: Uint8Array }) => { promise: Promise<any> };
};

let pdfjsPromise: Promise<PdfjsModule> | null = null;

const getPdfjs = (): Promise<PdfjsModule> => {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_PATH).then((m) => m as unknown as PdfjsModule);
  }
  return pdfjsPromise;
};

interface ItemTexto {
  x: number;
  y: number;
  texto: string;
}

const colapsarEspacios = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Carga un PDF (pdfjs), extrae los items de texto con su posición (x, eje
 * horizontal; y, desde arriba) y los devuelve agrupados por fila.
 */
const extraerFilas = async (buffer: Buffer): Promise<ItemTexto[][]> => {
  const pdfjs = await getPdfjs();
  const doc: any = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
  }).promise;
  const filas: ItemTexto[][] = [];

  try {
    for (let p = 1; p <= (doc.numPages || 1); p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const tokens: ItemTexto[] = [];
      for (const it of content.items as any[]) {
        const texto = colapsarEspacios(it?.str || '');
        if (!texto) continue;
        const tf = it.transform || [];
        tokens.push({
          x: tf[4] || 0,
          y: viewport.height - (tf[5] || 0),
          texto,
        });
      }

      // Agrupa por fila: las filas están separadas ~10px; se unen los tokens
      // cuya distancia en y al inicio del clúster es < 2.5px (absorbe la
      // variación de baseline entre columnas de una misma fila).
      tokens.sort((a, b) => a.y - b.y || a.x - b.x);
      let filaActual: ItemTexto[] = [];
      let yInicio = 0;
      for (const t of tokens) {
        if (filaActual.length === 0 || t.y - yInicio <= 2.5) {
          if (filaActual.length === 0) yInicio = t.y;
          filaActual.push(t);
        } else {
          filas.push(filaActual.sort((a, b) => a.x - b.x));
          filaActual = [t];
          yInicio = t.y;
        }
      }
      if (filaActual.length) filas.push(filaActual);
    }
  } finally {
    try {
      await doc.destroy();
    } catch {
      // destruir el documento: no crítico
    }
  }

  return filas;
};

const CODIGO_RE = /^[A-Z]{1,6}\d/;

const parsearPrecio = (s: string): number | null => {
  const limpio = colapsarEspacios(s);
  if (!limpio || !/^[\d.,]+$/.test(limpio)) return null;
  if (limpio.includes(',') && limpio.includes('.')) {
    // Formato es-VE con miles y decimales: 1.234,56
    const [enteros, ...dec] = limpio.split(',');
    const valor = Number(`${enteros.replace(/\./g, '')}.${dec.join('')}`);
    return Number.isNaN(valor) ? null : valor;
  }
  if (limpio.includes(',')) {
    const valor = Number(limpio.replace(',', '.'));
    return Number.isNaN(valor) ? null : valor;
  }
  if (limpio.includes('.')) {
    // Un solo punto: si es grupo de miles (2.500) se interpreta como miles; si
    // no, se trata como decimal (2.5).
    if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
      const valor = Number(limpio.replace(/\./g, ''));
      return Number.isNaN(valor) ? null : valor;
    }
    const valor = Number(limpio);
    return Number.isNaN(valor) ? null : valor;
  }
  const valor = Number(limpio);
  return Number.isNaN(valor) ? null : valor;
};

const limpiarCelda = (tokens: ItemTexto[]) =>
  tokens
    .map((t) => t.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Parsea el PDF de la lista de precios y devuelve una fila por producto.
 * Se omite la cabecera (y < 97), las filas que no corresponden a productos y
 * las notas al pie.
 */
export const parsearListaPrecios = async (buffer: Buffer): Promise<FilaListaPrecios[]> => {
  const filas = await extraerFilas(buffer);
  const resultado: FilaListaPrecios[] = [];

  for (const fila of filas) {
    if (!fila.length || fila[0].y < Y_DATOS_MIN) continue;

    const celdas: Record<string, ItemTexto[]> = {
      codigo: [],
      producto: [],
      presentacion: [],
      procedencia: [],
      precio: [],
      disponibilidad: [],
    };

    for (const t of fila) {
      if (t.x < X_CODE_MAX) celdas.codigo.push(t);
      else if (t.x < X_PRODUCTO_MAX) celdas.producto.push(t);
      else if (t.x < X_PRESENTACION_MAX) celdas.presentacion.push(t);
      else if (t.x < X_PROCEDENCIA_MAX) celdas.procedencia.push(t);
      else if (t.x < X_PRECIO_MAX) celdas.precio.push(t);
      else celdas.disponibilidad.push(t);
    }

    const codigo = limpiarCelda(celdas.codigo).toUpperCase();
    let producto = limpiarCelda(celdas.producto);
    const presentacion = limpiarCelda(celdas.presentacion);

    // Marca de nota al pie '*' que a veces acompaña al producto.
    producto = producto.replace(/\s*\*+$/g, '').trim();

    // Es una fila de producto si tiene código, o si tiene producto y
    // presentación (hay filas de la lista sin código). Las filas sueltas de
    // secciones/notas no califican.
    const conCodigo = codigo.length > 0 && CODIGO_RE.test(codigo);
    const conProductoPresentacion = producto.length > 0 && presentacion.length > 0;
    if (!conCodigo && !conProductoPresentacion) continue;

    let precio: number | null = null;
    if (celdas.precio.length) {
      precio = parsearPrecio(limpiarCelda(celdas.precio));
    }

    const disponibilidad = limpiarCelda(celdas.disponibilidad)
      .replace(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2705}\u{1F680}\u{1F69A}]/gu,
        '',
      )
      .trim();

    resultado.push({
      codigo,
      producto,
      presentacion,
      precioOfertaKg: precio,
      disponibilidad,
    });
  }

  return resultado;
};

/** Lee el archivo fijo `lista_precios.pdf` del disco (lanza si no existe). */
export const leerListaPreciosDesdeDisco = (): Buffer => {
  const ruta = getRutaListaPrecios();
  if (!fs.existsSync(ruta)) {
    throw new Error('No se ha subido la lista de precios (lista_precios.pdf)');
  }
  return fs.readFileSync(ruta);
};
