import app from './server';
import { AppDataSource } from './config/dataBaseConfig';
import { iniciarSLA } from './worker/slaMonitor';
import { iniciarRecordatorios } from './worker/recordatorios';
import dotenv from 'dotenv';
dotenv.config();

AppDataSource.initialize().then(async () => {
  const stopSLA = await iniciarSLA();
  const stopRecordatorios = await iniciarRecordatorios();
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    stopSLA();
    stopRecordatorios();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stopSLA();
    stopRecordatorios();
    process.exit(0);
  });
});
