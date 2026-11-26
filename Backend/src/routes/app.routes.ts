import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { emptyBodySchema } from '../validators/tsd.validator';
import { bootstrap } from '../controllers/app-data.controller';

const router = Router();

router.post('/bootstrap', authenticate, validateBody(emptyBodySchema), bootstrap);

export default router;
