import mongoose, { Schema, Document } from "mongoose";

export interface IUserBetDetail {
  userId: mongoose.Types.ObjectId;
  name: string;
  phoneNumber: string;
  number: number | string;
  amount: number;
}

export interface IBetResult extends Document {
  period: "morning" | "afternoon" | "evening";
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  winningNumber: string; // can be "7", "75", etc.
  totalWon: number;
  totalLoss: number;
  sessionTotal: number;
  winners: IUserBetDetail[];
  losers: IUserBetDetail[];
  createdAt: Date;
}

const UserBetDetailSchema = new Schema<IUserBetDetail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    phoneNumber: String,
    number: String,
    amount: Number,
  },
  { _id: false }
);

const BetResultSchema = new Schema<IBetResult>(
  {
    period: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      required: true,
    },
    date: { type: String, required: true },
    time: { type: String, required: true },
    winningNumber: { type: String, required: true },
    totalWon: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    sessionTotal: { type: Number, default: 0 },
    winners: [UserBetDetailSchema],
    losers: [UserBetDetailSchema],
  },
  { timestamps: true }
);

export const BetResultModel = mongoose.model<IBetResult>(
  "BetResult",
  BetResultSchema
);
