import { Actividad } from '../entities/Actividades';
import { Ticket } from '../entities/Tickets';
import { ActividadesEnum } from '../enums/ActividadesEnum';
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  generarNumero,
} from '../repositories/ticketsRepository';
import { getUsuarioByIdDb } from '../repositories/usuariosRepository';
import { ApiError } from '../utils/ApiError';
import {
  createActividadesService,
  getActividadesByIdService,
  updateActividadesService,
} from './actividadesServices';
import sendWhatsAppMessage from '../utils/sendWhatsapp';
import { enviarPushAAdmins } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';


export const getTicketsService = async () => {
  const tickets = await getTickets();
  return tickets;
};

export const getTicketsByVendedorService = async (id: string, rol: string) => {
  if (rol === 'admin') {
    const tickets = await getTickets();
    return tickets;
  }
  const tickets = await getTickets();
  return tickets.filter((ticket) => ticket.vendedor_id === id);
};

export const getTicketsByIdService = async (id: string) => {
  const ticket = await getTicketById(id);
  return ticket;
};

export const createTicketsService = async (ticketData: Partial<Ticket>) => {
  if (!ticketData.vendedor_id)
    throw new ApiError('El ticket debe tener el id del vendedor');

  console.log(ticketData.vendedor_id);
  const vendedor = await getUsuarioByIdDb(ticketData.vendedor_id);

  if (!vendedor) throw new ApiError('El vendedor no existe');
  ticketData.numero = await generarNumero();

  const newTicket = await createTicket(ticketData);
  
  if (!newTicket) throw new ApiError('No se pudo crear el ticket');

  const newActividad: Partial<Actividad> = {
    titulo: newTicket.titulo,
    tipo: ActividadesEnum.TAREA,
    descripcion: newTicket.descripcion,
    fecha: new Date(),
    vendedor_id: newTicket.vendedor_id,
    cliente_id: newTicket.cliente_id,
    id_tipo_actividad: newTicket.id
  };
  await createActividadesService(newActividad);

  // Web Push — evento `ticket_nuevo`: se notifica a los admins.
  try {
    const vendedorNombre = vendedor ? `${vendedor.nombre} ${vendedor.apellido || ''}`.trim() : '';
    await enviarPushAAdmins(
      {
        titulo: '🎫 Nuevo ticket',
        cuerpo: `Ticket Nro ${newTicket.numero}: ${newTicket.titulo}${vendedorNombre ? ` (${vendedorNombre})` : ''}`,
        url: '#/tickets',
      },
      EventoNotificacionEnum.TICKET_NUEVO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de ticket nuevo:', error);
  }

  //  await sendWhatsAppMessage('ticket')
  return {
    message: 'Ticket creado',
    data: newTicket,
  };
};

export const updateTicketsService = async (
  id: string,
  ticketData: Partial<Ticket>,
  rol: string
) => {
  const ticketActualizado = await updateTicket(id, ticketData);

  if (!ticketActualizado) throw new ApiError('No se pudo actualizar el ticket');

  if (
    ticketActualizado.estado === 'cerrado' ||
    ticketActualizado.estado === 'resuelto'
  ) {
    const actividades = await getActividadesByIdService(
      ticketActualizado.vendedor_id,
      rol
    );

    const actividadActualizada = actividades.find(
      (actividad) =>
        actividad.cliente_id === ticketActualizado.cliente_id &&
        actividad.titulo === ticketActualizado.titulo &&
        actividad.descripcion === ticketActualizado.descripcion &&
        new Date(actividad.fecha_creacion).getDate() ===
          new Date(ticketActualizado.fecha_creacion).getDate(),
    )?? actividades.find(
      (actividad) =>
        actividad.id_tipo_actividad === ticketActualizado.id &&
        actividad.tipo === ActividadesEnum.TAREA
    );
    if (!actividadActualizada)
      throw new Error('No se pudo actualizar la actividad');

    await updateActividadesService(actividadActualizada.id, {
      completado: true,
    });
  }
  return {
    message: 'Ticket actualizado',
    data: ticketActualizado,
  };
};

export const deleteTicketsService = async (id: string) => {
  await deleteTicket(id);
  return {
    message: 'Ticket cerrado',
  };
};
