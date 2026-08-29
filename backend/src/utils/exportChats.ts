import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getConversacionesParaExportService } from '../services/conversacionesServices';

async function exportChatsToExcel() {
  const conversaciones = (await getConversacionesParaExportService()) || [];
  if (conversaciones.length === 0) {
    throw new Error('No hay conversaciones para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Chats');

  sheet.columns = [
    { header: 'Conversación ID', key: 'conversacion_id', width: 40 },
    { header: 'Lead', key: 'lead', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 20 },
    { header: 'Vendedor', key: 'vendedor', width: 30 },
    { header: 'Canal', key: 'canal', width: 12 },
    { header: 'Estado Conversación', key: 'estado_conv', width: 18 },
    { header: 'Remitente', key: 'remitente', width: 30 },
    { header: 'Contenido', key: 'contenido', width: 80 },
    { header: 'Tipo Mensaje', key: 'tipo', width: 15 },
    { header: 'Sin Stock', key: 'sin_stock', width: 10 },
    { header: 'Fecha', key: 'fecha', width: 20 },
  ];

  conversaciones.forEach((conv) => {
    const lead = conv.lead;
    const vendedor = conv.vendedor
      ? `${conv.vendedor.nombre} ${conv.vendedor.apellido}`
      : 'N/A';
    const nombreLead = lead ? lead.datos_contacto?.nombre || 'N/A' : 'N/A';
    const telefonoLead = lead ? lead.datos_contacto?.telefono || 'N/A' : 'N/A';

    const mensajes = conv.mensajes || [];
    if (mensajes.length === 0) {
      sheet.addRow({
        conversacion_id: conv.id,
        lead: nombreLead,
        telefono: telefonoLead,
        vendedor: vendedor,
        canal: conv.canal,
        estado_conv: conv.estado,
        remitente: 'Sin mensajes',
        contenido: 'Sin mensajes',
        tipo: 'N/A',
        sin_stock: 'No',
        fecha: conv.fecha_creacion
          ? new Date(conv.fecha_creacion).toLocaleString('es-VE')
          : 'N/A',
      });
      return;
    }

    mensajes.forEach((msg) => {
      let remitente: string = msg.remitente_tipo;
      if (msg.remitente_tipo === 'lead') {
        remitente = `Lead (${nombreLead})`;
      } else if (msg.remitente_tipo === 'vendedor') {
        remitente = `Vendedor (${vendedor})`;
      } else {
        remitente = 'Sistema';
      }

      sheet.addRow({
        conversacion_id: conv.id,
        lead: nombreLead,
        telefono: telefonoLead,
        vendedor: vendedor,
        canal: conv.canal,
        estado_conv: conv.estado,
        remitente: remitente,
        contenido: msg.contenido,
        tipo: msg.tipo,
        sin_stock: msg.detectado_sin_stock ? 'Sí' : 'No',
        fecha: new Date(msg.fecha_creacion).toLocaleString('es-VE'),
      });
    });
  });

  sheet.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'chats.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportChatsToExcel;
