import mongoose from "mongoose";
import { BetModel } from "../models/Bet";
import { BetResultModel } from "../models/BetResult";
import { WalletModel } from "../models/Wallet";
import dayjs from "dayjs";

export const determineWinningNumber = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down" | "jodii"
) => {
  const today = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const startOfDay = new Date(today);

  console.log("🔍 Determining winning number for", {
    period,
    type,
    startOfDay,
  });

  // 1️⃣ Fetch bets (include jodii if up/down)
  const bets = await BetModel.find({
    period,
    type: { $in: [type, "jodii"] },
    date: startOfDay,
    status: "pending",
  });

  // 2️⃣ Initialize totals
  const totals: Record<string, number> = {};
  if (type === "up" || type === "down") {
    for (let i = 0; i <= 9; i++) totals[i.toString()] = 0;
  } else {
    for (let i = 0; i <= 99; i++) totals[i.toString().padStart(2, "0")] = 0;
  }

  // 3️⃣ Process bets if found
  if (bets.length > 0) {
    for (const bet of bets) {
      if (type === "jodii" && bet.type === "jodii") {
        const key = bet.number.toString().padStart(2, "0");
        totals[key] += bet.amount;
      } else if (type === "up") {
        if (bet.type === "up") {
          totals[bet.number.toString()] += bet.amount;
        } else if (bet.type === "jodii") {
          const numStr = bet.number.toString().padStart(2, "0");
          const upDigit = numStr[1]; // last digit
          totals[upDigit] += bet.amount;
        }
      } else if (type === "down") {
        if (bet.type === "down") {
          totals[bet.number.toString()] += bet.amount;
        } else if (bet.type === "jodii") {
          const numStr = bet.number.toString().padStart(2, "0");
          const downDigit = numStr[0]; // first digit
          totals[downDigit] += bet.amount;
        }
      }
    }
  } else {
    console.log(`⚠️ No bets for ${period} ${type}, picking random winner.`);
  }

  // 4️⃣ Pick winner
  let winningNum: string;
  if (bets.length === 0) {
    if (type === "jodii") {
      winningNum = String(Math.floor(Math.random() * 100)).padStart(2, "0");
    } else {
      winningNum = String(Math.floor(Math.random() * 10));
    }
  } else {
    const minAmount = Math.min(...Object.values(totals));
    const candidates = Object.entries(totals)
      .filter(([_, amt]) => amt === minAmount)
      .map(([num]) => num);

    winningNum = candidates[Math.floor(Math.random() * candidates.length)];
  }

  const winningKey = `${type}-${winningNum}`;

  // 5️⃣ Calculate winners & losers
  const winners: any[] = [];
  const losers: any[] = [];

  for (const bet of bets) {
    let isWinner = false;

    if (type === "up" && bet.type === "up") {
      isWinner = bet.number.toString() === winningNum;
    } else if (type === "down" && bet.type === "down") {
      isWinner = bet.number.toString() === winningNum;
    } else if (type === "jodii" && bet.type === "jodii") {
      isWinner = bet.number.toString().padStart(2, "0") === winningNum;
    } else if (bet.type === "jodii") {
      const numStr = bet.number.toString().padStart(2, "0");
      if (type === "up") {
        isWinner = numStr[1] === winningNum;
      } else if (type === "down") {
        isWinner = numStr[0] === winningNum;
      }
    }

    if (isWinner) {
      winners.push(bet);
    } else {
      losers.push(bet);
    }
  }

  // 6️⃣ Update bet status & credit wallets
  for (const bet of winners) {
    const multiplier = bet.type === "jodii" ? 15 : 8;
    const winningAmount = bet.amount * multiplier;

    await BetModel.findByIdAndUpdate(bet._id, { status: "won" });

    await WalletModel.findOneAndUpdate(
      { userId: bet.userId },
      { $inc: { balance: winningAmount } },
      { upsert: true, new: true }
    );
  }

  for (const bet of losers) {
    await BetModel.findByIdAndUpdate(bet._id, { status: "lost" });
  }

  const totalWon = winners.reduce((acc, w) => acc + w.amount, 0);
  const totalLoss = losers.reduce((acc, l) => acc + l.amount, 0);
  const totalBet = bets.reduce((acc, b) => acc + b.amount, 0);

  // 7️⃣ Save result
  const result = new BetResultModel({
    period,
    date: startOfDay.toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    winningNumber: winningKey,
    totalWon,
    totalLoss,
    sessionTotal: totalBet,
    winners: winners.map((w) => ({
      userId: w.userId,
      name: w.name,
      phoneNumber: w.phoneNumber,
      number: w.number,
      amount: w.amount,
    })),
    losers: losers.map((l) => ({
      userId: l.userId,
      name: l.name,
      phoneNumber: l.phoneNumber,
      number: l.number,
      amount: l.amount,
    })),
  });

  console.log("🏆 Winning number for", {
    period,
    type,
    winningKey,
    winners,
    losers,
  });

  await result.save();

  return result;
};
