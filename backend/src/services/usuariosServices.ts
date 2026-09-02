import { createClient } from '@supabase/supabase-js';
import { Vendedor } from '../entities/Vendedores';
import { RolesEnum } from '../enums/RolesEnum';
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  deleteUsuario,
  updateUsuario,
  updateUsuarioBySupabaseId,
} from '../repositories/usuariosRepository';
import { ApiError } from '../utils/ApiError';

export const getUsuariosService = async (opts?: { incluirAdmins?: boolean }) => {
  const usuariosDb = await getUsuarios();
  const usuarios = opts?.incluirAdmins
    ? usuariosDb
    : usuariosDb.filter((u) => u.rol === 'vendedor');
  if (usuarios.length === 0) {
    return [];
  }
  return usuarios;
};

export const getUsuariosByIdService = async (id: string) => {
  const usuario = await getUsuarioById(id);
  if (!usuario) throw new ApiError('Usuario no encontrado');
  return usuario;
};

export const createUsuariosService = async (userData: Partial<Vendedor>) => {
  // Punto 5: el rol NO se acepta del body en el signup público (POST /usuarios
  // es un fallback del signup). Todo usuario nuevo se crea como VENDEDOR;
  // promover a admin solo puede hacerlo un admin existente vía PUT /usuarios/:id.
  const nuevoUsuario = await createUsuario({
    ...userData,
    rol: RolesEnum.VENDEDOR,
  });
  return { message: 'Usuario creado', data: nuevoUsuario };
};

export const updateUsuariosService = async (
  id: string,
  userData: Partial<Vendedor>,
) => {
  const actualizado = await updateUsuario(id, userData);
  return { message: 'Actualizado Usuario', data: actualizado };
};

export const deleteUsuariosService = async (id: string) => {
  const borrado = await deleteUsuario(id);
  return { message: 'Usuario borrado', data: borrado };
};

/**
 * Actualizar el perfil del usuario AUTENTICADO desde "Configuración → Perfil".
 * Solo acepta nombre, apellido y telefono (el email vive en Supabase Auth y
 * NO se toca; rol/activo/supabase_id tampoco). Cualquier otro campo del body
 * se ignora por seguridad.
 */
export const actualizarMiPerfilService = async (
  supabaseId: string,
  data: Partial<Vendedor>,
) => {
  const perfil: Partial<Vendedor> = {};

  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string' || !data.nombre.trim()) {
      throw new ApiError('El nombre es obligatorio', 400);
    }
    perfil.nombre = data.nombre.trim();
  }

  if (data.apellido !== undefined) {
    if (typeof data.apellido !== 'string' || !data.apellido.trim()) {
      throw new ApiError('El apellido es obligatorio', 400);
    }
    perfil.apellido = data.apellido.trim();
  }

  if (data.telefono !== undefined) {
    perfil.telefono = typeof data.telefono === 'string' ? data.telefono.trim() || null : null;
  }

  if (data.sidebar_oculto !== undefined) {
    if (!Array.isArray(data.sidebar_oculto)) {
      throw new ApiError('sidebar_oculto debe ser una lista de rutas', 400);
    }
    // Normaliza: solo strings, sin vacíos, deduplicadas.
    const rutas = Array.from(
      new Set(
        data.sidebar_oculto.filter(
          (r): r is string => typeof r === 'string' && r.trim().length > 0,
        ).map((r) => r.trim()),
      ),
    );
    perfil.sidebar_oculto = rutas;
  }

  if (Object.keys(perfil).length === 0) {
    throw new ApiError('No hay campos válidos para actualizar', 400);
  }

  const actualizado = await updateUsuarioBySupabaseId(supabaseId, perfil);
  if (!actualizado) {
    throw new ApiError('No se pudo actualizar el perfil', 400);
  }
  return { message: 'Perfil actualizado', data: actualizado };
};

/**
 * Registrar un usuario NUEVO (vendedor o admin) por parte del admin principal.
 * A diferencia del POST /usuarios público (que siempre crea vendedor), este
 * servicio crea primero el usuario en Supabase Auth (admin API, confirmado) y
 * luego el perfil en `vendedores` con el rol que el administrador eligió.
 * Solo debe exponerse tras el gate del controlador (verificarToken + Omar).
 */
export const registrarUsuarioService = async (userData: {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol?: string;
}) => {
  const { email, password, nombre, apellido, rol } = userData;

  if (!email || !password || !nombre || !apellido) {
    throw new ApiError('Email, contraseña, nombre y apellido son obligatorios', 400);
  }
  if (password.length < 6) {
    throw new ApiError('La contraseña debe tener al menos 6 caracteres', 400);
  }

  const rolElegido =
    rol === RolesEnum.ADMIN ? RolesEnum.ADMIN : RolesEnum.VENDEDOR;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
  );

  // 1) Crear el usuario en Supabase Auth con confirmación inmediata
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido, rol: rolElegido },
  });

  if (error) {
    throw new ApiError(`Error al crear el usuario en Supabase: ${error.message}`, 400);
  }

  // 2) Crear el perfil en la tabla vendedores con el rol elegido.
  //    Si el perfil falla, se revierte el usuario de Auth para no dejar huérfanos.
  try {
    const nuevoVendedor = await createUsuario({
      nombre,
      apellido,
      rol: rolElegido,
      supabase_id: data.user.id,
      activo: true,
    });
    return { message: 'Usuario registrado', data: nuevoVendedor };
  } catch (perfilErr) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw new ApiError(
      `No se pudo crear el perfil del usuario: ${perfilErr instanceof Error ? perfilErr.message : perfilErr}`,
      500,
    );
  }
};
