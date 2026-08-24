import express from 'express';
import router from './routes/indexRoutes';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger.json';
import { errorHandler } from './middlewares/errorHandler';
import { Request } from 'express';

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'https://crm-sumichen.vercel.app',
  'https://crm-sumichen-back.vercel.app',
  'https://crmsumichem.vps.webdock.cloud',
  'https://crmsumichen.com',

];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    // Guardar el body crudo para poder verificar HMAC de webhooks (Meta firma
    // los bytes exactos del request; JSON.stringify(req.body) NO coincide).
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(morgan('dev'));
app.use(router);
// Configure Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(errorHandler);
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
export default app;
