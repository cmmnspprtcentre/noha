import { Router } from 'express';
import { getDashboard, getBetSummary  } from '../controllers/dashboardController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.get('/', isAuthenticated, getDashboard);

// Bet summary page
router.get('/summary', isAuthenticated, getBetSummary);

export default router;