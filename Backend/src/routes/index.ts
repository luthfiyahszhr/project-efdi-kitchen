import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import operationalRoutes from './operational.routes';
import orderRoutes from './order.routes';
import adminRoutes from './admin.routes';
import appRoutes from './app.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/katalog', productRoutes);
router.use('/operasional', operationalRoutes);
router.use('/pesanan', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/app', appRoutes);

export default router;

