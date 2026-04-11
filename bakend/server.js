import fs from "fs";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import Stripe from "stripe";

const app = express();
const FRONTEND_BASE_URL = "https://sergo1979sergo21-gif.github.io/rbc-store/";

app.use(cors());

// 🔥 ВАЖНО: webhook должен быть ДО json
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* =========================
   💳 СОЗДАНИЕ СЕССИИ ОПЛАТЫ
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

      success_url: `${FRONTEND_BASE_URL}?success=true`,
      cancel_url: `${FRONTEND_BASE_URL}?cancel=true`,

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
   💳 WEBHOOK (ПОСЛЕ ОПЛАТЫ)
========================= */
app.post("/webhook", (req, res) => {

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("❌ Webhook error:", err.message);
    return res.sendStatus(400);
  }

  if (event.type === "checkout.session.completed") {

    const session = event.data.object;

    const name = session.metadata.name;
    const phone = session.metadata.phone;
    const address = session.metadata.address;
    const cart = JSON.parse(session.metadata.cart);

    let total = 0;
    let text = `✅ ОПЛАЧЕННЫЙ ЗАКАЗ\n\n`;

    text += `👤 ${name}\n📞 ${phone}\n📍 ${address}\n\n`;

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
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: process.env.CHAT_ID,
        text: text
      })
    });

    console.log("✅ Оплата прошла, заказ сохранён");
  }

  res.sendStatus(200);
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
   ✅ SUCCESS (с возвратом)
========================= */
app.get("/success", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="3;url=/" />
        <style>
          body {
            font-family: Arial;
            text-align: center;
            padding-top: 100px;
          }
        </style>
      </head>
      <body>
        <h2>✅ Оплата прошла успешно</h2>
        <p>Возвращаем вас в магазин...</p>
      </body>
    </html>
  `);
});

/* =========================
   ❌ ОТМЕНА
========================= */
app.get("/cancel", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="3;url=/" />
      </head>
      <body style="text-align:center; padding-top:100px;">
        <h2>❌ Оплата отменена</h2>
        <p>Вы возвращаетесь в магазин...</p>
      </body>
    </html>
  `);
});

/* =========================
   🚀 ПРОВЕРКА
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