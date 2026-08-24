import { createClient } from '@supabase/supabase-js';
import { Vendedor } from '../entities/Vendedores';
import { RolesEnum } from '../enums/RolesEnum';
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  deleteUsuario,
  updateUsuario,
} from '../repositories/usuariosRepository';
import { ApiError } from '../utils/ApiError';

export const getUsuariosService = async () => {
  const usuariosDb = await getUsuarios();
  const usuarios = usuariosDb.filter((u) => u.rol === 'vendedor');
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
