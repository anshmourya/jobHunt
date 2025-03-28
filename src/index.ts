import TelegramBot from "node-telegram-bot-api";
const token = process.env.TOKEN as string;
const apiHash = process.env.API_HASH as string;
const apiId = process.env.API_ID as string;
const bot = new TelegramBot(token, {
  polling: true,
});

bot.on("message", (msg) => {
  console.log(msg);
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText === "/start") {
    bot.sendMessage(chatId, "Welcome to the bot!");
  }
  if (messageText === "/help") {
    bot.sendMessage(chatId, "Help message");
  }
});

export default bot;
