
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.render('auth/login', { 
                messages: { error: 'User not found' }
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.render('auth/login', { 
                messages: { error: 'Invalid password' }
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        // Set token as cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hour
        });

        // Redirect to dashboard
        res.redirect('/dashboard');

    } catch (error) {
        res.render('auth/login', { 
            messages: { error: 'An error occurred during login' }
        });
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new UserModel({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};