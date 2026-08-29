import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getZonasParaExportService } from '../services/zonasServices';

async function exportZonasToExcel() {
  const zonas = (await getZonasParaExportService()) || [];
  if (zonas.length === 0) {
    throw new Error('No hay zonas para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Zonas');

  sheet.columns = [
    { header: 'Nombre', key: 'nombre', width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 50 },
    { header: 'Estados', key: 'estados', width: 40 },
    { header: 'Vendedores', key: 'vendedores', width: 50 },
    { header: 'Activa', key: 'activa', width: 10 },
    { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
    { header: 'Fecha de Actualización', key: 'fecha_actualizacion', width: 20 },
  ];

  zonas.forEach((zona) => {
    const estados = Array.isArray(zona.estados) ? zona.estados.join('; ') : '';
    const vendedores = (zona.vendedores || [])
      .map((vz) =>
        vz.vendedor ? `${vz.vendedor.nombre} ${vz.vendedor.apellido}` : '',
      )
      .filter(Boolean)
      .join(', ');

    sheet.addRow({
      nombre: zona.nombre,
      descripcion: zona.descripcion || 'N/A',
      estados: estados || 'N/A',
      vendedores: vendedores || 'N/A',
      activa: zona.activa ? 'Sí' : 'No',
      fecha_creacion: new Date(zona.fecha_creacion).toLocaleString('es-VE'),
      fecha_actualizacion: new Date(zona.fecha_actualizacion).toLocaleString('es-VE'),
    });
  });

  sheet.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'zonas.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportZonasToExcel;
