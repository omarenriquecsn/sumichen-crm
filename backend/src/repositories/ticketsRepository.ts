import { AppDataSource } from '../config/dataBaseConfig';
import { Ticket } from '../entities/Tickets';
import { EstadoTicketEnum } from '../enums/EstadoTicketEnum';

export const getTickets = async () => {
  const ticketRepository = AppDataSource.getRepository(Ticket);
  return await ticketRepository.find({ order: { fecha_creacion: 'DESC' } });
};

export const getTicketById = async (id: string) => {
  const ticketRepository = AppDataSource.getRepository(Ticket);
  return await ticketRepository.find({
    where: { vendedor_id: id },
    order: { fecha_creacion: 'DESC' },
  });
};

export const createTicket = async (ticketData: Partial<Ticket>) => {
  const ticketRepository = AppDataSource.getRepository(Ticket);
  const newTicket = ticketRepository.create(ticketData);
  return await ticketRepository.save(newTicket);
};

export const updateTicket = async (id: string, ticketData: Partial<Ticket>) => {
  const ticketRepository = AppDataSource.getRepository(Ticket);
  await ticketRepository.update(id, ticketData);
  return await ticketRepository.findOneBy({ id });
};

export const deleteTicket = async (id: string) => {
  const ticketRepository = AppDataSource.getRepository(Ticket);
  return await ticketRepository.update(id, {
    estado: EstadoTicketEnum.CERRADO,
  });
};

export async function generarNumero(): Promise<string> {
  const repo = AppDataSource.getRepository(Ticket);

  const ultimo = await repo
    .createQueryBuilder('pedido')
    .select('MAX(pedido.numero)', 'max')
    .getRawOne();

  const actual = parseInt(ultimo?.max?.split('-')[1] ?? '0');
  const siguiente = actual + 1;

  return `TK-${siguiente.toString().padStart(4, '0')}`;
}
