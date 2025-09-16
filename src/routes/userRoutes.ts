import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController';

const router = Router();

// Route to get user profile
router.get('/profile', getUserProfile);

// Route to update user profile
router.put('/profile', updateUserProfile);

export default router;