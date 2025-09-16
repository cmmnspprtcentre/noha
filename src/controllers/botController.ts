import { Request, Response } from 'express';
import { getBotStatus, getBotInstance } from '../services/telegramBot';

export const getBotInfo = async (req: Request, res: Response) => {
    try {
        const status = getBotStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get bot status' });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { chatId, message } = req.body;
        const bot = getBotInstance();
        
        if (!bot) {
            return res.status(400).json({ error: 'Bot is not initialized' });
        }

        await bot.sendMessage(chatId, message);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};