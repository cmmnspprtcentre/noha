import { createCanvas, loadImage } from "canvas";
import path from "path";
import fs from "fs";


const getBackgroundPath = (period: "morning" | "afternoon" | "evening") => {
  switch (period) {
    case "morning":
      return path.resolve(__dirname, "../public/backgrounds/morning.png");
    case "afternoon":
      return path.resolve(__dirname, "../public/backgrounds/afternoon.png");
    case "evening":
      return path.resolve(__dirname, "../public/backgrounds/evening.png");
    default:
      return path.resolve(__dirname, "../public/backgrounds/default.png");
  }
};


export const generateResultImage = async (
  period: "morning" | "afternoon" | "evening",
  type: "up" | "down",
  cardLabel: string,
  suit: string,
  date: string,
  time: string
): Promise<string> => {
  const bgPath = getBackgroundPath(period);
  const bg = await loadImage(bgPath);

  const canvas = createCanvas(800, 1000);
  const ctx = canvas.getContext("2d");

  // 🎨 Draw background
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  // 🖋 Royal fonts
  ctx.font = "bold 50px serif";
  ctx.fillStyle = "gold";
  ctx.textAlign = "center";

  // 👑 Title
  ctx.fillText("👑 Royal Game Result 👑", canvas.width / 2, 100);

  // ⚔️ Session
  ctx.font = "bold 40px serif";
  ctx.fillStyle = "white";
  ctx.fillText(`${period.toUpperCase()} SESSION`, canvas.width / 2, 180);

  // 📅 Date & Time
  ctx.font = "30px serif";
  ctx.fillStyle = "lightyellow";
  ctx.fillText(`📅 Date: ${date}`, canvas.width / 2, 250);
  ctx.fillText(`⏰ Time: ${time}`, canvas.width / 2, 300);

  // 🔺/🔻 Bet Type
  ctx.font = "bold 36px serif";
  ctx.fillStyle = "aqua";
  if (type === "up") ctx.fillText("🔺 Top Card (UP)", canvas.width / 2, 380);
  else ctx.fillText("🔻 Bottom Card (DOWN)", canvas.width / 2, 380);

  // 🃏 Winning Card
  ctx.font = "bold 45px serif";
  ctx.fillStyle = "gold";
  ctx.fillText(`🃏 ${cardLabel} of ${suit}`, canvas.width / 2, 480);

  // 🥂 Celebration
  ctx.font = "28px serif";
  ctx.fillStyle = "white";
  ctx.fillText("🥂 Cheers to the Victors!", canvas.width / 2, 600);
  ctx.fillText("✨ Your glory shines brighter today! ✨", canvas.width / 2, 650);

  // Save to file
  const filePath = path.resolve(__dirname, `../public/results/${period}-${Date.now()}.png`);
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);

  return filePath;
};
