import { Request, Response } from 'express';
import path from 'path';

export const getArchivos = async (req: Request, res: Response) => {
      const fileName = req.params.fileName;
      const filePath = path.join(__dirname, '../../uploads/evidencias', fileName);
      console.log(filePath);
    
      // Inline: el navegador muestra el PDF dentro de la pestaña en lugar de descargarlo.
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.sendFile(filePath, (err) => {
        if (err) {
          res.status(404).json({ error: 'Archivo no encontrado' });
        }
      });
};