import { Pedido } from '../entities/Pedidos';
import ExcelJS from 'exceljs';
import { getPedidosService } from '../services/pedidosServices';
import fs from 'fs';
import path from 'path';
import { getClientesService } from '../services/clientesServices';
import { getUsuariosService } from '../services/usuariosServices';

async function exportPedidosToExcel() {
  const lastExportPath = null;
  if (lastExportPath && fs.existsSync(lastExportPath)) {
    try {
      fs.unlinkSync(lastExportPath);
      console.log('Archivo anterior eliminado:', lastExportPath);
    } catch (err) {
      console.error('Error al eliminar archivo anterior:', err);
    }
  }

  // 1. Consulta los pedidos desde la base de datos
  const query = await getPedidosService();
  const queryClientes = await getClientesService()
  const queryVendedores = await getUsuariosService()

  const vendedores = queryVendedores || [];
  if (vendedores.length === 0) {
    throw new Error('No hay vendedores para exportar');
  }
 
  const clientes = queryClientes || [];
  if (clientes.length === 0) {
    throw new Error('No hay clientes para exportar');
  }

  const pedidos = query || [];
  if (pedidos.length === 0) {
    throw new Error('No hay pedidos para exportar');
  }

  // 2. Crear el libro y hoja de Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pedidos');

  // 3. Definir columnas con encabezados claros
  sheet.columns = [
    { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
    { header: 'Fecha de Entrega', key: 'fecha_entrega', width: 20 },
    { header: 'Número de Pedido', key: 'numero', width: 15 },
    { header: 'Cliente', key: 'cliente_id', width: 50 },
    { header: 'Productos', key: 'producto', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 15 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Total por Producto', key: 'total_producto', width: 15 },
    { header: 'Impuestos', key: 'impuestos', width: 15 },
    { header: 'IVA', key: 'iva', width: 15 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Tipo de Pago', key: 'tipo_pago', width: 15 },
    { header: 'Días de Crédito', key: 'dias_credito', width: 15 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Transporte', key: 'transporte', width: 15 },
    { header: 'Notas', key: 'notas', width: 30 },
    { header: 'Última Actualización', key: 'fecha_actualizacion', width: 20 },
    { header: 'Vendedor', key: 'vendedor_id', width: 36 },
    { header: 'Estado', key: 'estado', width: 15 },
  ];

  // 4. Agregar filas con formato de fecha
  pedidos.forEach((pedido: Pedido) => {
    pedido.productos_pedido.forEach(pp => {
      sheet.addRow({
        numero: pedido.numero,
        cliente_id: clientes.find(c => c.id === pedido.cliente_id)?.empresa || pedido.cliente_id,
        vendedor_id: vendedores.find(v => v.id === pedido.vendedor_id)?.nombre || pedido.vendedor_id,
        impuestos: Number(pedido.impuestos),
        iva: Number(pedido.subtotal) * Number(pedido.impuestos),
        total: (Number(pedido.subtotal) * Number(pedido.impuestos)) + Number(pedido.subtotal),
        fecha_entrega: formatDate(pedido.fecha_entrega),
        tipo_pago: pedido.tipo_pago,
        moneda: pedido.moneda,
        transporte: pedido.transporte,
        fecha_creacion: formatDate(pedido.fecha_creacion),
        fecha_actualizacion: formatDate(pedido.fecha_actualizacion),
        estado: pedido.estado,
        notas: pedido.notas,
        dias_credito: pedido.dias_credito,
        producto: pp.producto?.nombre, 
        cantidad: Number(pp.cantidad),
        precio_unitario: Number(pp.precio_unitario),
        total_producto: Number(pp.precio_unitario) * Number(pp.cantidad)
      });
    });
  });

  // 5. Estilizar encabezado
  sheet.getRow(1).font = { bold: true };

  // 6. Guardar archivo temporal
  const fileName = `pedidos.xlsx`;
  const filePath = path.join(__dirname, 'exports', fileName);

  console.log(filePath);

  // Asegurar carpeta
  if (!fs.existsSync(path.join(__dirname, 'exports'))) {
    fs.mkdirSync(path.join(__dirname, 'exports'));
  }

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// Formato de fecha legible
function formatDate(date: string | Date) {
  return new Date(date).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export { exportPedidosToExcel };
