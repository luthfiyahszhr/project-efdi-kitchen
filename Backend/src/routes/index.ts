import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import operationalRoutes from './operational.routes';
import orderRoutes from './order.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/katalog', productRoutes);
router.use('/operasional', operationalRoutes);
router.use('/pesanan', orderRoutes);
router.use('/admin', adminRoutes);

export default router;


