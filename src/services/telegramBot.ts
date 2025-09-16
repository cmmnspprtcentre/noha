// src/bot/telegramBot.ts

import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { determineWinningNumber } from "./betHelper";
import { BetModel } from "../models/Bet";
import path from "path";
import fs from "fs";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CHANNEL_ID = process.env.CHANNEL_ID!;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // https://yourdomain.com
const ENV = process.env.NODE_ENV || "dev";

let botInstance: TelegramBot | null = null;

// Store active poll IDs
const activePolls: Record<
  string,
  { up?: { messageId: number }; down?: { messageId: number } }
> = {
  morning: {},
  afternoon: {},
  evening: {},
};

// Cache last results for Jodii calculation
const periodResults: Record<
  string,
  { up?: { num: number; suit: string }; down?: { num: number; suit: string } }
> = {
  morning: {},
  afternoon: {},
  evening: {},
};

const numberToCard = (num: number): string => {
  if (num === 0 || num === 10) return "10";
  if (num === 1) return "A";
  return num.toString();
};

const generateWinnerList = async (
  period: "morning" | "afternoon" | "evening",
  date: Date
): Promise<string> => {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const winners = await BetModel.find({
    period,
    status: "won",
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (winners.length === 0) return "No winners 🎴";

  return winners
    .map(
      (w) =>
        `👤 ${w.name} - Card: ${numberToCard(w.number)} - Bet: ₹${w.amount}`
    )
    .join("\n");
};

// Handle result draw
const handleDraw = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down"
) => {
  const now = dayjs();
  const todayKey = now.format("DD MMM YYYY");
  const timeKey = now.format("hh:mm A");

  const result = await determineWinningNumber(period, type);
  if (!result) {
    botInstance?.sendMessage(CHANNEL_ID, `❌ No bets for ${period} ${type}`);
    return;
  }

  const winningNum = Number(
    result.winningNumber.includes("-")
      ? result.winningNumber.split("-")[1]
      : result.winningNumber
  );

  const cardLabel = numberToCard(winningNum);
  const suits = ["Spades", "Clubs", "diamond", "heart"];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const cardPath = path.resolve(
    __dirname,
    `../public/cards/${suit}/${cardLabel}.png`
  );

  const caption = `
👑 *Royal Game Result* 👑  

━━━━━━━━━━━━━━━
⚔️ *${period.toUpperCase()} SESSION* ⚔️  
━━━━━━━━━━━━━━━

📅 *Date:* \`${todayKey}\`  
⏰ *Time:* \`${timeKey}\`  

${type === "up" ? "🔺 *Top Card (UP)*" : "🔻 *Bottom Card (DOWN)*"}  

🃏 *Winning Card:* \`${cardLabel} of ${suit}\`  

━━━━━━━━━━━━━━━
🥂 *Cheers to the Victors!*  
✨ Your glory shines brighter today! ✨  
━━━━━━━━━━━━━━━
`;

  await botInstance?.sendPhoto(
    CHANNEL_ID,
    fs.createReadStream(cardPath) as unknown as string,
    { caption, parse_mode: "Markdown" }
  );

  // Store for Jodii
  periodResults[period][type] = { num: winningNum, suit };

  // If both done → publish Jodii
  if (periodResults[period].up && periodResults[period].down) {
    const down = periodResults[period].down;
    const up = periodResults[period].up;
    const jodiiCaption = `
👑 *Royal Game Result* 👑  

━━━━━━━━━━━━━━━
⚔️ *${period.toUpperCase()} SESSION* ⚔️  
━━━━━━━━━━━━━━━

📅 *Date:* \`${todayKey}\`  
⏰ *Time:* \`${timeKey}\`  

🎲 *Jodii (Pair)*  

🃏 *Winning Cards:* \`${numberToCard(down.num)} of ${
      down.suit
    }\` + \`${numberToCard(up.num)} of ${up.suit}\`  

━━━━━━━━━━━━━━━
🥂 *Cheers to the Victors!*  
✨ Double the glory, double the rewards! ✨  
━━━━━━━━━━━━━━━
`;
    await botInstance?.sendMediaGroup(CHANNEL_ID, [
      {
        type: "photo",
        media: fs.createReadStream(
          path.resolve(
            __dirname,
            `../public/cards/${down.suit}/${numberToCard(down.num)}.png`
          )
        ) as unknown as string,
        caption: jodiiCaption,
        parse_mode: "Markdown",
      },
      {
        type: "photo",
        media: fs.createReadStream(
          path.resolve(
            __dirname,
            `../public/cards/${up.suit}/${numberToCard(up.num)}.png`
          )
        ) as unknown as string,
      },
    ]);

    periodResults[period] = {};
  }
};

// Initialize Telegram bot (webhook mode, no polling)
export const initTelegramBot = () => {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");
  if (!CHANNEL_ID) throw new Error("CHANNEL_ID is required");

  const bot = new TelegramBot(BOT_TOKEN); // no polling
  botInstance = bot;

  bot.onText(/\/start/, (msg) =>
    bot.sendMessage(msg.chat.id, "Welcome to the betting bot! 🎴")
  );
  bot.onText(/\/status/, (msg) =>
    bot.sendMessage(msg.chat.id, "Bot is active ✅")
  );

  // Set webhook if URL is provided
  if (WEBHOOK_URL) {
    bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
    console.log("✅ Telegram webhook set at", `${WEBHOOK_URL}/bot${BOT_TOKEN}`);
  } else {
    console.warn("⚠️ WEBHOOK_URL not set. Bot will not receive updates.");
  }

  const isDev = ENV === "dev";

  // Schedule draws only
  cron.schedule(isDev ? "*/2 * * * *" : "0 11 * * *", () =>
    handleDraw("morning", "down")
  );
  cron.schedule(isDev ? "*/3 * * * *" : "30 11 * * *", () =>
    handleDraw("morning", "up")
  );
  cron.schedule(isDev ? "*/2 * * * *" : "0 15 * * *", () =>
    handleDraw("afternoon", "down")
  );
  cron.schedule(isDev ? "*/3 * * * *" : "30 15 * * *", () =>
    handleDraw("afternoon", "up")
  );
  cron.schedule(isDev ? "*/2 * * * *" : "30 22 * * *", () =>
    handleDraw("evening", "down")
  );
  cron.schedule(isDev ? "*/3 * * * *" : "0 23 * * *", () =>
    handleDraw("evening", "up")
  );

  return bot;
};

export const getBotInstance = () => botInstance;
export const getBotStatus = () => ({
  isActive: !!botInstance,
  activeUsers: botInstance ? 1 : 0,
  messagesReceived: 0,
  commandsUsed: 0,
});
