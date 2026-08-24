import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getActividadesService } from '../services/actividadesServices';
import { getUsuariosService } from '../services/usuariosServices';
import { getClientesService } from '../services/clientesServices';

async function exportActividadesToExcel() {
  const queryActividades = await getActividadesService();
  const queryUsuarios = await getUsuariosService();
  const queryClientes = await getClientesService();

  const usuarios = queryUsuarios || [];
  if (usuarios.length === 0) {
    throw new Error('No hay usuarios para exportar');
  }
  const clientes = queryClientes || [];
  if (clientes.length === 0) {
    throw new Error('No hay clientes para exportar');
  }
  const actividades = Array.isArray(queryActividades) ? queryActividades : [] ;
  if (actividades.length === 0) {
    throw new Error('No hay actividades para exportar');
  }

  // Crear el libro y hoja de Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Actividades');

  // Definir columnas con encabezados claros
  sheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 63 },
    { header: 'Descripción', key: 'descripcion', width: 100 },
    { header: 'Fecha y Hora', key: 'fecha_hora', width: 20 },
    { header: 'Tipo de Actividad', key: 'tipo_actividad', width: 20 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Vendedor', key: 'vendedor', width: 36 },
    { header: 'Creado En', key: 'fecha_creacion', width: 20 },
    { header: 'Actualizado En', key: 'fecha_actualizacion', width: 20 },
  ];

  // Mapear y agregar filas
  actividades.forEach((actividad) => {
    const cliente = clientes.find((c) => c.id === actividad.cliente_id);
    const vendedor = usuarios.find((u) => u.id === actividad.vendedor_id);
    const empresa = cliente ? cliente.empresa : 'N/A';
    const nombreVendedor = vendedor
      ? `${vendedor.nombre} ${vendedor.apellido}`
      : 'N/A';
    sheet.addRow({
      cliente: empresa,
      descripcion: actividad.descripcion,
      fecha_hora: actividad.fecha.toLocaleString(),
      tipo_actividad: actividad.tipo,
      estado: actividad.completado ? 'Completado' : 'Pendiente',
      vendedor: nombreVendedor,
      fecha_creacion: actividad.fecha_creacion,
      fecha_actualizacion: actividad.fecha_actualizacion,
    });
  });

   sheet.getRow(1).font = { bold: true };

  // Guardar el archivo en una ruta temporal
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const filePath = path.join(tempDir, 'actividades.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportActividadesToExcel;