import { Router, Request, Response } from 'express';
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  registrarUsuario,
  updateUsuario,
  actualizarMiPerfil,
  deleteUsuario,
} from '../controllers/usuariosControllers';
import { asyncHandler } from '../middlewares/asyncHandler';
import verificarToken from '../middlewares/jwtHandler';

const router: Router = Router();

// GET /usuarios (lista de vendedores) → solo admin (verificado también en el controlador)
router.get('/usuarios', verificarToken, asyncHandler(getUsuarios));

// GET /usuarios/:id → perfil propio o cualquier perfil si eres admin
router.get('/usuarios/:id', verificarToken, asyncHandler(getUsuarioById));

// POST /usuarios → público a propósito: es el fallback del signup en el frontend
// (AuthProvider llama aquí tras crear el usuario en Supabase Auth).
// Nota: Supabase también crea el perfil mediante el trigger `handle_new_user()`.
router.post('/usuarios', asyncHandler(createUsuario));

// POST /usuarios/registrar → SOLO el admin principal (Omar Contreras).
// Crea un usuario NUEVO en Supabase Auth + su perfil en vendedores con el rol
// elegido (vendedor o admin). La verificación del gate se hace en el controlador.
router.post('/usuarios/registrar', verificarToken, asyncHandler(registrarUsuario));

// PUT /usuarios/perfil → el usuario autenticado actualiza SU PROPIO perfil
// (nombre, apellido, telefono). ⚠ Debe declararse ANTES de /usuarios/:id para
// que Express no interprete "perfil" como un :id.
router.put('/usuarios/perfil', verificarToken, asyncHandler(actualizarMiPerfil));

// PUT y DELETE → solo admin (verificado también en el controlador)
router.put('/usuarios/:id', verificarToken, asyncHandler(updateUsuario));

router.delete('/usuarios/:id', verificarToken, asyncHandler(deleteUsuario));

export default router;
