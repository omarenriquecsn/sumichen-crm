import { getMenuBienvenida, upsertMenuBienvenida } from '../repositories/menuBienvenidaRepository';
import { OpcionIntencion } from '../entities/MenuBienvenida';
import { ApiError } from '../utils/ApiError';

export const getMenuBienvenidaService = async () => {
  const config = await getMenuBienvenida();
  return config;
};

export const updateMenuBienvenidaService = async (data: any) => {
  const campos: any = {};

  if (data.activo !== undefined) {
    if (typeof data.activo !== 'boolean') throw new ApiError('activo debe ser un booleano', 400);
    campos.activo = data.activo;
  }

  for (const texto of ['mensaje_bienvenida', 'pregunta_estado', 'mensaje_sin_vendedor', 'pregunta_intencion', 'mensaje_confirmacion', 'mensaje_tipo_contacto', 'mensaje_proveedor', 'mensaje_trabajo']) {
    if (data[texto] !== undefined) {
      if (typeof data[texto] !== 'string' || !data[texto].trim()) {
        throw new ApiError(`${texto} debe ser un texto no vacío`, 400);
      }
      campos[texto] = data[texto].trim();
    }
  }

  // Vendedores/admins que reciben proveedores y postulantes de trabajo.
  for (const campo of ['vendedor_proveedores_id', 'vendedor_trabajo_id']) {
    if (data[campo] !== undefined) {
      const v = data[campo];
      if (v === null || v === '') {
        campos[campo] = null;
        continue;
      }
      if (typeof v !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(v)) {
        throw new ApiError(`${campo} debe ser un uuid válido o null`, 400);
      }
      campos[campo] = v;
    }
  }

  if (data.opciones_intencion !== undefined) {
    if (!Array.isArray(data.opciones_intencion)) throw new ApiError('opciones_intencion debe ser un array', 400);
    const opciones = data.opciones_intencion as OpcionIntencion[];
    const tiposValidos = ['cotizacion', 'informacion', 'soporte', 'catalogo'];
    for (const op of opciones) {
      if (!op.numero || typeof op.numero !== 'number') throw new ApiError('Cada opción requiere un número', 400);
      if (!op.etiqueta || typeof op.etiqueta !== 'string') throw new ApiError('Cada opción requiere una etiqueta', 400);
      if (!tiposValidos.includes(op.tipo_web)) throw new ApiError(`tipo_web inválido: ${op.tipo_web}`, 400);
    }
    campos.opciones_intencion = opciones;
  }

  if (!Object.keys(campos).length) throw new ApiError('No hay campos para actualizar', 400);

  return await upsertMenuBienvenida(campos);
};
