// src/bot/telegramBot.ts

import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { determineWinningNumber } from "./betHelper"; // adjust path
import { BetModel } from "../models/Bet"; // adjust path
import path from "path";
import fs from "fs";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CHANNEL_ID = process.env.CHANNEL_ID!;
const ENV = process.env.NODE_ENV || "dev";

let botInstance: TelegramBot | null = null;

// Store active poll IDs so we can close them later
const activePolls: Record<
  string,
  { up?: { messageId: number }; down?: { messageId: number } }
> = {
  morning: {},
  afternoon: {},
  evening: {},
};

// cache last results for jodii calculation
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

  if (winners.length === 0) {
    return "No winners 🎴";
  }

  return winners
    .map(
      (w) =>
        `👤 ${w.name} - Card: ${numberToCard(w.number)} - Bet: ₹${w.amount}`
    )
    .join("\n");
};


// 📊 Create poll before session
const sendGuessPoll = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down"
) => {
  const sessionTime =
    period === "morning"
      ? "11:00 AM"
      : period === "afternoon"
      ? "03:00 PM"
      : "11:00 PM";

  const typeLabel =
    type === "up"
      ? "🔺 Top Card (UP) | ⬆️ ऊपर का कार्ड"
      : "🔻 Bottom Card (DOWN) | ⬇️ नीचे का कार्ड";

  // 📢 Game Instructions (English + Hindi)
  const howToPlay = `
📢 *How to Play – Shauv Ank Royale* 🎴✨

🕒 *Sessions*
▪️ Morning 🌅
▪️ Afternoon ☀️
▪️ Evening 🌙

🃏 *Deck*
▪️ 40 cards (Ace–10 only)
▪️ J, Q, K are not used

🎲 *Draw*
▪️ Each session → 2 cards are drawn
▪️ Up Card = Top card (shown first)
▪️ Down Card = Card below it (shown second)

💰 *Stakes (Bets)*
▪️ You bet on a number (1–10)
▪️ Suit doesn’t matter (any suit counts)

🔄 *Bounce (Winning Rule)*
✔️ 1 card matches → Win *8X*
✔️ Both cards match → Win *15X* 🎉

🏆 *Example*
Up Card → 8♠️  
Down Card → 2♥️  
✔️ Bet on 8 → Win X8  
✔️ Bet on 2 → Win 2X  
✔️ If both are 82 → Win 15X 🔥

👉 Pick your number → Wait for the draw → Match → Win big!
⚡️ Play smart, play daily only at Shauv Ank Royale 🎴✨

━━━━━━━━━━━━━━━━━━━━━━
📢 *कैसे खेलें – Shauv Ank Royale* 🎴✨

🕒 *सेशन्स*
▪️ सुबह 🌅
▪️ दोपहर ☀️
▪️ शाम 🌙

🃏 *पत्तों की गड्डी*
▪️ 40 पत्ते (A से 10 तक)
▪️ J, Q, K शामिल नहीं हैं

🎲 *ड्रा*
▪️ हर सेशन में 2 पत्ते निकाले जाते हैं  
▪️ Up Card = सबसे ऊपर का पत्ता  
▪️ Down Card = उसके नीचे का पत्ता  

💰 *दांव (बेट)*
▪️ आप सिर्फ नंबर (1–10) पर दांव लगाते हैं  
▪️ रंग/सूट मायने नहीं रखता  

🔄 *Bounce (जीतने का नियम)*
✔️ 1 पत्ता मिला → जीत *8X*  
✔️ दोनों मिले → जीत *15X* 🎉  

🏆 *उदाहरण*  
Up Card → 8♠️  
Down Card → 2♥️  
✔️ अगर आपने 8 चुना → जीत X8  
✔️ अगर आपने 2 चुना → जीत 2X  
✔️ अगर दोनों 82 निकले → जीत 15X 🔥  

👉 नंबर चुनें → ड्रा का इंतज़ार करें → मिलते ही जीत पक्की!  
⚡️ स्मार्ट खेलें, हर दिन खेलें सिर्फ Shauv Ank Royale 🎴✨
`;

  // Send rules before poll
  await botInstance?.sendMessage(CHANNEL_ID, howToPlay, {
    parse_mode: "Markdown",
  });

  // Short session header
  const headerMsg = `
👑 *Royal ${period.charAt(0).toUpperCase() + period.slice(1)} Session* 👑
━━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${dayjs().format("DD MMM YYYY")}
🕒 *Time:* ${sessionTime}
⚔️ *Prediction Battle* ⚔️
━━━━━━━━━━━━━━━━━━━━━━
`;

  await botInstance?.sendMessage(CHANNEL_ID, headerMsg, {
    parse_mode: "Markdown",
  });

  // Poll question (kept short for Telegram limit)
  const question = `❓ Which number will appear on the ${typeLabel}?`;

  const options = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  try {
    const pollMsg = await botInstance?.sendPoll(CHANNEL_ID, question, options, {
      is_anonymous: process.env.POLL_ANON !== "false",
      allows_multiple_answers: false,
    });

    if (pollMsg) {
      activePolls[period][type] = { messageId: pollMsg.message_id };
    }
  } catch (err) {
    console.error("❌ Failed to send poll:", err);
  }
};



// 🛑 Close poll when session starts
const closePoll = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down"
) => {
  const pollData = activePolls[period][type];
  if (pollData?.messageId) {
    await botInstance?.stopPoll(CHANNEL_ID, pollData.messageId);
    delete activePolls[period][type]; // clear stored poll
  }
};

// 🎲 Handle result draw
const handleDraw = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down"
) => {
  // ✅ Close the poll for this session/type
  await closePoll(period, type);

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
  const suits = ["Spades", "Clubs", "Diamond", "Heart"];
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

export const initTelegramBot = () => {
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");
  if (!CHANNEL_ID) throw new Error("CHANNEL_ID is required");

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  botInstance = bot;

  bot.onText(/\/start/, (msg) =>
    bot.sendMessage(msg.chat.id, "Welcome to the betting bot! 🎴")
  );
  bot.onText(/\/status/, (msg) =>
    bot.sendMessage(msg.chat.id, "Bot is active ✅")
  );

  const isDev = ENV === "dev";

  /**
   * 🕒 CRON JOB SCHEDULE (Production Mode)
   *
   * Morning Session:
   *  - 05:00 → Send Down poll
   *  - 05:05 → Send Up poll
   *  - 11:00 → Reveal Down draw
   *  - 11:30 → Reveal Up draw
   *
   * Afternoon Session:
   *  - 12:00 → Send Down poll
   *  - 12:05 → Send Up poll
   *  - 15:00 → Reveal Down draw
   *  - 15:30 → Reveal Up draw
   *
   * Evening Session:
   *  - 16:00 → Send Down poll
   *  - 16:05 → Send Up poll
   *  - 22:30 → Reveal Down draw
   *  - 23:00 → Reveal Up draw
   */

  // Morning
  // cron.schedule(isDev ? "*/1 * * * *" : "0 5 * * *", () =>
  //   sendGuessPoll("morning", "down")
  // );
  // cron.schedule(isDev ? "*/1 * * * *" : "5 5 * * *", () =>
  //   sendGuessPoll("morning", "up")
  // );
  // cron.schedule(isDev ? "*/2 * * * *" : "0 11 * * *", () =>
  //   handleDraw("morning", "down")
  // );
  // cron.schedule(isDev ? "*/3 * * * *" : "30 11 * * *", () =>
  //   handleDraw("morning", "up")
  // );

  // Afternoon
  cron.schedule(isDev ? "*/1 * * * *" : "0 12 * * *", () =>
    sendGuessPoll("afternoon", "down")
  );
  cron.schedule(isDev ? "*/1 * * * *" : "5 12 * * *", () =>
    sendGuessPoll("afternoon", "up")
  );
  cron.schedule(isDev ? "*/2 * * * *" : "0 15 * * *", () =>
    handleDraw("afternoon", "down")
  );
  cron.schedule(isDev ? "*/3 * * * *" : "30 15 * * *", () =>
    handleDraw("afternoon", "up")
  );

  // Evening
  // cron.schedule(isDev ? "*/1 * * * *" : "0 16 * * *", () =>
  //   sendGuessPoll("evening", "down")
  // );
  // cron.schedule(isDev ? "*/1 * * * *" : "5 16 * * *", () =>
  //   sendGuessPoll("evening", "up")
  // );
  // cron.schedule(isDev ? "*/2 * * * *" : "30 22 * * *", () =>
  //   handleDraw("evening", "down")
  // );
  // cron.schedule(isDev ? "*/3 * * * *" : "0 23 * * *", () =>
  //   handleDraw("evening", "up")
  // );

  return bot;
};

export const getBotInstance = () => botInstance;
export const getBotStatus = () => ({
  isActive: !!botInstance,
  activeUsers: botInstance ? 1 : 0,
  messagesReceived: 0,
  commandsUsed: 0,
});
