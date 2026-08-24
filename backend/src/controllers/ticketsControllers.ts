import { Request, Response } from 'express';
import {
  getTicketsService,
  getTicketsByIdService,
  getTicketsByVendedorService,
  createTicketsService,
  updateTicketsService,
  deleteTicketsService,
} from '../services/ticketsServices';
import { ApiError } from '../utils/ApiError';

export const getTickets = async (req: Request, res: Response) => {
  const tickets = await getTicketsService();
  if (tickets.length === 0) throw new ApiError('No hay tickets disponibles');
  res.json(tickets);
};

export const getTicketById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const ticket = await getTicketsByIdService(id);
  if (!ticket) throw new ApiError('Ticket no encontrado', 404);
  res.json(ticket);
};

export const getTicketsByVendedor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  
  const tickets = await getTicketsByVendedorService(id, rol);
  if (tickets.length === 0) throw new ApiError('No hay tickets disponibles');
  res.json(tickets);
};

export const createTicket = async (req: Request, res: Response) => {
 
  const nuevoTicket = await createTicketsService(req.body);
  if (!nuevoTicket) throw new ApiError('No se pudo crear el ticket', 400);
  res.status(201).json(nuevoTicket);
};

export const updateTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const actualizado = await updateTicketsService(id, req.body, rol);
  if (!actualizado) throw new ApiError('No se pudo actualizar el ticket', 400);
  res.json(actualizado);
};

export const deleteTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const borrado = await deleteTicketsService(id);
  if (!borrado) throw new ApiError('No se pudo eliminar el ticket', 400);
  res.status(204).send();
};
