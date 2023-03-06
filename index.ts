import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";

const app = express();
app.use(bodyParser.json());

const env = dotenv.parse(
  fs.readFileSync(path.join(__dirname, ".env"), "utf-8")
);
const bot = new TelegramBot(env.TOKEN);

app.get("/", (_req, res) => {
  console.log("/");
  res.end("ok");
});

app.post("/api-no-body-knows", async (req, res) => {
  try {
    const prompt = req.body.prompt.split("\n")[0];
    console.log("/api-no-body-knows >", prompt);
    const { data } = await axios.post(
      `${env.CHATAPI_SINGLE_HOST}message/0000_hey_siri`,
      {
        message: `Please answer shortly. ${prompt}`,
      },
      {
        proxy: false,
      }
    );
    console.log("/api-no-body-knows <", data.response);
    res.json({
      success: true,
      text: data.response,
    });
  } catch (e: any) {
    res.json({
      success: false,
      text: e.message,
    });
  }
});

// axios.get(`${env.CHATAPI_SINGLE_HOST}`, { proxy: false }).then((res) => {
//   console.log(res.data);
// });

app.post("/webhook", async (req, res) => {
  try {
    console.log("/webhook");
    const update = req.body;
    console.log("<<<", JSON.stringify(update));
    res.sendStatus(200);
    const chatId = update.message.chat.id;
    // always return 200 for telegram webhook
    if (update.message) {
      if (update.message.chat.type === "supergroup") {
        if (update.message.text.startsWith("/chat ")) {
          const message = update.message.text.replace("/chat ", "");
          const name = `${update.message.from.first_name}_${update.message.from.last_name}`;
          const conversationId = ["chen_cheng"].includes(name)
            ? `${update.message.from.id}_${name}`
            : `telegram_general_3`;
          const sentMessage = await bot.sendMessage(
            chatId,
            "稍等下，我在思考...",
            {
              reply_to_message_id: update.message.message_id,
            }
          );
          try {
            const { data } = await axios.post(
              `${env.CHATAPI_SINGLE_HOST}message/${conversationId}`,
              {
                message,
              },
              {
                proxy: false,
              }
            );
            console.log(">>>", data.response);
            bot
              .editMessageText(data.response, {
                chat_id: sentMessage.chat.id,
                message_id: sentMessage.message_id,
              })
              .catch((_e) => {
                throw _e;
              });
          } catch (e: any) {
            console.error(e);
            bot
              .editMessageText(`Failed: ${e.message}`, {
                chat_id: sentMessage.chat.id,
                message_id: sentMessage.message_id,
              })
              .catch((_e) => {
                throw _e;
              });
          }
        }
      } else {
        bot
          .sendMessage(chatId, "Sorry, specified group chat only.")
          .catch((_e) => {});
      }
    } else {
      console.log(update);
    }
  } catch (e: any) {
    console.error("<<<", e.message);
  } finally {
  }
});

app.listen(9001, () => {
  console.log("Server is running on port 9001");
});
