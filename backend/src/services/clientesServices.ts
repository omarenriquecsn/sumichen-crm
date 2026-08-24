import { get } from 'http';
import { Cliente } from '../entities/Clientes';
import {
  getClienteById,
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  deleteClienteDefinitivamente,
  getOneCliente
} from '../repositories/clientesRepository';
import { updateMetasClientesService } from './metasServices';

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
  const cliente = await getOneCliente(id);
  if(cliente && clienteData.estado  && cliente.estado !== clienteData.estado )   {
    clienteData.fecha_estado = new Date();
    clienteData.estado_anterior = cliente?.estado;
    clienteData.fecha_actualizacion = new Date();
  }
  const clienteActualizado = await updateCliente(id, clienteData);
  return {
    message: 'Cliente actualizado',
    data: clienteActualizado,
  };
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


