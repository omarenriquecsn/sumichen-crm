import app from './server';
import { AppDataSource } from './config/dataBaseConfig';
import { iniciarSLA } from './worker/slaMonitor';
import dotenv from 'dotenv';
dotenv.config();

AppDataSource.initialize().then(async () => {
  const stopSLA = await iniciarSLA();
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    stopSLA();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stopSLA();
    process.exit(0);
  });
});
