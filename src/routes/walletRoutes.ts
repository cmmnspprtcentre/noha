import { Router } from 'express';
import { getWalletBalance, addTokens } from '../controllers/walletController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/balance', isAuthenticated, getWalletBalance);
router.post('/add', isAuthenticated, addTokens);

export default router;