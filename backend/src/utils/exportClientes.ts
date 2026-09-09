import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getClientesService } from '../services/clientesServices';
import { getUsuariosService } from '../services/usuariosServices';
import { getPedidos } from '../repositories/pedidosRepository';

 async function exportClientesToExcel() {
    const queryClientes = await getClientesService()
    const queryVendedores = await getUsuariosService();

    const vendedores = queryVendedores || [];
    if (vendedores.length === 0) {
      throw new Error('No hay vendedores para exportar');
    }
    const clientes = queryClientes || [];

    if (clientes.length === 0) {
      throw new Error('No hay clientes para exportar');
    }

    // Ventas completadas por cliente (pedidos con estado 'procesado'), para
    // calcular el % alcanzado de la proyección de venta.
    const pedidos = await getPedidos();
    const ventasProcesadasPorCliente = new Map<string, number>();
    for (const pedido of Array.isArray(pedidos) ? pedidos : []) {
      if (pedido.estado !== 'procesado') continue;
      const previo = ventasProcesadasPorCliente.get(pedido.cliente_id) ?? 0;
      ventasProcesadasPorCliente.set(
        pedido.cliente_id,
        previo + Number(pedido.total ?? 0),
      );
    }

    // Crear el libro y hoja de Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clientes');

    // Definir columnas con encabezados claros
    sheet.columns = [
      { header: 'Rif', key: 'rif', width: 15 },
      { header: 'Empresa', key: 'empresa', width: 63 },
      { header: 'Contacto', key: 'contacto', width: 40 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Email', key: 'email', width: 45 },
      { header: 'Dirección', key: 'direccion', width: 50 },
      { header: 'Dirección de Entrega', key: 'direccion_entrega', width: 50 },
      { header: 'Google Maps', key: 'google_maps', width: 50 },
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Sector', key: 'sector', width: 30 },
      { header: 'Estado Anterior', key: 'estado_anterior', width: 15 },
      { header: 'Fecha de Cambio de Estado', key: 'fecha_estado', width: 20 },
      { header: 'Vendedor', key: 'vendedor', width: 36 },
      { header: 'Etapa Pipeline', key: 'etapa_venta', width: 15 },
      { header: 'Proyección de Ventas ($)', key: 'proyeccion_venta', width: 22 },
      { header: 'Porcentaje Alcanzado (%)', key: 'porcentaje_alcanzado', width: 22 },
      { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
      { header: 'Última Actualización', key: 'fecha_actualizacion', width: 20 },
      { header: 'Notas', key: 'notas', width: 100},

    ];

    // Mapear y agregar filas
    clientes.forEach((cliente) => {
      const vendedor = vendedores.find(
        (v) => v.id === cliente.vendedor_id,
      );
      const proyeccion =
        cliente.proyeccion_venta != null ? Number(cliente.proyeccion_venta) : null;
      const ventasProcesadas = ventasProcesadasPorCliente.get(cliente.id) ?? 0;
      const porcentaje =
        proyeccion && proyeccion > 0 ? (ventasProcesadas / proyeccion) * 100 : null;
      sheet.addRow({
        rif: cliente.rif,
        empresa: cliente.empresa,
        contacto: `${cliente.nombre} ${cliente.apellido}`,
        telefono: cliente.telefono || 'N/A',
        email: cliente.email,
        direccion: cliente.direccion || 'N/A',
        direccion_entrega: cliente.direccion_entrega || 'N/A',
        google_maps: cliente.google_maps || 'N/A',
        ciudad: cliente.ciudad || 'N/A',
        estado: cliente.estado,
        sector: cliente.sector || 'N/A',
        estado_anterior: cliente.estado_anterior || 'N/A',
        fecha_estado: cliente.fecha_estado
          ? new Date(cliente.fecha_estado).toLocaleString('es-VE')
          : 'N/A',
        etapa_venta: cliente.etapa_venta,
        proyeccion_venta:
          proyeccion != null ? Number(proyeccion.toFixed(2)) : 'Sin proyección',
        porcentaje_alcanzado:
          porcentaje != null ? Number(porcentaje.toFixed(2)) : '',
        notas: cliente.notas || 'N/A',
        vendedor: vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : 'N/A',
        fecha_creacion: cliente.fecha_creacion
          ? cliente.fecha_creacion
          : 'N/A',
        fecha_actualizacion: cliente.fecha_actualizacion
          ? cliente.fecha_actualizacion
          : 'N/A',
      });
    });

    // Formatear encabezados
    sheet.getRow(1).font = { bold: true };

    // Crear directorio si no existe
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Guardar el archivo
    const filePath = path.join(exportDir, 'clientes.xlsx');
    await workbook.xlsx.writeFile(filePath);

    return filePath;
    
}

export default exportClientesToExcel;