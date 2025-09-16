import { Request, Response } from "express";
import { BetModel } from "../models/Bet";
import { WalletModel } from "../models/Wallet";

import mongoose from "mongoose";

export const placeBet = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, phoneNumber, number, amount, date, period, type } = req.body;

    // ✅ Validate required fields
    if (
      !name ||
      !phoneNumber ||
      number === undefined ||
      !amount ||
      !date ||
      !period ||
      !type
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Normalize number (string to handle leading zero in Jodii)
    const numberStr = number.toString();

    // ✅ Validate number based on type
    if (type === "jodii") {
      if (!/^\d{2}$/.test(numberStr)) {
        return res.status(400).json({
          message: "For Jodii, number must be exactly two digits (00–99)",
        });
      }
    } else if (type === "up" || type === "down") {
      const num = Number(numberStr);
      if (isNaN(num) || num < 0 || num > 9) {
        return res.status(400).json({
          message: "For Up/Down, number must be a single digit (0–9)",
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid bet type" });
    }

    // ✅ Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // ✅ Check wallet balance
    const wallet = await WalletModel.findOne({ userId: req.user?._id }).session(
      session
    );
    if (!wallet || wallet.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ✅ Create bet
    const bet = new BetModel({
      userId: req.user?._id,
      name,
      phoneNumber,
      number: type === "jodii" ? numberStr : Number(numberStr), // keep 2-digit string for Jodii
      amount,
      date: new Date(date),
      period,
      type,
      status: "pending",
    });

    // ✅ Deduct balance and save
    wallet.balance -= amount;
    await wallet.save({ session });
    await bet.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Bet placed successfully",
      transactionId: bet.transactionId,
      bet,
      newBalance: wallet.balance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Bet placement error:", error);
    return res.status(500).json({
      message: "Error placing bet",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserBets = async (req: Request, res: Response) => {
  try {
    const bets = await BetModel.find({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 bets for performance

    res.json(bets);
  } catch (error) {
    console.error("Get user bets error:", error);
    res.status(500).json({ message: "Error fetching bets history" });
  }
};
