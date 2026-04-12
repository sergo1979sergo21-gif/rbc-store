import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import Stripe from "stripe";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_BASE_URL =
  (process.env.FRONTEND_BASE_URL || "https://sergo1979sergo21-gif.github.io/rbc-store/")
    .replace(/\/+$/, "");
const ORDERS_FILE_PATH = path.join(__dirname, "orders.json");

app.use(cors());

// webhook обрабатываем raw-телом только на /webhook.
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function readOrders() {
  try {
    const data = fs.readFileSync(ORDERS_FILE_PATH, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(orders, null, 2));
}

function calculateOrderTotal(cart) {
  return cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return sum + price * qty;
  }, 0);
}

function buildTelegramMessage(order) {
  let text = `✅ ОПЛАЧЕННЫЙ ЗАКАЗ\n\n`;
  text += `🆔 ${order.orderId}\n`;
  text += `💳 Stripe Session: ${order.stripeSessionId}\n\n`;
  text += `👤 ${order.name}\n📞 ${order.phone}\n📍 ${order.address}\n\n`;

  order.cart.forEach((item) => {
    text += `${item.name}\n`;
    text += `Размер: ${item.size}\n`;
    text += `Цвет: ${item.color}\n`;
    text += `Кол-во: ${item.qty}\n`;
    text += `Цена: ${item.price * item.qty} ₽\n\n`;
  });

  text += `💰 ИТОГО: ${order.total} ₽`;
  return text;
}

async function sendOrderToTelegram(text) {
  if (!process.env.TELEGRAM_TOKEN || !process.env.CHAT_ID) {
    console.warn("⚠️ Telegram env vars missing, skip notification");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          text
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("❌ Telegram API error:", body);
    }
  } catch (error) {
    console.error("❌ Telegram request failed:", error.message);
  }
}

/* =========================
   💳 СОЗДАНИЕ СЕССИИ ОПЛАТЫ
========================= */
app.post("/create-checkout-session", async (req, res) => {
  const { cart, name, phone, address } = req.body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedAddress = typeof address === "string" ? address.trim() : "";

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  if (!normalizedName || !normalizedPhone || !normalizedAddress) {
    return res.status(400).json({ error: "Missing customer fields" });
  }

  const hasInvalidItems = cart.some((item) => {
    const hasName = item && typeof item.name === "string" && item.name.trim().length > 0;
    const hasValidPrice = Number.isFinite(Number(item?.price)) && Number(item.price) > 0;
    const hasValidQty = Number.isInteger(Number(item?.qty)) && Number(item.qty) > 0;
    return !hasName || !hasValidPrice || !hasValidQty;
  });

  if (hasInvalidItems) {
    return res.status(400).json({ error: "Invalid cart items" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: cart.map((item) => ({
        price_data: {
          currency: "rub",
          product_data: {
            name: item.name
          },
          unit_amount: Math.round(Number(item.price) * 100)
        },
        quantity: Number(item.qty)
      })),
      success_url: `${FRONTEND_BASE_URL}/?success=true`,
      cancel_url: `${FRONTEND_BASE_URL}/?cancel=true`,
      metadata: {
        name: normalizedName,
        phone: normalizedPhone,
        address: normalizedAddress,
        cart: JSON.stringify(cart)
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    const stripeFields =
      error && typeof error === "object"
        ? {
            type: error.type,
            code: error.code,
            message: error.message,
            decline_code: error.decline_code,
            param: error.param,
            detail: error.raw && error.raw.message ? error.raw.message : undefined
          }
        : {};
    console.error("❌ Stripe session create error:", error && error.message, JSON.stringify(stripeFields));
    return res.status(500).json({ error: "Stripe error" });
  }
});

/* =========================
   💳 WEBHOOK (ПОСЛЕ ОПЛАТЫ)
========================= */
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("❌ Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    return res.sendStatus(400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error("❌ Webhook signature error:", error.message);
    return res.sendStatus(400);
  }

  if (event.type !== "checkout.session.completed") {
    return res.sendStatus(200);
  }

  const session = event.data.object;
  const metadata = session.metadata || {};
  const stripeSessionId = typeof session.id === "string" ? session.id : null;
  const stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent &&
          typeof session.payment_intent === "object" &&
          typeof session.payment_intent.id === "string")
        ? session.payment_intent.id
        : null;

  if (!stripeSessionId) {
    console.error("❌ Missing Stripe session.id in webhook event");
    return res.sendStatus(400);
  }

  let cart = [];
  try {
    const parsedCart = JSON.parse(metadata.cart || "[]");
    cart = Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    console.error("❌ Invalid cart JSON in metadata");
    return res.sendStatus(400);
  }

  const orders = readOrders();
  const alreadySaved = orders.some((order) => {
    const sameSessionId = order.stripeSessionId && order.stripeSessionId === stripeSessionId;
    const samePaymentIntentId =
      stripePaymentIntentId &&
      order.stripePaymentIntentId &&
      order.stripePaymentIntentId === stripePaymentIntentId;
    return sameSessionId || samePaymentIntentId;
  });

  if (alreadySaved) {
    console.log(
      `ℹ️ Duplicate webhook ignored for session=${stripeSessionId}, payment_intent=${
        stripePaymentIntentId || "null"
      }`
    );
    return res.sendStatus(200);
  }

  const timestamp = Date.now();
  const newOrder = {
    id: timestamp,
    orderId: `RBC-${timestamp}`,
    status: "paid",
    stripeSessionId,
    stripePaymentIntentId,
    name: metadata.name || "",
    phone: metadata.phone || "",
    address: metadata.address || "",
    cart,
    total: calculateOrderTotal(cart),
    date: new Date().toLocaleString()
  };

  try {
    orders.push(newOrder);
    writeOrders(orders);
  } catch (error) {
    console.error("❌ Failed to persist order:", error.message);
    return res.sendStatus(500);
  }

  await sendOrderToTelegram(buildTelegramMessage(newOrder));
  console.log(`✅ Paid order saved: ${newOrder.orderId}`);
  return res.sendStatus(200);
});

/* =========================
   📊 ПОЛУЧЕНИЕ ЗАКАЗОВ
========================= */
app.get("/orders", (req, res) => {
  return res.json(readOrders());
});

/* =========================
   🚀 ПРОВЕРКА
========================= */
app.get("/", (req, res) => {
  return res.send("SERVER WORKS 🚀");
});

/* =========================
   🚀 ЗАПУСК
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});