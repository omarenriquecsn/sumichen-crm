import axios from 'axios';

interface PushoverPayload {
  token: string;
  user: string;
  message: string;
  title?: string;
  priority?: number;
  url?: string;
  url_title?: string;
  device?: string;
}

export const sendPushNotification = async (payload: PushoverPayload) => {
  try {
    const response = await axios.post('https://api.pushover.net/1/messages.json', payload);
    console.log('✅ Notificación enviada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    throw error;
  }
};