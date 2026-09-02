
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

/**
 * Utilidades de envío por WhatsApp Cloud API (Meta).
 *
 * - `sendWhatsAppText`: mensaje de texto libre. Solo funciona dentro de la
 *   ventana de 24h tras un mensaje entrante del cliente (session window).
 * - `sendWhatsAppTemplate`: plantilla aprobada (fuera de la ventana de 24h).
 */

const getPhoneId = (phoneNumberId?: string) => phoneNumberId || process.env.META_PHONE_ID;
const getToken = () => process.env.META_TOKEN;

const normalizarTelefono = (telefono: string) => {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.startsWith('0') ? '58' + digitos.slice(1) : digitos;
};

/**
 * Envía un mensaje de texto libre por WhatsApp Cloud API.
 * @param to Número del destinatario en formato internacional (ej: 584125072254)
 * @param body Contenido del mensaje
 * @param phoneNumberId Opcional: el phone_number_id del número de negocio que
 *        envió/recibió (se guarda en metadata del lead al recibir el webhook).
 */
export const sendWhatsAppText = async (to: string, body: string, phoneNumberId?: string) => {
  const phoneId = getPhoneId(phoneNumberId);
  const token = getToken();
  if (!phoneId || !token) {
    throw new Error('META_PHONE_ID / META_TOKEN no configurados');
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizarTelefono(to),
    type: 'text',
    text: { preview_url: false, body },
  };

  const response = await axios.post(
    url,
    data,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
};

/**
 * Envía un documento (PDF) por WhatsApp Cloud API.
 * 1) Sube el archivo a /media (multipart) y obtiene el media_id.
 * 2) Envía un mensaje tipo 'document' referenciando ese media_id.
 * Solo funciona dentro de la ventana de 24h tras un mensaje entrante.
 */
export const sendWhatsAppDocument = async (
  to: string,
  pdfBuffer: Buffer,
  filename: string,
  caption?: string,
  phoneNumberId?: string
) => {
  const phoneId = getPhoneId(phoneNumberId);
  const token = getToken();
  if (!phoneId || !token) {
    throw new Error('META_PHONE_ID / META_TOKEN no configurados');
  }

  // 1) Subir el PDF y obtener el media_id
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename);

  const uploadResponse = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneId}/media`,
    formData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const mediaId: string = uploadResponse.data.id;

  // 2) Enviar el mensaje de tipo documento
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizarTelefono(to),
    type: 'document',
    document: { id: mediaId, filename, caption: caption || '' },
  };

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    data,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
};

/**
 * Envía una imagen por WhatsApp Cloud API.
 * 1) Sube el archivo a /media (multipart) y obtiene el media_id.
 * 2) Envía un mensaje tipo 'image' referenciando ese media_id.
 * Solo funciona dentro de la ventana de 24h tras un mensaje entrante.
 */
export const sendWhatsAppImage = async (
  to: string,
  imageBuffer: Buffer,
  filename: string,
  caption?: string,
  phoneNumberId?: string
) => {
  const phoneId = getPhoneId(phoneNumberId);
  const token = getToken();
  if (!phoneId || !token) {
    throw new Error('META_PHONE_ID / META_TOKEN no configurados');
  }

  // Content-Type según la extensión del archivo.
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

  // 1) Subir la imagen y obtener el media_id
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: mime }), filename);

  const uploadResponse = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneId}/media`,
    formData,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const mediaId: string = uploadResponse.data.id;

  // 2) Enviar el mensaje de tipo imagen
  const data = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizarTelefono(to),
    type: 'image',
    image: { id: mediaId, caption: caption || '' },
  };

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneId}/messages`,
    data,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return response.data;
};

/**
 * Envía una plantilla de WhatsApp llamada 'pedido' usando la API de Meta.
 * @param recipient Número de WhatsApp en formato internacional (ej: 584125072254)
 * @param templateParams Array de parámetros para la plantilla (opcional)
 */
const sendWhatsAppTemplate = async (template: string) => {
  try {
    const recipient = process.env.META_RECIPIENT;
    const data: any = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: template,
        language: { code: 'es' },
      },
    };

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${getPhoneId()}/messages?access_token=${getToken()}`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error enviando plantilla WhatsApp:', error.response?.data || error.message);
    throw new Error('Error al enviar la plantilla de WhatsApp');
  }
};

export default sendWhatsAppTemplate;
