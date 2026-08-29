import { Request, Response } from 'express';
import {
  getUsuariosService,
  getUsuariosByIdService,
  createUsuariosService,
  updateUsuariosService,
  deleteUsuariosService,
  registrarUsuarioService,
  actualizarMiPerfilService,
} from '../services/usuariosServices';
import { ApiError } from '../utils/ApiError';
import { Vendedor } from '../entities/Vendedores';

// Helper: determina si el usuario autenticado es admin.
// Punto 5: usa el rol AUTORITATIVO (leído de la tabla `vendedores` en
// jwtHandler), NO el rol auto-reportado del JWT.
const esAdmin = (req: Request): boolean => req.user?.rol === 'admin';

// Admin PRINCIPAL: Omar Contreras. Única persona autorizada para registrar
// nuevos vendedores o admins desde la sección "Registrar Usuarios".
// Identificado por su supabase_id (auth.users.id en Supabase).
const OMAR_SUPABASE_ID = 'c0794db2-460a-4ec7-b89a-c1243c544b65';

export const esOmar = (req: Request): boolean =>
  req.user?.rol === 'admin' && req.user?.id === OMAR_SUPABASE_ID;

export const getUsuarios = async (req: Request, res: Response) => {
  // Requiere JWT (verificado en la ruta). Cualquier usuario autenticado puede
  // ver la lista de vendedores: el frontend la usa en casi todas las páginas
  // (vendedores y admin) para mostrar el nombre del vendedor asignado a cada
  // cliente/pedido. La restricción admin-only del Punto 1 rompía las páginas
  // de vendedor, así que se relajó a "cualquier usuario autenticado".
  const usuarios = await getUsuariosService();
  if (usuarios.length === 0) throw new ApiError('No hay usuarios disponibles');
  res.json(usuarios);
};

export const getUsuarioById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const esPropioPerfil = req.user?.id === id;
  if (!esAdmin(req) && !esPropioPerfil) {
    throw new ApiError('No autorizado: solo puedes ver tu propio perfil', 403);
  }
  const usuario = await getUsuariosByIdService(id);
  if (!usuario) throw new ApiError('Usuario no encontrado', 404);
  res.json(usuario);
};

export const createUsuario = async (req: Request, res: Response) => {
  // Público a propósito: es el fallback del signup (ver notas en usuariosRoutes.ts)
  const nuevoUsuario = await createUsuariosService(req.body);
  if (!nuevoUsuario) throw new ApiError('No se pudo crear el usuario', 400);
  res.status(201).json(nuevoUsuario);
};

export const registrarUsuario = async (req: Request, res: Response) => {
  // Solo Omar Contreras puede registrar nuevos vendedores o admins.
  if (!esOmar(req)) {
    throw new ApiError(
      'No autorizado: solo el administrador principal puede registrar usuarios',
      403,
    );
  }
  const resultado = await registrarUsuarioService(req.body);
  res.status(201).json(resultado);
};

export const updateUsuario = async (req: Request, res: Response) => {
  if (!esAdmin(req)) throw new ApiError('No autorizado: se requiere rol admin', 403);
  const { id } = req.params;
  const actualizado = await updateUsuariosService(id, req.body);
  if (!actualizado) throw new ApiError('No se pudo actualizar el usuario', 400);
  res.json(actualizado);
};

// Configuración → Perfil: el usuario autenticado actualiza SU PROPIO perfil
// (nombre, apellido, telefono). `req.user.id` es el supabase_id (decoded.sub).
export const actualizarMiPerfil = async (req: Request, res: Response) => {
  const actualizado = await actualizarMiPerfilService(req.user?.id as string, req.body);
  res.json(actualizado);
};

export const deleteUsuario = async (req: Request, res: Response) => {
  if (!esAdmin(req)) throw new ApiError('No autorizado: se requiere rol admin', 403);
  const { id } = req.params;
  const borrado = await deleteUsuariosService(id);
  if (!borrado) throw new ApiError('No se pudo eliminar el usuario', 400);
  res.status(204).send();
};
