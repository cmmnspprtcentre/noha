import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const WalletModel = mongoose.model<IWallet>('Wallet', walletSchema);