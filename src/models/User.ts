import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model<IUser>('User', userSchema);