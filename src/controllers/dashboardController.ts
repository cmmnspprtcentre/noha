import { Request, Response } from "express";
import { IUser } from "../models/User";
import { BetModel } from "../models/Bet";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    res.render("dashboard/dashboard", {
      // Changed from 'dashboard/index' to 'dashboard/dashboard'
      user,
      messages: {},
      whatsappNumber: process.env.WHATSAPP_NUMBER,
    });
  } catch (error) {
    res.status(500).json({ message: "Error accessing dashboard", error });
  }
};

export const getBetSummary = async (req: Request, res: Response) => {
  const bets = await BetModel.find({ userId: req.user?._id });

  const upBets: Record<number, { count: number; amount: number }> = {};
  const downBets: Record<number, { count: number; amount: number }> = {};
  const jodiiBets: Record<number, { count: number; amount: number }> = {};

  bets.forEach((b) => {
    const target =
      b.type === "up" ? upBets : b.type === "down" ? downBets : jodiiBets;
    if (!target[b.number]) target[b.number] = { count: 0, amount: 0 };
    target[b.number].count += 1;
    target[b.number].amount += b.amount;
  });

  res.render("pages/bet-summary", {
    layout: "layouts/main",
    upBets,
    downBets,
    jodiiBets,
  });
};
