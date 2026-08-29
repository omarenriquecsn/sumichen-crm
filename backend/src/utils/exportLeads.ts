import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getLeadsParaExportService } from '../services/leadsServices';

async function exportLeadsToExcel() {
  const leads = (await getLeadsParaExportService()) || [];
  if (leads.length === 0) {
    throw new Error('No hay leads para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');

  sheet.columns = [
    { header: 'Origen', key: 'origen', width: 12 },
    { header: 'Tipo de Solicitud', key: 'tipo_web', width: 15 },
    { header: 'Canal de Entrada', key: 'canal_entrada', width: 20 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Zona', key: 'zona', width: 25 },
    { header: 'Vendedor Asignado', key: 'vendedor', width: 30 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Instagram', key: 'instagram', width: 25 },
    { header: 'Mensaje Inicial', key: 'mensaje_inicial', width: 60 },
    { header: 'Cliente Convertido', key: 'cliente', width: 40 },
    { header: 'Asignado En', key: 'asignado_en', width: 20 },
    { header: 'Última Actividad En', key: 'ultima_actividad_en', width: 20 },
    { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
    { header: 'Fecha de Actualización', key: 'fecha_actualizacion', width: 20 },
  ];

  leads.forEach((lead) => {
    const contacto = lead.datos_contacto || {};
    const vendedor = lead.vendedor_asignado
      ? `${lead.vendedor_asignado.nombre} ${lead.vendedor_asignado.apellido}`
      : 'N/A';

    sheet.addRow({
      origen: lead.origen,
      tipo_web: lead.tipo_web || 'N/A',
      canal_entrada: lead.canal_entrada,
      estado: lead.estado,
      zona: lead.zona ? lead.zona.nombre : 'N/A',
      vendedor: vendedor,
      nombre: contacto.nombre || 'N/A',
      telefono: contacto.telefono || 'N/A',
      email: contacto.email || 'N/A',
      instagram: contacto.instagram_handle || 'N/A',
      mensaje_inicial: contacto.mensaje_inicial || 'N/A',
      cliente: lead.cliente ? lead.cliente.empresa : 'N/A',
      asignado_en: lead.asignado_en
        ? new Date(lead.asignado_en).toLocaleString('es-VE')
        : 'N/A',
      ultima_actividad_en: lead.ultima_actividad_en
        ? new Date(lead.ultima_actividad_en).toLocaleString('es-VE')
        : 'N/A',
      fecha_creacion: new Date(lead.fecha_creacion).toLocaleString('es-VE'),
      fecha_actualizacion: new Date(lead.fecha_actualizacion).toLocaleString('es-VE'),
    });
  });

  sheet.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'leads.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportLeadsToExcel;
