import { get } from 'http';
import { Cliente } from '../entities/Clientes';
import {
  getClienteById,
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  deleteClienteDefinitivamente,
  getOneCliente,
  actualizarProyeccion,
} from '../repositories/clientesRepository';
import { updateMetasClientesService } from './metasServices';
import {
  normalizarRif,
  FilaProyeccion,
} from '../utils/proyeccionesExcel';

export const getClientesService = async () => {
  const clientes = await getClientes();
  return clientes;
};

export const getClientesVendedorService = async (id: string) => {
  const clientes = await getClientes();
  return clientes.filter((cliente) => cliente.vendedor_id === id);
};

export const getClientesByIdService = async (id: string, rol: string) => {
  if (rol === 'admin') {
    const clientes = await getClientes();
  return clientes
  }
  const cliente = await getClienteById(id);
  return cliente;
};

export const createClientesService = async (clienteData: Partial<Cliente>, rol: string) => {
  const nuevoCliente = await createCliente(clienteData);
  const mesActual = new Date().getMonth() + 1;
  updateMetasClientesService(
    nuevoCliente.vendedor_id,
    1,
    mesActual,
    rol
  );
  return nuevoCliente;
};

export const updateClientesService = async (
  id: string,
  clienteData: Partial<Cliente>,
) => {
  // `proyeccion_venta` solo se modifica vía el endpoint de carga por Excel
  // (POST /clientes/proyecciones); la edición genérica nunca la toca.
  const { proyeccion_venta: _proyeccion, ...datosSeguros } = clienteData;
  const cliente = await getOneCliente(id);
  if (cliente && datosSeguros.estado && cliente.estado !== datosSeguros.estado) {
    datosSeguros.fecha_estado = new Date();
    datosSeguros.estado_anterior = cliente?.estado;
    datosSeguros.fecha_actualizacion = new Date();
  }
  const clienteActualizado = await updateCliente(id, datosSeguros);
  return {
    message: 'Cliente actualizado',
    data: clienteActualizado,
  };
};

export interface ResumenProyecciones {
  totalFilas: number;
  coincidencias: number;
  actualizados: number;
  sinCambio: number;
  sinCoincidencia: string[];
  sinPermiso: string[];
}

/**
 * Aplica las proyecciones leídas del Excel a los clientes que coinciden por RIF
 * (solo actualiza `proyeccion_venta`). Un vendedor solo puede escribir
 * proyecciones de sus propios clientes; el admin actualiza todos.
 */
export const aplicarProyeccionesService = async (
  filas: FilaProyeccion[],
  rol: string,
  vendedorDbId?: string,
): Promise<ResumenProyecciones> => {
  const clientes = await getClientes();
  const mapaRif = new Map<string, Cliente>();
  for (const c of clientes) {
    const key = normalizarRif(c.rif ?? '');
    if (key && !mapaRif.has(key)) mapaRif.set(key, c);
  }

  const resumen: ResumenProyecciones = {
    totalFilas: filas.length,
    coincidencias: 0,
    actualizados: 0,
    sinCambio: 0,
    sinCoincidencia: [],
    sinPermiso: [],
  };

  for (const fila of filas) {
    const cliente = mapaRif.get(fila.rif);
    if (!cliente) {
      resumen.sinCoincidencia.push(fila.rifOriginal || fila.rif);
      continue;
    }
    if (rol !== 'admin' && cliente.vendedor_id !== vendedorDbId) {
      resumen.sinPermiso.push(fila.rifOriginal || fila.rif);
      continue;
    }
    resumen.coincidencias++;
    const actual = Number(cliente.proyeccion_venta ?? 0);
    const nuevo = fila.proyeccion;
    if (actual === nuevo) {
      resumen.sinCambio++;
    } else {
      await actualizarProyeccion(cliente.id, nuevo);
      resumen.actualizados++;
    }
  }

  return resumen;
};

export const deleteClientesService = async (id: string) => {
  const clienteEliminado = await deleteCliente(id);
  return {
    message: 'Cliente eliminado',
    data: clienteEliminado,
  };
};

export const deleteClientesDefinitivamenteService = async (id: string) => {
  const clienteEliminado = await deleteClienteDefinitivamente(id);
  return {
    message: 'Cliente eliminado definitivamente',
    data: clienteEliminado,
  };
};


