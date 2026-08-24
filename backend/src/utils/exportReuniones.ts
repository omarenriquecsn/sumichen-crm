import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getReunionesService } from '../services/reunionesServices';
import { getUsuariosService } from '../services/usuariosServices';
import { getClientesService } from '../services/clientesServices';

async function exportReunionesToExcel() {
  const queryReuniones = await getReunionesService();
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
  const reuniones = Array.isArray(queryReuniones) ? queryReuniones : [] ;
  if (reuniones.length === 0) {
    throw new Error('No hay reuniones para exportar');
  }

  // Crear el libro y hoja de Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reuniones');

  // Definir columnas con encabezados claros
  sheet.columns = [
    { header: 'Cliente', key: 'cliente', width: 63 },
    { header: 'Descripción', key: 'descripcion', width: 100 },
    { header: 'Fecha y Hora', key: 'fecha_hora', width: 20 },
    { header: 'Ubicación', key: 'ubicacion', width: 30 },
    { header: 'Estado', key: 'estado', width: 15 },
    { header: 'Vendedor', key: 'vendedor', width: 36 },
    { header: 'Creado En', key: 'fecha_creacion', width: 20 },
    { header: 'Actualizado En', key: 'fecha_actualizacion', width: 20 },
  ];

  // Mapear y agregar filas
  reuniones.forEach((reunion) => {
    const cliente = clientes.find((c) => c.id === reunion.cliente_id);
    const vendedor = usuarios.find((u) => u.id === reunion.vendedor_id);
    const empresa = cliente ? cliente.empresa : 'N/A';
    const nombreVendedor = vendedor
      ? `${vendedor.nombre} ${vendedor.apellido}`
      : 'N/A';
    sheet.addRow({
      cliente: empresa,
      descripcion: reunion.descripcion,
      fecha_hora: reunion.fecha_inicio.toLocaleString(),
      ubicacion: reunion.ubicacion,
      estado: reunion.estado,
      vendedor: nombreVendedor,
      fecha_creacion: reunion.fecha_creacion,
      fecha_actualizacion: reunion.fecha_actualizacion,
    });
  });

sheet.getRow(1).font = { bold: true };

  // 6. Guardar archivo temporal
  const fileName = `reuniones.xlsx`;
  const filePath = path.join(__dirname, 'exports', fileName);

  // 7. Eliminar archivo anterior si existe
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Asegurar carpeta
  if (!fs.existsSync(path.join(__dirname, 'exports'))) {
    fs.mkdirSync(path.join(__dirname, 'exports'));
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export default exportReunionesToExcel;
