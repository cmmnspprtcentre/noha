import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User';

export const authenticateUser = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the token
    try {
        const verified = verifyToken(token);
        if (!verified) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

const verifyToken = (token: string): boolean => {
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return true;
    } catch {
        return false;
    }
};

export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.redirect('/auth/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
        
        const user = await UserModel.findById(decoded.id);
        if (!user) {
            return res.redirect('/auth/login');
        }

        req.user = user;
        next();
    } catch (error) {
        res.redirect('/auth/login');
    }
};