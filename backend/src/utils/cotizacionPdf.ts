/**
 * Parser de cotizaciones (PDF) para precargar el formulario de pedidos.
 *
 * El PDF lo genera el ERP de Sumichem (ej. "COTIZACION 1719 INVERSIONES 2300
 * 08-09-2026 18.pdf") e incluye:
 *   - Datos del cliente: RIF, nombre, dirección, condición de pago.
 *   - Cabecera: cotización, fecha emisión/entrega, transporte.
 *   - Tabla de productos: Código | Modelo | Descripción | Alm. | Cantidad |
 *     Unid. | Precio Unitario | % Desc. | %I.V.A. | I.V.A. | Neto.
 *
 * Lo que NO trae el PDF es el `precio_base`; solo el precio unitario final.
 * El % de negociación y la moneda se derivan del NOMBRE del archivo:
 *   - los últimos 2 caracteres son el % de negociación;
 *   - si son "00" la venta es en dólares (usd), si son > 0 es en bolívares (bs).
 *
 * Este parser NO persiste nada: se usa para llenar el formulario y el archivo
 * se descarta. Se apoya en pdf.js (pdfjs-dist), igual que `listaPreciosPdf.ts`.
 */

// pdfjs-dist es ESM; en este proyecto CommonJS se carga con import() dinámico.
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

export interface ProductoCotizacion {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** true si la columna %I.V.A. trae "(E)" (exento). */
  exento: boolean;
  neto: number | null;
}

export interface CotizacionParseada {
  cotizacion: string;
  cliente: {
    rif: string;
    rifNormalizado: string;
    nombre: string;
    direccion: string;
    condicionPago: string;
  };
  fechaEmision: string | null;
  fechaEntrega: string | null;
  tipoPago: 'contado' | 'credito' | null;
  /** Días de crédito del PDF (ej. "CREDITO A 15" → 15); null si no aplica. */
  diasCredito: number | null;
  transporte: 'interno' | 'externo' | null;
  moneda: 'usd' | 'bs';
  porcentajeNegociacion: number;
  productos: ProductoCotizacion[];
}

const colapsarEspacios = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

/** Normaliza para comparar etiquetas: minúsculas y sin tildes. */
const normalizar = (s: string) =>
  colapsarEspacios(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Deja el RIF solo con letras y dígitos en mayúsculas (para comparar). */
export const normalizarRif = (s: string) =>
  (s || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

/** Código de producto tipo MP10053 / S000013. */
const CODIGO_RE = /^[A-Z]{1,6}\d/;
const RIF_RE = /^[VEJPG]-?\d{6,10}-?\d$/i;
const FECHA_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;

/**
 * Bandas horizontales (x) de la tabla de productos, calibradas con el layout
 * real del PDF del ERP. El valor de la descripción arranca a la izquierda de su
 * encabezado, por eso se usan bandas fijas y no la posición de la cabecera.
 */
const BANDAS = {
  codigo: 60,
  descripcion: 205,
  alm: 230,
  cantidad: 280,
  unidad: 305,
  precio: 368,
  descuento: 395,
  iva: 460,
  ivaValor: 520,
};

/** Límite de x de la columna izquierda (datos del cliente); el resto es la derecha. */
const X_COLUMNA_DERECHA = 380;

/** Tolerancia vertical (y) para considerar tokens de la misma fila. */
const DY_FILA = 5;

/**
 * Carga un PDF (pdfjs) y devuelve, por página, todos los tokens de texto con su
 * posición (x horizontal, y desde arriba).
 */
const extraerTokensPorPagina = async (buffer: Buffer): Promise<ItemTexto[][]> => {
  const pdfjs = await getPdfjs();
  const doc: any = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
  }).promise;
  const paginas: ItemTexto[][] = [];

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
      tokens.sort((a, b) => a.y - b.y || a.x - b.x);
      paginas.push(tokens);
    }
  } finally {
    try {
      await doc.destroy();
    } catch {
      // destruir el documento: no crítico
    }
  }

  return paginas;
};

/** Convierte un texto numérico del PDF a número (coma = miles, punto = decimal). */
const parsearNumero = (s: string): number | null => {
  const limpio = colapsarEspacios(s).replace(/[^\d.,-]/g, '');
  if (!limpio) return null;
  const tieneComa = limpio.includes(',');
  const tienePunto = limpio.includes('.');
  if (tieneComa && tienePunto) {
    const v = Number(limpio.replace(/,/g, ''));
    return Number.isNaN(v) ? null : v;
  }
  if (tieneComa) {
    // "1,234" (miles) vs "1,23" (decimal)
    if (/^-?\d{1,3}(,\d{3})+$/.test(limpio)) {
      const v = Number(limpio.replace(/,/g, ''));
      return Number.isNaN(v) ? null : v;
    }
    const v = Number(limpio.replace(',', '.'));
    return Number.isNaN(v) ? null : v;
  }
  const v = Number(limpio);
  return Number.isNaN(v) ? null : v;
};

const fechaAIso = (s: string | null): string | null => {
  if (!s) return null;
  const m = s.match(FECHA_RE);
  if (!m) return null;
  const dia = m[1].padStart(2, '0');
  const mes = m[2].padStart(2, '0');
  const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${anio}-${mes}-${dia}`;
};

/**
 * Busca la etiqueta (`esEtiqueta`) y devuelve los tokens de su derecha en la
 * misma fila (±DY_FILA en y) que cumplan `esValor`.
 */
const buscarValores = (
  tokens: ItemTexto[],
  esEtiqueta: (t: ItemTexto) => boolean,
  esValor: (t: ItemTexto) => boolean,
): ItemTexto[] => {
  for (const et of tokens) {
    if (!esEtiqueta(et)) continue;
    const valores = tokens.filter(
      (t) =>
        t.x > et.x + 5 &&
        Math.abs(t.y - et.y) <= DY_FILA &&
        esValor(t),
    );
    if (valores.length) return valores;
  }
  return [];
};

const etiqueta = (nombre: string) => (t: ItemTexto) =>
  normalizar(t.texto).startsWith(nombre);

/**
 * Deriva % de negociación y moneda desde el nombre del archivo: los 2 últimos
 * caracteres son el porcentaje; "00" => dólares, > 0 => bolívares.
 */
export const parsearSufijoNombreArchivo = (
  nombreArchivo: string,
): { porcentajeNegociacion: number; moneda: 'usd' | 'bs' } => {
  const base = (nombreArchivo || '').replace(/\.[^.]+$/, '').trim();
  const sufijo = base.slice(-2);
  if (!/^\d{2}$/.test(sufijo)) {
    return { porcentajeNegociacion: 0, moneda: 'usd' };
  }
  const pct = parseInt(sufijo, 10);
  return { porcentajeNegociacion: pct, moneda: pct === 0 ? 'usd' : 'bs' };
};

export const parsearCotizacionPdf = async (
  buffer: Buffer,
  nombreArchivo: string,
): Promise<CotizacionParseada> => {
  const paginas = await extraerTokensPorPagina(buffer);
  const tokens = paginas.flat();

  // --- Cliente ---
  // Hay 2 "R.I.F.:" (el de Sumichem arriba y el del cliente). El del cliente
  // está en el margen izquierdo (x < 20).
  const rif = buscarValores(
    tokens,
    (t) => normalizar(t.texto) === 'r.i.f.:' && t.x < 20,
    (t) => RIF_RE.test(t.texto),
  )[0]?.texto ?? '';

  const nombre = buscarValores(
    tokens,
    (t) => normalizar(t.texto).startsWith('cliente:') && t.x < 20,
    (t) => t.x < X_COLUMNA_DERECHA && !RIF_RE.test(t.texto),
  )
    .map((t) => t.texto)
    .join(' ')
    .trim();

  const direccion = buscarValores(
    tokens,
    (t) => normalizar(t.texto).startsWith('direccion:') && t.x < 20,
    (t) => t.x < X_COLUMNA_DERECHA,
  )
    .map((t) => t.texto)
    .join(' ')
    .trim();

  // --- Cabecera ---
  const cotizacion =
    buscarValores(tokens, etiqueta('cotizacion:'), () => true)[0]?.texto ?? '';

  // "Condic. Pago: CREDITO A 15" vive en la columna derecha de la cabecera, así
  // que no se restringe por x. Se incluye el token de la etiqueta por si el
  // valor viene embebido en el mismo texto.
  const condicionPago = (() => {
    for (const et of tokens) {
      if (!normalizar(et.texto).includes('pago')) continue;
      const derecha = tokens
        .filter((t) => t.x > et.x + 5 && Math.abs(t.y - et.y) <= DY_FILA)
        .map((t) => t.texto)
        .join(' ');
      const texto = `${et.texto} ${derecha}`.trim();
      if (/credito|contado/i.test(texto)) return texto;
    }
    return '';
  })();
  const tipoPago: 'contado' | 'credito' | null = /credito/i.test(condicionPago)
    ? 'credito'
    : /contado/i.test(condicionPago)
      ? 'contado'
      : null;
  // "CREDITO A 15" → 15; "CONTADO" → sin número.
  const diasCreditoMatch = condicionPago.match(/\d{1,3}/);
  const diasCredito =
    tipoPago === 'credito' && diasCreditoMatch
      ? parseInt(diasCreditoMatch[0], 10)
      : null;

  const fechaEmision = fechaAIso(
    buscarValores(tokens, etiqueta('emision:'), (t) => FECHA_RE.test(t.texto))[0]?.texto ?? null,
  );
  const fechaEntrega = fechaAIso(
    buscarValores(tokens, etiqueta('entrega:'), (t) => FECHA_RE.test(t.texto))[0]?.texto ?? null,
  );

  const transporteTexto = buscarValores(tokens, etiqueta('transporte:'), () => true)
    .map((t) => t.texto)
    .join(' ')
    .trim();
  let transporte: 'interno' | 'externo' | null = null;
  if (/cliente/i.test(transporteTexto)) transporte = 'externo';
  else if (/interno|sumichem/i.test(transporteTexto)) transporte = 'interno';

  // --- Productos ---
  const productos: ProductoCotizacion[] = [];
  const codigosVistos = new Set<string>();
  for (const pagina of paginas) {
    for (const codeToken of pagina) {
      if (codeToken.x >= BANDAS.codigo) continue;
      const codigo = codeToken.texto.replace(/\s+/g, '').toUpperCase();
      if (!CODIGO_RE.test(codigo) || codigosVistos.has(codigo)) continue;

      // Fila del producto: tokens en la ventana vertical alrededor del código.
      const fila = pagina.filter((t) => Math.abs(t.y - codeToken.y) <= DY_FILA);
      const enBanda = (min: number, max: number) =>
        fila
          .filter((t) => t.x >= min && t.x < max)
          .map((t) => t.texto)
          .join(' ')
          .trim();

      const descripcion = enBanda(BANDAS.codigo, BANDAS.descripcion);
      const cantidad = parsearNumero(enBanda(BANDAS.alm, BANDAS.cantidad));
      const precioUnitario = parsearNumero(enBanda(BANDAS.unidad, BANDAS.precio));
      const ivaTexto = enBanda(BANDAS.descuento, BANDAS.ivaValor);
      const neto = parsearNumero(enBanda(BANDAS.ivaValor, Infinity));

      if (cantidad === null || precioUnitario === null) continue;

      codigosVistos.add(codigo);
      productos.push({
        codigo,
        descripcion,
        cantidad,
        precioUnitario,
        exento: /\(?\s*e\s*\)?/i.test(ivaTexto) || !/\d/.test(ivaTexto),
        neto,
      });
    }
  }

  const { porcentajeNegociacion, moneda } = parsearSufijoNombreArchivo(nombreArchivo);

  return {
    cotizacion,
    cliente: {
      rif,
      rifNormalizado: normalizarRif(rif),
      nombre,
      direccion,
      condicionPago,
    },
    fechaEmision,
    fechaEntrega,
    tipoPago,
    diasCredito,
    transporte,
    moneda,
    porcentajeNegociacion,
    productos,
  };
};
