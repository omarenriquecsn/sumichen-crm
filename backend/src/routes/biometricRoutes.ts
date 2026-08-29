import { Router } from 'express';
import verificarToken from '../middlewares/jwtHandler';
import { asyncHandler } from '../middlewares/asyncHandler';
import {
  iniciarRegistroBiometrico,
  completarRegistroBiometrico,
  iniciarLoginBiometrico,
  completarLoginBiometrico,
  listarCredencialesBiometricas,
  eliminarCredencialBiometrica,
} from '../controllers/biometricControllers';

const router: Router = Router();

// Registro de huella/dispositivo: solo con sesión activa (JWT).
router.post('/auth/biometric/registrar/inicio', verificarToken, asyncHandler(iniciarRegistroBiometrico));
router.post('/auth/biometric/registrar/completar', verificarToken, asyncHandler(completarRegistroBiometrico));
router.get('/auth/biometric/credenciales', verificarToken, asyncHandler(listarCredencialesBiometricas));
router.delete('/auth/biometric/credenciales/:id', verificarToken, asyncHandler(eliminarCredencialBiometrica));

// Login biométrico: público (ocurre antes de tener sesión).
router.post('/auth/biometric/login/inicio', asyncHandler(iniciarLoginBiometrico));
router.post('/auth/biometric/login/completar', asyncHandler(completarLoginBiometrico));

export default router;
