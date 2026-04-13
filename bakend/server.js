import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { fileURLToPath } from "url";
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_BASE_URL =
  (process.env.FRONTEND_BASE_URL || "https://sergo1979sergo21-gif.github.io/rbc-store/")
    .replace(/\/+$/, "");
const ORDERS_FILE_PATH = path.join(__dirname, "orders.json");

/** ЮKassa: до 16 ключей, значение до 512 символов */
const YOOKASSA_METADATA_VALUE_MAX = 512;
const YOOKASSA_METADATA_CUSTOMER_KEYS = 4;
const YOOKASSA_MAX_CART_METADATA_KEYS = 16 - YOOKASSA_METADATA_CUSTOMER_KEYS;

const YOOKASSA_API = "https://api.yookassa.ru/v3";

app.use(cors());
app.use(express.json());

const yookassaShopId = process.env.YOOKASSA_SHOP_ID;
const yookassaSecretKey = process.env.YOOKASSA_SECRET_KEY;
const yookassaConfigured = Boolean(yookassaShopId && yookassaSecretKey);

if (!yookassaConfigured) {
  console.error(
    "[checkout] CRITICAL: YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY missing — /create-checkout-session will return 503"
  );
} else {
  console.log("[checkout] YooKassa: shop_id set, secret_key set (length=%s)", yookassaSecretKey.length);
}
console.log("[checkout] FRONTEND_BASE_URL=%s", FRONTEND_BASE_URL);
console.log("[checkout] return_url (success)=%s", `${FRONTEND_BASE_URL}/?success=true`);
console.log(
  "[checkout] note: YooKassa redirect uses single return_url; cancel UX is not a separate URL (unlike Stripe)"
);

function yooBasicAuthHeader() {
  const raw = `${yookassaShopId}:${yookassaSecretKey}`;
  return Buffer.from(raw, "utf8").toString("base64");
}

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

/** Только поля, нужные для оплаты и заказа (без images/gallery и т.д.). */
function sanitizeCartItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id;
  const name = typeof raw.name === "string" ? raw.name.trim() : String(raw.name ?? "").trim();
  const price = Number(raw.price);
  const qtyRaw = Number(raw.qty);
  const qty =
    Number.isFinite(qtyRaw) && qtyRaw >= 1 && Math.floor(qtyRaw) === qtyRaw ? qtyRaw : null;
  const size = raw.size != null ? String(raw.size).trim() : "";
  const color = raw.color != null ? String(raw.color).trim() : "";
  if (!name || !Number.isFinite(price) || price <= 0 || qty == null) return null;
  return { id, name, price, qty, size, color };
}

function sanitizeCartForCheckout(rawCart) {
  if (!Array.isArray(rawCart)) return [];
  const out = [];
  for (const raw of rawCart) {
    const item = sanitizeCartItem(raw);
    if (item) out.push(item);
  }
  return out;
}

/** Metadata ЮKassa: не больше 512 символов на значение; не больше 12 частей корзины (+4 поля покупателя = 16 ключей). */
function cartMetadataFields(slimCart) {
  const json = JSON.stringify(slimCart);
  if (json.length <= YOOKASSA_METADATA_VALUE_MAX) {
    return { cart: json };
  }
  const chunksNeeded = Math.ceil(json.length / YOOKASSA_METADATA_VALUE_MAX);
  if (chunksNeeded > YOOKASSA_MAX_CART_METADATA_KEYS) {
    return null;
  }
  const fields = {};
  for (let part = 0; part < chunksNeeded; part += 1) {
    const offset = part * YOOKASSA_METADATA_VALUE_MAX;
    fields[`cart_${part}`] = json.slice(offset, offset + YOOKASSA_METADATA_VALUE_MAX);
  }
  return fields;
}

function parseCartFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return [];
  if (typeof metadata.cart === "string" && metadata.cart.length > 0) {
    try {
      const parsed = JSON.parse(metadata.cart);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  const chunks = [];
  for (let i = 0; i < 50; i += 1) {
    const key = `cart_${i}`;
    if (typeof metadata[key] !== "string") break;
    chunks.push(metadata[key]);
  }
  if (chunks.length === 0) return [];
  try {
    const parsed = JSON.parse(chunks.join(""));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildYooKassaMetadata(normalizedName, normalizedPhone, normalizedAddress, normalizedTelegram, slimCart) {
  const cartPart = cartMetadataFields(slimCart);
  if (cartPart === null) {
    return null;
  }
  const meta = {
    name: normalizedName.slice(0, YOOKASSA_METADATA_VALUE_MAX),
    phone: normalizedPhone.slice(0, YOOKASSA_METADATA_VALUE_MAX),
    address: normalizedAddress.slice(0, YOOKASSA_METADATA_VALUE_MAX),
    telegram: normalizedTelegram.slice(0, YOOKASSA_METADATA_VALUE_MAX),
    ...cartPart
  };
  const keys = Object.keys(meta);
  if (keys.length > 16) {
    console.error("[checkout] metadata key overflow:", keys.length);
    return null;
  }
  for (const k of keys) {
    if (typeof meta[k] === "string" && meta[k].length > YOOKASSA_METADATA_VALUE_MAX) {
      meta[k] = meta[k].slice(0, YOOKASSA_METADATA_VALUE_MAX);
    }
  }
  return meta;
}

function formatAmountRub(totalRub) {
  const n = Number(totalRub);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (Math.round(n * 100) / 100).toFixed(2);
}

async function yooCreatePayment(body, idempotenceKey) {
  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${yooBasicAuthHeader()}`,
      "Idempotence-Key": idempotenceKey
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

async function yooGetPayment(paymentId) {
  const res = await fetch(`${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${yooBasicAuthHeader()}`
    }
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

const COLOR_LABELS_RU = {
  black: "Чёрный",
  white: "Белый",
  red: "Красный",
  graphite: "Графит",
  grey: "Серый",
  gray: "Серый",
  blue: "Синий",
  green: "Зелёный"
};

function formatMoneyRub(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return "0 ₽";
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
}

function shortenPaymentId(id) {
  if (!id || typeof id !== "string") return "";
  const maxLen = 24;
  if (id.length <= maxLen) return id;
  return `${id.slice(0, maxLen)}…`;
}

function normalizeTelegramUsernameForDisplay(raw) {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return "";
  return t.startsWith("@") ? t.slice(1) : t;
}

function humanizeColorRu(colorRaw) {
  const trimmed = colorRaw != null ? String(colorRaw).trim() : "";
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  return COLOR_LABELS_RU[key] || trimmed;
}

function buildTelegramMessage(order) {
  const lines = [];

  lines.push("✅ ОПЛАЧЕННЫЙ ЗАКАЗ");
  lines.push("");
  lines.push(`🆔 Заказ: ${order.orderId || "—"}`);
  lines.push("");

  const name = order.name != null ? String(order.name).trim() : "";
  const phone = order.phone != null ? String(order.phone).trim() : "";
  const address = order.address != null ? String(order.address).trim() : "";

  if (name) lines.push(`👤 Имя: ${name}`);
  if (phone) lines.push(`📞 Телефон: ${phone}`);
  if (address) lines.push(`📍 Адрес: ${address}`);

  const tgUser = normalizeTelegramUsernameForDisplay(order.telegram);
  if (tgUser) {
    lines.push("");
    lines.push(`💬 Telegram: @${tgUser}`);
  }

  lines.push("");
  lines.push("🛍 Товары:");

  const cart = Array.isArray(order.cart) ? order.cart : [];
  cart.forEach((item) => {
    const itemName = (item && item.name != null ? String(item.name).trim() : "") || "Товар";
    const sizeRaw = item && item.size != null ? String(item.size).trim() : "";
    const colorLabel = item ? humanizeColorRu(item.color) : "";
    const qty = Number(item && item.qty) || 0;
    const unit = Number(item && item.price) || 0;
    const lineTotal = unit * qty;

    lines.push(`— ${itemName}`);
    if (sizeRaw) lines.push(`  Размер: ${sizeRaw}`);
    if (colorLabel) lines.push(`  Цвет: ${colorLabel}`);
    lines.push(`  Кол-во: ${qty}`);
    lines.push(`  Цена: ${formatMoneyRub(lineTotal)}`);
    lines.push("");
  });

  lines.push(`💰 ИТОГО: ${formatMoneyRub(order.total)}`);

  const payId =
    order.yookassaPaymentId ||
    order.stripeSessionId ||
    order.stripePaymentIntentId ||
    "";
  const payShort = shortenPaymentId(payId);
  if (payShort) {
    lines.push("");
    lines.push(`💳 Платёж: ${payShort}`);
  }

  return lines.join("\n");
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

function orderAlreadyExists(orders, yookassaPaymentId) {
  return orders.some((order) => {
    if (order.yookassaPaymentId && order.yookassaPaymentId === yookassaPaymentId) return true;
    return false;
  });
}

async function persistPaidOrderFromYooPayment(payment) {
  const paymentId = typeof payment.id === "string" ? payment.id : null;
  const status = typeof payment.status === "string" ? payment.status : "";
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : {};

  if (!paymentId) {
    console.error("❌ Missing payment.id");
    return { ok: false, code: 400 };
  }

  if (status !== "succeeded") {
    console.log(`ℹ️ Skip order save: payment ${paymentId} status=${status}`);
    return { ok: true, code: 200 };
  }

  const cart = parseCartFromMetadata(metadata);
  if (!Array.isArray(cart) || cart.length === 0) {
    console.error("❌ Missing or invalid cart in payment metadata (cart / cart_0..)");
    return { ok: true, code: 200 };
  }

  const orders = readOrders();
  if (orderAlreadyExists(orders, paymentId)) {
    console.log(`ℹ️ Duplicate webhook ignored for yookassa payment=${paymentId}`);
    return { ok: true, code: 200 };
  }

  const timestamp = Date.now();
  const newOrder = {
    id: timestamp,
    orderId: `RBC-${timestamp}`,
    status: "paid",
    paymentProvider: "yookassa",
    yookassaPaymentId: paymentId,
    yookassaStatus: status,
    name: metadata.name || "",
    phone: metadata.phone || "",
    address: metadata.address || "",
    telegram: metadata.telegram || "",
    cart,
    total: calculateOrderTotal(cart),
    date: new Date().toLocaleString()
  };

  try {
    orders.push(newOrder);
    writeOrders(orders);
  } catch (error) {
    console.error("❌ Failed to persist order:", error.message);
    return { ok: false, code: 500 };
  }

  await sendOrderToTelegram(buildTelegramMessage(newOrder));
  console.log(`✅ Paid order saved: ${newOrder.orderId}`);
  return { ok: true, code: 200 };
}

/* =========================
   💳 СОЗДАНИЕ ПЛАТЕЖА (ЮKassa)
========================= */
app.post("/create-checkout-session", async (req, res) => {
  console.log("[checkout] incoming body:", JSON.stringify(req.body));

  if (!yookassaConfigured) {
    console.error("[checkout] YooKassa not configured");
    return res.status(503).json({ error: "Payment not configured" });
  }

  const { cart, name, phone, address, telegram } = req.body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedAddress = typeof address === "string" ? address.trim() : "";
  const normalizedTelegram =
    typeof telegram === "string" ? telegram.trim().slice(0, 200) : "";

  const slimCart = sanitizeCartForCheckout(cart);

  if (slimCart.length === 0) {
    console.warn("[checkout] reject: empty or invalid cart after sanitize");
    return res.status(400).json({ error: "Cart is empty" });
  }

  if (!normalizedName || !normalizedPhone || !normalizedAddress) {
    console.warn("[checkout] reject: missing customer fields");
    return res.status(400).json({ error: "Missing customer fields" });
  }

  const totalRub = calculateOrderTotal(slimCart);
  const amountValue = formatAmountRub(totalRub);
  if (!amountValue) {
    console.warn("[checkout] reject: invalid total");
    return res.status(400).json({ error: "Invalid cart total" });
  }

  const metadata = buildYooKassaMetadata(
    normalizedName,
    normalizedPhone,
    normalizedAddress,
    normalizedTelegram,
    slimCart
  );
  if (!metadata) {
    return res.status(400).json({ error: "Cart metadata too large for YooKassa" });
  }

  const returnUrl = `${FRONTEND_BASE_URL}/?success=true`;

  const paymentBody = {
    amount: {
      value: amountValue,
      currency: "RUB"
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: returnUrl
    },
    description: "RBC SHOP order",
    metadata
  };

  const idempotenceKey = crypto.randomUUID();
  console.log("[checkout] YooKassa payments.create amount=%s RUB", amountValue);

  try {
    const { ok, status, data } = await yooCreatePayment(paymentBody, idempotenceKey);

    if (!ok || !data) {
      console.error("[checkout] YooKassa create failed status=%s body=%s", status, JSON.stringify(data));
      return res.status(502).json({ error: "Payment provider error" });
    }

    const confirmationUrl =
      data.confirmation &&
      typeof data.confirmation === "object" &&
      typeof data.confirmation.confirmation_url === "string"
        ? data.confirmation.confirmation_url
        : null;

    if (!confirmationUrl) {
      console.error("[checkout] Missing confirmation_url in response:", JSON.stringify(data));
      return res.status(502).json({ error: "Invalid payment provider response" });
    }

    console.log("[checkout] YooKassa payment created id=%s", data.id);
    return res.json({ url: confirmationUrl });
  } catch (error) {
    console.error("[checkout] YooKassa create exception:", error && error.message);
    if (error && error.stack) console.error("[checkout] stack:", error.stack);
    return res.status(500).json({ error: "Payment error" });
  }
});

/* =========================
   💳 WEBHOOK (ЮKassa HTTP-уведомления)
========================= */
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.sendStatus(400);
  }

  if (body.type !== "notification" || typeof body.event !== "string") {
    return res.sendStatus(200);
  }

  if (body.event !== "payment.succeeded") {
    return res.sendStatus(200);
  }

  const obj = body.object;
  const hintedId = obj && typeof obj.id === "string" ? obj.id : null;
  if (!hintedId) {
    console.error("❌ YooKassa notification: missing object.id");
    return res.sendStatus(200);
  }

  if (!yookassaConfigured) {
    console.error("❌ YooKassa not configured — cannot verify payment");
    return res.sendStatus(500);
  }

  const verified = await yooGetPayment(hintedId);
  if (!verified.ok || !verified.data) {
    console.error("❌ Failed to verify payment via API:", verified.status, verified.text);
    return res.sendStatus(500);
  }

  const payment = verified.data;
  if (payment.status !== "succeeded") {
    console.log(`ℹ️ Verified payment ${hintedId} status=${payment.status} — skip order`);
    return res.sendStatus(200);
  }

  const result = await persistPaidOrderFromYooPayment(payment);
  return res.sendStatus(result.code);
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
