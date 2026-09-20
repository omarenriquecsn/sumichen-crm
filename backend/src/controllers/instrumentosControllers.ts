import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import {
  getTiposInstrumentoService,
  crearTipoInstrumentoService,
  actualizarTipoInstrumentoService,
  getStockInstrumentosService,
  getInstrumentosPorClienteService,
  registrarEntradaInstrumentoService,
  registrarBajaInstrumentoService,
  registrarAjusteInstrumentoService,
  getMovimientosInstrumentoService,
  getPedidoInstrumentosService,
  entregarInstrumentosPedidoService,
  devolverInstrumentoLineaService,
  bajaInstrumentoLineaService,
} from '../services/instrumentosServices';
import { getPedidoInstrumentoById } from '../repositories/instrumentosRepository';
import { getPedido } from '../repositories/pedidosRepository';
import { AlmacenEnum } from '../enums/AlmacenEnum';

const soloAdmin = (req: Request) => {
  if (req.user?.rol !== 'admin') {
    throw new ApiError('Solo administradores', 403);
  }
};

const puedeGestionarPedido = async (
  pedidoId: string,
  req: Request,
): Promise<void> => {
  if (req.user?.rol === 'admin') return;
  const pedido = await getPedido(pedidoId);
  if (!pedido || pedido.vendedor_id !== req.user?.vendedor_db_id) {
    throw new ApiError('No puedes gestionar este pedido', 403);
  }
};

// ------------------------------ Catálogo ------------------------------

export const getTipos = async (req: Request, res: Response) => {
  const tipos = await getTiposInstrumentoService(req.query.todos !== 'true');
  res.json(tipos);
};

export const crearTipo = async (req: Request, res: Response) => {
  soloAdmin(req);
  const tipo = await crearTipoInstrumentoService(req.body?.nombre);
  res.status(201).json(tipo);
};

export const actualizarTipo = async (req: Request, res: Response) => {
  soloAdmin(req);
  const tipo = await actualizarTipoInstrumentoService(req.params.id, {
    nombre: req.body?.nombre,
    activo: req.body?.activo,
  });
  res.json(tipo);
};

// -------------------------------- Stock -------------------------------

export const getStock = async (_req: Request, res: Response) => {
  const stock = await getStockInstrumentosService();
  res.json(stock);
};

export const getClientes = async (_req: Request, res: Response) => {
  const clientes = await getInstrumentosPorClienteService();
  res.json(clientes);
};

export const registrarEntrada = async (req: Request, res: Response) => {
  soloAdmin(req);
  const resultado = await registrarEntradaInstrumentoService(
    {
      tipo_instrumento_id: req.body?.tipo_instrumento_id,
      almacen: req.body?.almacen as AlmacenEnum,
      cantidad: Number(req.body?.cantidad),
      observacion: req.body?.observacion,
    },
    req.user?.vendedor_db_id,
  );
  res.status(201).json(resultado);
};

export const registrarBaja = async (req: Request, res: Response) => {
  soloAdmin(req);
  const baja = req.body?.baja === 'dano' ? 'dano' : 'donacion';
  const resultado = await registrarBajaInstrumentoService(
    {
      tipo_instrumento_id: req.body?.tipo_instrumento_id,
      almacen: req.body?.almacen as AlmacenEnum,
      cantidad: Number(req.body?.cantidad),
      baja,
      observacion: req.body?.observacion,
    },
    req.user?.vendedor_db_id,
  );
  res.status(201).json(resultado);
};

export const registrarAjuste = async (req: Request, res: Response) => {
  soloAdmin(req);
  const direccion = req.body?.direccion === 'salida' ? 'salida' : 'entrada';
  const resultado = await registrarAjusteInstrumentoService(
    {
      tipo_instrumento_id: req.body?.tipo_instrumento_id,
      almacen: req.body?.almacen as AlmacenEnum,
      direccion,
      cantidad: Number(req.body?.cantidad),
      observacion: req.body?.observacion,
    },
    req.user?.vendedor_db_id,
  );
  res.status(201).json(resultado);
};

export const getKardex = async (req: Request, res: Response) => {
  soloAdmin(req);
  const s = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const movimientos = await getMovimientosInstrumentoService({
    tipoInstrumentoId: s(req.query.tipo_instrumento_id),
    almacen: s(req.query.almacen),
    desde: s(req.query.desde),
    hasta: s(req.query.hasta),
  });
  res.json(movimientos);
};

// --------------------------- Pedido: líneas ---------------------------

export const getPedidoInstrumentos = async (req: Request, res: Response) => {
  const { id } = req.params;
  await puedeGestionarPedido(id, req);
  const lineas = await getPedidoInstrumentosService(id);
  res.json(lineas);
};

export const entregarPedido = async (req: Request, res: Response) => {
  const { id } = req.params;
  await puedeGestionarPedido(id, req);
  const lineas = await entregarInstrumentosPedidoService(
    id,
    req.user?.vendedor_db_id,
  );
  res.json(lineas);
};

const cargarLineaConPermiso = async (req: Request) => {
  const linea = await getPedidoInstrumentoById(req.params.lineaId);
  if (!linea) throw new ApiError('Línea de instrumentos no encontrada', 404);
  await puedeGestionarPedido(linea.pedido_id, req);
  return linea;
};

export const devolverLinea = async (req: Request, res: Response) => {
  const linea = await cargarLineaConPermiso(req);
  const actualizada = await devolverInstrumentoLineaService(
    linea.id,
    Number(req.body?.cantidad),
    req.user?.vendedor_db_id,
  );
  res.json(actualizada);
};

export const donarLinea = async (req: Request, res: Response) => {
  const linea = await cargarLineaConPermiso(req);
  const origen = req.body?.origen === 'almacen' ? 'almacen' : 'cliente';
  const actualizada = await bajaInstrumentoLineaService(
    linea.id,
    Number(req.body?.cantidad),
    origen,
    'donacion',
    req.user?.vendedor_db_id,
  );
  res.json(actualizada);
};

export const danarLinea = async (req: Request, res: Response) => {
  const linea = await cargarLineaConPermiso(req);
  const origen = req.body?.origen === 'almacen' ? 'almacen' : 'cliente';
  const actualizada = await bajaInstrumentoLineaService(
    linea.id,
    Number(req.body?.cantidad),
    origen,
    'dano',
    req.user?.vendedor_db_id,
  );
  res.json(actualizada);
};
