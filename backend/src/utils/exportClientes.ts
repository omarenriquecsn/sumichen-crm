import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getClientesService } from '../services/clientesServices';
import { getUsuariosService } from '../services/usuariosServices';

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
      { header: 'Ciudad', key: 'ciudad', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Vendedor', key: 'vendedor', width: 36 },
      { header: 'Etapa Pipeline', key: 'etapa_venta', width: 15 },
      { header: 'Fecha de Creación', key: 'fecha_creacion', width: 20 },
      { header: 'Última Actualización', key: 'fecha_actualizacion', width: 20 },
      { header: 'Notas', key: 'notas', width: 100},

    ];

    // Mapear y agregar filas
    clientes.forEach((cliente) => {
      const vendedor = vendedores.find(
        (v) => v.id === cliente.vendedor_id,
      );
      sheet.addRow({
        rif: cliente.rif,
        empresa: cliente.empresa,
        contacto: `${cliente.nombre} ${cliente.apellido}`,
        telefono: cliente.telefono || 'N/A',
        email: cliente.email,
        direccion: cliente.direccion || 'N/A',
        ciudad: cliente.ciudad || 'N/A',
        estado: cliente.estado,
        etapa_venta: cliente.etapa_venta,
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