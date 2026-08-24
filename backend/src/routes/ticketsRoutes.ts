import { Router, Request, Response } from 'express';
import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketsByVendedor,
} from '../controllers/ticketsControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

router.get('/tickets', verificarToken, asyncHandler(getTickets));

router.get('/tickets/:id', verificarToken, asyncHandler(getTicketsByVendedor));

router.post('/tickets', verificarToken, asyncHandler(createTicket));

router.put('/tickets/:id', verificarToken, asyncHandler(updateTicket));

router.delete('/tickets/:id', verificarToken, asyncHandler(deleteTicket));

export default router;
