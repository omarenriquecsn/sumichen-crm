import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  // Tu lógica aquí
  const { id } = req.query;
  // Simulación de respuesta
  res.status(200).json({ usuario: { id, nombre: 'Ejemplo' } });
}
