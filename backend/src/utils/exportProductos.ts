import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getStockProductos } from '../services/inventarioServices';

async function exportProductosToExcel() {
  const productos = (await getStockProductos()) || [];
  if (productos.length === 0) {
    throw new Error('No hay productos para exportar');
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Productos');

  sheet.columns = [
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 45 },
    { header: 'Unidad', key: 'unidad', width: 12 },
    { header: 'Precio Base ($)', key: 'precio_base', width: 16 },
    { header: 'Disponible', key: 'disponible', width: 12 },
    { header: 'Stock GLOBALCA', key: 'stock_globalca', width: 16 },
    { header: 'Stock WMS', key: 'stock_wms', width: 16 },
    { header: 'Stock Total', key: 'stock_total', width: 16 },
  ];

  // Primero los productos con stock, los que están en 0 al final.
  const ordenados = [...productos].sort((a, b) => {
    const totalA = Number(a.stock?.total ?? 0);
    const totalB = Number(b.stock?.total ?? 0);
    if (totalA === 0 && totalB !== 0) return 1;
    if (totalB === 0 && totalA !== 0) return -1;
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  ordenados.forEach((producto) => {
    sheet.addRow({
      codigo: producto.descripcion,
      nombre: producto.nombre || 'N/A',
      unidad: producto.unidad_medida || 'N/A',
      precio_base: Number(producto.precio_base ?? 0),
      disponible: producto.disponible ? 'Sí' : 'No',
      stock_globalca: Number(producto.stock?.globalca ?? 0),
      stock_wms: Number(producto.stock?.wms ?? 0),
      stock_total: Number(producto.stock?.total ?? 0),
    });
  });

  sheet.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'productos.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportProductosToExcel;
