import mongoose, { Document, Schema } from 'mongoose';

export interface IBet extends Document {
    userId: mongoose.Types.ObjectId;
    transactionId: string;
    name: string;
    phoneNumber: string;
    number: number;
    amount: number;
    date: Date;
    period: 'morning' | 'afternoon' | 'evening';
    type: 'up' | 'down' | 'jodii';
    status: 'pending' | 'won' | 'lost';
    createdAt: Date;
    updatedAt: Date;
}

const betSchema = new Schema<IBet>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: String, unique: true },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    number: { type: Number, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    period: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    type: { type: String, enum: ['up', 'down', 'jodii'], required: true },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Generate transaction ID before saving
betSchema.pre<IBet>('save', function(next) {
    if (!this.transactionId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let txn = '';
        for (let i = 0; i < 12; i++) {
            txn += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        this.transactionId = `TXN-${txn}`;
    }
    next();
});

export const BetModel = mongoose.model<IBet>('Bet', betSchema);