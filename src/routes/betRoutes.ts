import { Router } from 'express';
import { placeBet, getUserBets } from '../controllers/betController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.post('/place', isAuthenticated, placeBet);
router.get('/history', isAuthenticated, getUserBets);

export default router;