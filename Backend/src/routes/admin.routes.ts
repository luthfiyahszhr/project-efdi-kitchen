import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as ctrl from '../controllers/tsd-admin.controller';
import { uploadProduct } from '../middlewares/upload';
import { validateBody, positiveId, parseMultipartData, validateUploadedImage } from '../middlewares/validate';
import {
  activeProductSchema,
  cashPaymentSchema,
  customerSearchSchema,
  emptyBodySchema,
  inventoryCreateSchema,
  inventoryMutationSchema,
  inventorySearchSchema,
  minimumStockSchema,
  needsSchema,
  operationalSettingsSchema,
  orderSearchSchema,
  orderStatusSchema,
  paymentSearchSchema,
  paymentVerifySchema,
  productFormSchema,
  reportSchema,
  resetCustomerPasswordSchema,
} from '../validators/tsd.validator';
import { lookupRateLimit } from '../middlewares/rateLimit';

const router = Router();
router.use(authenticate, authorize('Admin', 'Owner'));

router.post('/produk', uploadProduct.single('foto'), validateUploadedImage, parseMultipartData, validateBody(productFormSchema), ctrl.createProduct);
router.put('/produk/:id_produk', positiveId, uploadProduct.single('foto'), validateUploadedImage, parseMultipartData, validateBody(productFormSchema), ctrl.updateProduct);
router.patch('/produk/:id_produk/aktif', positiveId, validateBody(activeProductSchema), ctrl.setProductActive);

router.post('/pembayaran/cari', lookupRateLimit, validateBody(paymentSearchSchema), ctrl.searchPayments);
router.post('/pembayaran/:id_pembayaran/bukti', positiveId, validateBody(emptyBodySchema), ctrl.viewPaymentProof);
router.post('/pembayaran/:id_pembayaran/verifikasi', positiveId, validateBody(paymentVerifySchema, (paths) => (
  paths.includes('alasan_penolakan') ? 'ERR-PAY-02' : 'ERR-VAL-06'
)), ctrl.verifyPayment);
router.post('/pesanan/:id_pesanan/pembayaran/tunai', positiveId, validateBody(cashPaymentSchema, (paths) => (
  paths.includes('nominal') ? 'ERR-PAY-05' : 'ERR-VAL-06'
)), ctrl.recordCashPayment);

router.post('/pesanan/cari', lookupRateLimit, validateBody(orderSearchSchema, (paths) => (
  paths.includes('tanggal_acara') ? 'ERR-VAL-04' : 'ERR-VAL-06'
)), ctrl.searchOrders);
router.patch('/pesanan/:id_pesanan/status', positiveId, validateBody(orderStatusSchema, (paths) => (
  paths.includes('alasan_pembatalan') ? 'ERR-ORD-05' : 'ERR-VAL-06'
)), ctrl.updateOrderStatus);

router.post('/kebutuhan/hitung', validateBody(needsSchema, (paths) => (
  paths.includes('tanggal') ? 'ERR-VAL-04' : 'ERR-VAL-06'
)), ctrl.calculateNeeds);
router.post('/kebutuhan/input-stok', validateBody(emptyBodySchema), ctrl.openStockInput);
router.post('/stok/cari', validateBody(inventorySearchSchema), ctrl.searchInventory);
router.post('/item', validateBody(inventoryCreateSchema), ctrl.createInventoryItem);
router.post('/stok/:id_item/mutasi', positiveId, validateBody(inventoryMutationSchema), ctrl.mutateInventory);
router.patch('/stok/:id_item/batas-minimum', positiveId, validateBody(minimumStockSchema), ctrl.setMinimumStock);

router.put('/operasional', validateBody(operationalSettingsSchema, 'ERR-VAL-07'), ctrl.saveOperationalSettings);
router.post('/operasional/detail', validateBody(emptyBodySchema), ctrl.operationalDetail);

router.post('/laporan/rekap', validateBody(reportSchema, (paths) => (
  paths.includes('tanggal') || paths.includes('bulan') ? 'ERR-VAL-04' : 'ERR-VAL-06'
)), authorize('Owner'), ctrl.financeReport);

router.post('/customer/cari', lookupRateLimit, validateBody(customerSearchSchema), ctrl.searchCustomers);
router.post('/customer/:id_pengguna/reset-password', positiveId, validateBody(resetCustomerPasswordSchema, 'ERR-VAL-01'), ctrl.resetCustomerPassword);

export default router;
