import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// 👉 маршрут заказа
app.post("/order", async (req, res) => {

  const { name, phone, address, cart } = req.body;

  let text = `📦 Новый заказ\n\n`;
  text += `👤 ${name}\n📞 ${phone}\n📍 ${address}\n\n`;

  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;

    text += `${item.name}\n`;
    text += `Размер: ${item.size}\n`;
    text += `Цвет: ${item.color}\n`;
    text += `Кол-во: ${item.qty}\n`;
    text += `Цена: ${item.price * item.qty} ₽\n\n`;
  });

  text += `💰 ИТОГО: ${total} ₽`;

  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: text
      })
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }

});

// 👉 ВОТ ТУТ ДОЛЖЕН БЫТЬ сервер
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started");
});