export interface User {
    id: string;
    username: string;
    password: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface TelegramBotConfig {
    botToken: string;
    channelId: string;
}

export interface Bet {
    time: 'morning' | 'afternoon' | 'evening';
    numbers: number[];
    amount: number;
    name: string;
}

export interface DailyResults {
    morning: number[] | null;
    afternoon: number[] | null;
    evening: number[] | null;
}