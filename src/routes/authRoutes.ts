
import { Router } from 'express';
import { login, signup } from '../controllers/authController';

const router = Router();

// View routes
router.get('/login', (req, res) => {
    res.render('auth/login', { messages: {} });
});

router.get('/signup', (req, res) => {
    res.render('auth/signup', { messages: {} });
});

// API routes
router.post('/login', login);
router.post('/signup', signup);

export default router;