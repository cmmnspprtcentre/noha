import { Request, Response } from 'express';
import { WalletModel } from '../models/Wallet';

export const getWalletBalance = async (req: Request, res: Response) => {
    try {
        const wallet = await WalletModel.findOne({ userId: req.user?._id });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        res.json({ balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wallet balance', error });
    }
};



export const addTokens = async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        const wallet = await WalletModel.findOneAndUpdate(
            { userId: req.user?._id },
            { $inc: { balance: amount } },
            { new: true, upsert: true }
        );
        res.json({ message: 'Tokens added successfully', balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ message: 'Error adding tokens', error });
    }
};