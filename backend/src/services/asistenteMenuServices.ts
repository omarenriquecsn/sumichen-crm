import { getMenuBienvenida } from '../repositories/menuBienvenidaRepository';
import { getZonas } from '../repositories/zonasRepository';
import { asignarLeadAutomatico, asignarLeadAVendedor, updateLead, getLeadById } from '../repositories/leadsRepository';
import { abrirConversacionParaLead } from './conversacionesServices';
import { OpcionIntencion } from '../entities/MenuBienvenida';
import { TipoWebEnum } from '../entities/Lead';
import { enviarPushAUsuario } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

/**
 * Asistente de bienvenida (WhatsApp).
 *
 * Cuando llega un lead de WhatsApp SIN vendedor asignado, el bot:
 *   0. Pregunta qué tipo de contacto es (cliente / proveedor / busca trabajo).
 *      - Cliente → continúa con el flujo de ventas (estado → zona → intención).
 *      - Proveedor / Busco trabajo → se asigna directamente al usuario
 *        configurado (vendedor_proveedores_id / vendedor_trabajo_id).
 *
 * El estado del asistente vive en `lead.metadata.paso_menu`:
 *   undefined → primer contacto (se envía el menú de tipo de contacto)
 *   'tipo'     → esperando selección de tipo (cliente/proveedor/trabajo)
 *   'estado'   → esperando selección de estado
 *   'intencion'→ esperando selección de intención
 *   'completado' → asistente terminado (no vuelve a intervenir)
 */

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const formatearOpciones = (items: string[]) =>
  items.map((x, i) => `${i + 1}. ${x}`).join('\n');

// Opciones del paso "tipo de contacto" (fijas por ahora; el texto del mensaje
// es configurable en /marketing). La clave `tipo` no es el enum tipo_web: sirve
// para enrutar la respuesta dentro del asistente.
const OPCIONES_TIPO: Array<{ etiqueta: string; tipo: 'cliente' | 'proveedor' | 'trabajo' }> = [
  { etiqueta: 'Cliente', tipo: 'cliente' },
  { etiqueta: 'Proveedor', tipo: 'proveedor' },
  { etiqueta: 'Busco trabajo', tipo: 'trabajo' },
];

const matchTipoContacto = (cuerpo: string) => {
  const c = normalizar(cuerpo.trim());
  if (/^\d+$/.test(c)) {
    const idx = parseInt(c, 10) - 1;
    return OPCIONES_TIPO[idx]?.tipo || null;
  }
  const cn = normalizar(cuerpo.trim());
  const opcion = OPCIONES_TIPO.find((o) => {
    const ne = normalizar(o.etiqueta);
    return ne === cn || ne.includes(cn) || cn.includes(ne);
  });
  return opcion?.tipo || null;
};

interface ZonaConEstados {
  id: string;
  nombre: string;
  estados: string[];
  tieneVendedores: boolean;
}

const getZonasConEstados = async (): Promise<ZonaConEstados[]> => {
  const zonas = await getZonas();
  return zonas
    .filter((z) => Array.isArray(z.estados) && z.estados.length > 0)
    .map((z) => ({
      id: z.id,
      nombre: z.nombre,
      estados: z.estados as string[],
      tieneVendedores: (z.vendedores || []).some((vz: any) => vz.vendedor && vz.vendedor.activo),
    }));
};

export const getEstadosDisponibles = async (): Promise<string[]> => {
  const zonas = await getZonasConEstados();
  const set = new Set<string>();
  for (const z of zonas) {
    if (z.tieneVendedores) for (const e of z.estados) set.add(e);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
};

const getTelefono = (lead: any) => ({
  telefono: lead?.datos_contacto?.telefono,
  phoneNumberId: lead?.metadata?.phone_number_id,
});

// Envío no bloqueante: si la API de Meta falla (ventana 24h cerrada, número
// inválido, token) no debe romper la máquina de estados del asistente.
const enviarSeguro = async (telefono: string, texto: string, phoneNumberId?: string) => {
  try {
    const { sendWhatsAppText } = await import('../utils/sendWhatsapp');
    return await sendWhatsAppText(telefono, texto, phoneNumberId);
  } catch (err) {
    console.error('[Asistente] Error enviando mensaje WhatsApp:', err instanceof Error ? err.message : err);
    return null;
  }
};

const getVendedorNombre = (lead: any) =>
  lead?.vendedor_asignado
    ? `${lead.vendedor_asignado.nombre} ${lead.vendedor_asignado.apellido}`.trim()
    : '';

const getVendedorTelefono = (lead: any) => lead?.vendedor_asignado?.telefono || '';

const matchEstado = (cuerpo: string, estados: string[]): string | null => {
  const c = normalizar(cuerpo.trim());
  if (/^\d+$/.test(c)) {
    const idx = parseInt(c, 10) - 1;
    return estados[idx] || null;
  }
  const cn = normalizar(cuerpo.trim());
  const estado = estados.find((e) => {
    const ne = normalizar(e);
    return ne === cn || ne.includes(cn) || cn.includes(ne);
  });
  return estado || null;
};

const matchOpcion = (cuerpo: string, opciones: OpcionIntencion[]) => {
  const c = normalizar(cuerpo.trim());
  if (/^\d+$/.test(c)) {
    const idx = parseInt(c, 10) - 1;
    return opciones[idx] || null;
  }
  const cn = normalizar(cuerpo.trim());
  return (
    opciones.find(
      (o) => normalizar(o.etiqueta) === cn || normalizar(o.etiqueta).includes(cn) || normalizar(o.tipo_web) === cn
    ) || null
  );
};

/** Paso 0: envía bienvenida + las 3 opciones de tipo de contacto. */
export const enviarMenuTipoContacto = async (lead: any) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const texto = `${config.mensaje_tipo_contacto.replace(/\{nombre\}/g, nombre).replace(
    '{opciones}',
    formatearOpciones(OPCIONES_TIPO.map((o) => o.etiqueta))
  )}`;
  await enviarSeguro(telefono, texto, phoneNumberId);
  await updateLead(lead.id, { metadata: { ...lead.metadata, paso_menu: 'tipo', menu_enviado: true } });
};

/**
 * Asigna el lead al usuario configurado para proveedores/trabajo, abre la
 * conversación, avisa por push y envía la confirmación al contacto.
 */
const asignarTipoEspecial = async (lead: any, config: any, tipo: 'proveedor' | 'trabajo') => {
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const vendedorId =
    tipo === 'proveedor' ? config.vendedor_proveedores_id : config.vendedor_trabajo_id;
  const mensajeConfirmacion =
    tipo === 'proveedor' ? config.mensaje_proveedor : config.mensaje_trabajo;

  if (!vendedorId) {
    await enviarSeguro(
      telefono,
      config.mensaje_sin_vendedor.replace(/\{nombre\}/g, nombre),
      phoneNumberId
    );
    await updateLead(lead.id, { metadata: { ...lead.metadata, paso_menu: 'completado', tipo_contacto: tipo } });
    return;
  }

  const asignado = await asignarLeadAVendedor(lead.id, vendedorId);
  if (!asignado) {
    await enviarSeguro(
      telefono,
      config.mensaje_sin_vendedor.replace(/\{nombre\}/g, nombre),
      phoneNumberId
    );
    return;
  }

  // Abrir la conversación (y sembrar los mensajes pendientes del contacto).
  await abrirConversacionParaLead(lead.id, vendedorId, 'whatsapp');

  // Web Push — evento `lead_asignado`: se avisa al usuario configurado.
  try {
    await enviarPushAUsuario(
      vendedorId,
      {
        titulo: tipo === 'proveedor' ? '🤝 Nuevo proveedor' : '💼 Nuevo postulante',
        cuerpo: `${nombre} se identificó como ${tipo === 'proveedor' ? 'proveedor' : 'postulante a trabajo'} por WhatsApp.`,
        url: '#/chat',
      },
      EventoNotificacionEnum.LEAD_ASIGNADO
    );
  } catch (err) {
    console.error('[Asistente] No se pudo enviar push de lead tipo especial:', err instanceof Error ? err.message : err);
  }

  // Enviar la confirmación al contacto (con el nombre del vendedor/admin).
  const leadActual = await getLeadById(lead.id);
  const vendedor = getVendedorNombre(leadActual);
  const texto = mensajeConfirmacion
    .replace(/\{nombre\}/g, nombre)
    .replace('{vendedor}', vendedor);
  await enviarSeguro(telefono, texto, phoneNumberId);

  await updateLead(lead.id, {
    tipo_web: (tipo === 'proveedor' ? TipoWebEnum.PROVEEDOR : TipoWebEnum.TRABAJO) as any,
    metadata: {
      ...(leadActual?.metadata || lead.metadata),
      mensajes_pendientes: [],
      paso_menu: 'completado',
      tipo_contacto: tipo,
    },
  });
};

/** Paso 0-b: procesa la selección de tipo de contacto. */
export const procesarRespuestaTipoContacto = async (lead: any, cuerpo: string) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const tipo = matchTipoContacto(cuerpo);

  if (!tipo) {
    const texto = config.mensaje_tipo_contacto
      .replace(/\{nombre\}/g, nombre)
      .replace('{opciones}', formatearOpciones(OPCIONES_TIPO.map((o) => o.etiqueta)));
    await enviarSeguro(telefono, texto, phoneNumberId);
    return;
  }

  // Opción "Cliente": continúa con el flujo de ventas existente (estado → zona).
  if (tipo === 'cliente') {
    await enviarMenuEstados(lead);
    return;
  }

  // Opciones "Proveedor" / "Trabajo": asignación directa al usuario configurado.
  await asignarTipoEspecial(lead, config, tipo);
};

/** Paso 1: envía bienvenida + lista de estados. */
export const enviarMenuEstados = async (lead: any) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const estados = await getEstadosDisponibles();

  if (!estados.length) {
    await enviarSeguro(
      telefono,
      config.mensaje_sin_vendedor.replace(/\{nombre\}/g, nombre),
      phoneNumberId
    );
    await updateLead(lead.id, { metadata: { ...lead.metadata, paso_menu: 'completado', menu_enviado: true } });
    return;
  }

  const texto = `${config.mensaje_bienvenida.replace(/\{nombre\}/g, nombre)}\n\n${config.pregunta_estado.replace(
    '{opciones}',
    formatearOpciones(estados)
  )}`;
  await enviarSeguro(telefono, texto, phoneNumberId);
  await updateLead(lead.id, {
    metadata: { ...lead.metadata, paso_menu: 'estado', menu_enviado: true, estados_disponibles: estados },
  });
};

/** Paso 2: procesa la selección de estado y auto-asigna el vendedor. */
export const procesarRespuestaEstado = async (lead: any, cuerpo: string) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const estados: string[] = lead?.metadata?.estados_disponibles || (await getEstadosDisponibles());
  const estado = matchEstado(cuerpo, estados);

  if (!estado) {
    await enviarSeguro(telefono, config.pregunta_estado.replace('{opciones}', formatearOpciones(estados)), phoneNumberId);
    return;
  }

  const zonas = await getZonasConEstados();
  const zona = zonas.find((z) => z.estados.includes(estado));
  if (!zona) {
    await enviarSeguro(telefono, config.mensaje_sin_vendedor.replace(/\{nombre\}/g, nombre), phoneNumberId);
    await updateLead(lead.id, { metadata: { ...lead.metadata, paso_menu: 'completado', estado_seleccionado: estado } });
    return;
  }

  const asignado = await asignarLeadAutomatico(lead.id, zona.id);
  if (!asignado) {
    await enviarSeguro(telefono, config.mensaje_sin_vendedor.replace(/\{nombre\}/g, nombre), phoneNumberId);
    await updateLead(lead.id, { metadata: { ...lead.metadata, paso_menu: 'completado', estado_seleccionado: estado } });
    return;
  }

  // Asignado: crear la conversación y sembrar los mensajes pendientes del cliente.
  // abrirConversacionParaLead limpia mensajes_pendientes; lo reforzamos para no
  // reintroducir la lista vieja en el update posterior.
  await abrirConversacionParaLead(lead.id, asignado.vendedor_asignado_id!, 'whatsapp');

  // Web Push — evento `lead_asignado`: el vendedor recibe el aviso del SLA de 12h.
  if (asignado.vendedor_asignado_id) {
    try {
      await enviarPushAUsuario(
        asignado.vendedor_asignado_id,
        {
          titulo: '🔔 Nuevo lead asignado',
          cuerpo: `${nombre} fue asignado a ti por WhatsApp. Dispones de 12 horas para atenderlo.`,
          url: '#/chat',
        },
        EventoNotificacionEnum.LEAD_ASIGNADO,
      );
    } catch (err) {
      console.error('[Asistente] No se pudo enviar push de lead asignado:', err instanceof Error ? err.message : err);
    }
  }

  const leadActual = await getLeadById(lead.id);
  const vendedor = getVendedorNombre(leadActual);
  const opciones = formatearOpciones((config.opciones_intencion || []).map((o) => o.etiqueta));
  const texto = config.pregunta_intencion
    .replace('{vendedor}', vendedor)
    .replace('{zona}', zona.nombre)
    .replace('{opciones}', opciones);

  await enviarSeguro(telefono, texto, phoneNumberId);
  await updateLead(lead.id, {
    metadata: {
      ...(leadActual?.metadata || lead.metadata),
      mensajes_pendientes: [],
      paso_menu: 'intencion',
      estado_seleccionado: estado,
      zona_seleccionada: zona.nombre,
    },
  });
};

/** Paso 3: procesa la selección de intención y guarda tipo_web. */
export const procesarRespuestaIntencion = async (lead: any, cuerpo: string) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;
  const { telefono, phoneNumberId } = getTelefono(lead);
  const nombre = lead?.datos_contacto?.nombre || '';
  if (!telefono) return;

  const opciones = config.opciones_intencion || [];
  const opcion = matchOpcion(cuerpo, opciones);

  if (!opcion) {
    const leadActual = await getLeadById(lead.id);
    const texto = config.pregunta_intencion
      .replace('{vendedor}', getVendedorNombre(leadActual))
      .replace('{zona}', leadActual?.zona?.nombre || lead?.metadata?.zona_seleccionada || '')
      .replace('{opciones}', formatearOpciones(opciones.map((o) => o.etiqueta)));
    await enviarSeguro(telefono, texto, phoneNumberId);
    return;
  }

  const leadActual = await getLeadById(lead.id);
  const vendedor = getVendedorNombre(leadActual);
  const texto = config.mensaje_confirmacion
    .replace('{nombre}', nombre)
    .replace('{vendedor}', vendedor)
    .replace('{telefono_vendedor}', getVendedorTelefono(leadActual));

  await enviarSeguro(telefono, texto, phoneNumberId);

  // Opción "Catálogo": genera el PDF desde el inventario y lo envía al cliente.
  if (opcion.tipo_web === 'catalogo') {
    try {
      const { generarCatalogoPDF } = await import('../utils/catalogoProductos');
      const { sendWhatsAppDocument } = await import('../utils/sendWhatsapp');
      const pdfBuffer = await generarCatalogoPDF();
      await sendWhatsAppDocument(
        telefono,
        pdfBuffer,
        'catalogo_sumichem.pdf',
        'Catálogo de productos Sumichem',
        phoneNumberId
      );
    } catch (err) {
      console.error('[Asistente] Error enviando catálogo:', err instanceof Error ? err.stack || err.message : err);
      const aviso = vendedor
        ? `Disculpa, por ahora no está disponible el catálogo. ${vendedor} te lo hará llegar por este medio.`
        : 'Disculpa, por ahora no está disponible el catálogo. Un asesor te contactará para enviártelo.';
      await enviarSeguro(telefono, aviso, phoneNumberId);
    }
  }

  await updateLead(lead.id, {
    tipo_web: opcion.tipo_web as any,
    metadata: { ...lead.metadata, paso_menu: 'completado', intencion_seleccionada: opcion.etiqueta },
  });
};

/** Punto de entrada del asistente, invocado desde el webhook por cada mensaje. */
export const procesarAsistente = async (leadId: string, cuerpo: string) => {
  const config = await getMenuBienvenida();
  if (!config || !config.activo) return;

  const lead = await getLeadById(leadId);
  if (!lead) return;

  const paso = lead.metadata?.paso_menu;

  if (paso === undefined) {
    // Primer contacto (sin vendedor): bienvenida + menú de tipo de contacto.
    if (!lead.vendedor_asignado_id) await enviarMenuTipoContacto(lead);
    return;
  }
  if (paso === 'tipo') {
    await procesarRespuestaTipoContacto(lead, cuerpo);
    return;
  }
  if (paso === 'estado') {
    await procesarRespuestaEstado(lead, cuerpo);
    return;
  }
  if (paso === 'intencion') {
    await procesarRespuestaIntencion(lead, cuerpo);
    return;
  }
};
