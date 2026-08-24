import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getMetasService } from '../services/metasServices';
import { getUsuariosService } from '../services/usuariosServices';

async function exportMetasToExcel() {
  const queryMetas = await getMetasService();
  const queryVendedores = await getUsuariosService();

  const vendedores = queryVendedores || [];
  if (vendedores.length === 0) {
    throw new Error('No hay vendedores para exportar');
  }
  const metas =
    queryMetas.filter(
      (meta) =>
        new Date(meta.fecha_creacion).getMonth() === new Date().getMonth(),
    ) || [];

  if (metas.length === 0) {
    throw new Error('No hay metas para exportar');
  }

  // Crear el libro y hoja de Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Metas');

  // Definir columnas con encabezados claros
  sheet.columns = [
    { header: 'Vendedor', key: 'vendedor', width: 36 },
    { header: 'Año', key: 'ano', width: 10 },
    { header: 'Mes', key: 'mes', width: 15 },
    { header: 'Meta de Ventas', key: 'meta_ventas', width: 20 },
    {
      header: 'Meta de Nuevos Clientes',
      key: 'meta_nuevos_clientes',
      width: 25,
    },
    { header: 'Meta de Actividades', key: 'meta_actividades', width: 25 },
    { header: 'Meta de Llamadas', key: 'llamadas', width: 20 },
    { header: 'Meta de Reuniones', key: 'reuniones', width: 20 },
    { header: 'Meta de Emails', key: 'emails', width: 20 },
    { header: 'Meta de Tareas', key: 'tareas', width: 20 },
    { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
    { header: 'Última Actualización', key: 'fecha_actualizacion', width: 20 },
  ];

  // Mapear y agregar filas
  metas.forEach((meta) => {
    const vendedor = vendedores.find((v) => v.id === meta.vendedor_id);

    sheet.addRow({
      vendedor: vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : 'N/A',
      ano: meta.ano,
      mes: meta.mes,
      meta_ventas: meta.objetivo_ventas,
      meta_nuevos_clientes: meta.objetivo_clientes,
      meta_actividades:
        meta.emails + meta.tareas + meta.llamadas + meta.reuniones,
      llamadas: meta.llamadas,
      reuniones: meta.reuniones,
      emails: meta.emails,
      tareas: meta.tareas,
      fecha_creacion: meta.fecha_creacion,
      fecha_actualizacion: meta.fecha_actualizacion,
    });
  });

  sheet.getRow(1).font = { bold: true };

  // Crear el directorio si no existe
  const dir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // Guardar el archivo
  const filePath = path.join(dir, 'metas.xlsx');
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export { exportMetasToExcel };
