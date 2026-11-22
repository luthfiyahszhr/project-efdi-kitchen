import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import * as ctrl from '../controllers/tsd-public.controller';
import { validateBody, positiveId, validateUploadedImage } from '../middlewares/validate';
import {
  cancelOrderSchema,
  createOrderSchema,
  orderLookupSchema,
  paymentUploadSchema,
} from '../validators/tsd.validator';
import { lookupRateLimit } from '../middlewares/rateLimit';

const router = Router();

router.post('/', authenticate, validateBody(createOrderSchema, (paths) => {
  if (paths.includes('no_kontak')) return 'ERR-VAL-02';
  if (paths.includes('tanggal_acara') || paths.includes('waktu_acara')) return 'ERR-VAL-04';
  return 'ERR-VAL-01';
}), ctrl.createOrder);
router.post('/:id_pesanan/pembayaran', authenticate, positiveId, upload.single('file_bukti'), validateUploadedImage, validateBody(paymentUploadSchema, (paths) => (
  paths.includes('nominal') ? 'ERR-PAY-05' : 'ERR-VAL-05'
)), ctrl.uploadPayment);
router.post('/status', lookupRateLimit, authenticate, validateBody(orderLookupSchema), ctrl.orderStatus);
router.post('/nota/unduh', lookupRateLimit, authenticate, validateBody(orderLookupSchema), ctrl.downloadNota);
router.post('/:id_pesanan/batal', authenticate, authorize('Customer'), positiveId, validateBody(cancelOrderSchema), ctrl.cancelOrder);

export default router;
