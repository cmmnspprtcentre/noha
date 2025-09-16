import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import authRoutes from './routes/authRoutes';
import { initTelegramBot, getBotInstance } from './services/telegramBot';
import dashboardRoutes from './routes/dashboardRoutes';
import cookieParser from 'cookie-parser';
import { getBotInfo, sendMessage } from './controllers/botController';
import { isAuthenticated } from './middleware/auth';
import walletRoutes from './routes/walletRoutes';
import betRoutes from './routes/betRoutes';

dotenv.config();

// Get and validate bot credentials
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
// for private channels, use -100XXXXXXXXX

if (!BOT_TOKEN || !CHANNEL_ID) {
    console.error('Missing required environment variables: BOT_TOKEN or CHANNEL_ID');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bets', betRoutes);
app.use('/dashboard', dashboardRoutes);

// Auth view routes
app.get('/auth/login', (req, res) => {
    res.render('auth/login', { messages: {} });
});

app.get('/auth/signup', (req, res) => {
    res.render('auth/signup', { messages: {} });
});

app.get('/api/bot/status', isAuthenticated, getBotInfo);
app.post('/api/bot/send', isAuthenticated, sendMessage);

// Initialize Telegram bot
try {
    const bot = initTelegramBot();   // polling-free
    console.log('Telegram bot initialized successfully');

    // Webhook endpoint for Telegram
    if (BOT_TOKEN) {
        app.post(`/bot${BOT_TOKEN}`, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });
        console.log(`Telegram webhook route registered at /bot${BOT_TOKEN}`);
    }
} catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    process.exit(1);
}

// MongoDB connection
const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
if (!DB_CONNECTION_STRING) {
    throw new Error('DB_CONNECTION_STRING is required');
}

mongoose.connect(DB_CONNECTION_STRING)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
