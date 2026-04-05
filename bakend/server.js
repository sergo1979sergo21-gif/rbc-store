import fs from "fs";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import Stripe from "stripe";

const app = express();

app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* =========================
   📦 СОЗДАНИЕ ЗАКАЗА
========================= */
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

  // 💾 сохраняем заказ
  const newOrder = {
    id: Date.now(),
    name,
    phone,
    address,
    cart,
    total,
    date: new Date().toLocaleString()
  };

  let orders = [];

  try {
    const data = fs.readFileSync("orders.json", "utf8");
    orders = JSON.parse(data);
  } catch {}

  orders.push(newOrder);

  fs.writeFileSync("orders.json", JSON.stringify(orders, null, 2));

  // 📩 Telegram
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

/* =========================
   💳 STRIPE ОПЛАТА
========================= */
app.post("/create-checkout-session", async (req, res) => {

  const { cart, name, phone, address } = req.body;

  try {

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: cart.map(item => ({
        price_data: {
          currency: "rub",
          product_data: {
            name: item.name
          },
          unit_amount: item.price * 100
        },
        quantity: item.qty
      })),

      success_url: "https://rbc-store.onrender.com/success",
      cancel_url: "https://rbc-store.onrender.com/cancel",

      metadata: {
        name,
        phone,
        address,
        cart: JSON.stringify(cart)
      }

    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stripe error" });
  }

});

/* =========================
   📊 ПОЛУЧЕНИЕ ЗАКАЗОВ
========================= */
app.get("/orders", (req, res) => {
  try {
    const data = fs.readFileSync("orders.json", "utf8");
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

/* =========================
   ✅ СТРАНИЦЫ ПОСЛЕ ОПЛАТЫ
========================= */
app.get("/success", (req, res) => {
  res.send("Оплата прошла успешно ✅");
});

app.get("/cancel", (req, res) => {
  res.send("Оплата отменена ❌");
});

/* =========================
   🔥 ПРОВЕРКА СЕРВЕРА
========================= */
app.get("/", (req, res) => {
  res.send("SERVER WORKS 🚀");
});

/* =========================
   🚀 ЗАПУСК
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server started");
});