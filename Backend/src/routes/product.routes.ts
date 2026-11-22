import { Router } from 'express';
import * as ctrl from '../controllers/tsd-public.controller';
import { validateBody } from '../middlewares/validate';
import { catalogSearchSchema, emptyBodySchema } from '../validators/tsd.validator';

const router = Router();

router.post('/cari', validateBody(catalogSearchSchema), ctrl.catalogSearch);
router.post('/:id_produk/detail', validateBody(emptyBodySchema), ctrl.catalogDetail);

export default router;
