import { Router } from 'express';
import * as ctrl from '../controllers/tsd-public.controller';
import { validateBody } from '../middlewares/validate';
import { emptyBodySchema } from '../validators/tsd.validator';

const router = Router();

router.post('/status', validateBody(emptyBodySchema), ctrl.operationalStatus);

export default router;
