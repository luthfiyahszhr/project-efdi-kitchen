import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as ctrl from '../controllers/auth.controller';
import * as v from '../validators/auth.validator';
import { authRateLimit } from '../middlewares/rateLimit';
import { validateBody } from '../middlewares/validate';
import { emptyBodySchema } from '../validators/tsd.validator';

const router = Router();

router.post('/me', authenticate, validateBody(emptyBodySchema), ctrl.me);
router.post('/register', authRateLimit, v.register, ctrl.register);
router.post('/login', authRateLimit, v.login, ctrl.login);
router.post('/logout', authenticate, validateBody(emptyBodySchema), ctrl.logout);

export default router;
