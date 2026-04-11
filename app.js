// =========================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =========================
let lang = "ru";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

let selectedSize = null;
let selectedColor = null;
let currentProduct = null;
let currentImageIndex = 0;
let isCheckoutRequestInFlight = false;

const SHOP_HOME_PATH = "/rbc-store/";

// =========================
// ПЕРЕВОДЫ И ТОВАРЫ
// =========================
const translations = {
  ru: {
    shop: "Магазин",
    cart: "Корзина",
    hero: "СОЗДАН ДЛЯ СИЛЬНЫХ",
    buy: "Купить"
  },
  en: {
    shop: "Shop",
    cart: "Cart",
    hero: "BUILT FOR THE STRONG",
    buy: "SHOP NOW"
  }
};

const products = [
  {
    id: 1,
    name: "Футболка RBC",
    price: 2490,
    image: "https://images.pexels.com/photos/5325589/pexels-photo-5325589.jpeg?auto=compress&cs=tinysrgb&w=800",
    hoverImg: "https://images.pexels.com/photos/5325589/pexels-photo-5325589.jpeg?auto=compress&cs=tinysrgb&w=800",
    images: [
      "https://images.pexels.com/photos/5325589/pexels-photo-5325589.jpeg",
      "https://images.pexels.com/photos/5325589/pexels-photo-5325589.jpeg"
    ]
  },
  {
    id: 2,
    name: "Худи RBC",
    price: 4990,
    image: "https://images.pexels.com/photos/6311603/pexels-photo-6311603.jpeg?auto=compress&cs=tinysrgb&w=800",
    hoverImg: "https://images.pexels.com/photos/6311675/pexels-photo-6311675.jpeg?auto=compress&cs=tinysrgb&w=800",
    images: [
      "https://images.pexels.com/photos/6311603/pexels-photo-6311603.jpeg",
      "https://images.pexels.com/photos/6311675/pexels-photo-6311675.jpeg"
    ]
  },
  {
    id: 3,
    name: "Шорты RBC",
    price: 1990,
    image: "https://images.pexels.com/photos/936075/pexels-photo-936075.jpeg?auto=compress&cs=tinysrgb&w=800",
    hoverImg: "https://images.pexels.com/photos/6311675/pexels-photo-6311675.jpeg?auto=compress&cs=tinysrgb&w=800",
    images: [
      "https://images.pexels.com/photos/936075/pexels-photo-936075.jpeg",
      "https://images.pexels.com/photos/6311675/pexels-photo-6311675.jpeg"
    ]
  }
];

// =========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================
function persistCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function persistFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function showToast(text) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.innerText = text;
  toast.classList.add("show");

  clearTimeout(showToast.timerId);
  showToast.timerId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

function cleanCheckoutQueryParams() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

// =========================
// SUCCESS / CANCEL (ОДНО МЕСТО)
// =========================
function renderCheckoutStatusPage(status) {
  const config = {
    success: {
      icon: "✅",
      title: "Спасибо за покупку!",
      paragraphs: [
        "Оплата прошла успешно.",
        "Мы уже получили ваш заказ и скоро свяжемся с вами."
      ],
      clearCart: true
    },
    cancel: {
      icon: "❌",
      title: "Оплата отменена",
      paragraphs: ["Вы можете вернуться в магазин и попробовать снова."],
      clearCart: false
    }
  }[status];

  if (!config) return false;

  if (config.clearCart) {
    localStorage.removeItem("cart");
    cart = [];
  }
  const checkoutScreen = document.getElementById("checkout-status-screen");
  const appContent = document.getElementById("app-content");
  const iconEl = document.getElementById("checkout-status-icon");
  const titleEl = document.getElementById("checkout-status-title");
  const messageEl = document.getElementById("checkout-status-message");
  const homeBtn = document.getElementById("checkout-status-home-btn");

  if (!checkoutScreen || !appContent || !iconEl || !titleEl || !messageEl || !homeBtn) {
    return false;
  }

  iconEl.innerText = config.icon;
  titleEl.innerText = config.title;
  messageEl.replaceChildren();

  config.paragraphs.forEach((text) => {
    const paragraph = document.createElement("p");
    paragraph.innerText = text;
    messageEl.appendChild(paragraph);
  });

  homeBtn.onclick = () => {
    window.location.href = SHOP_HOME_PATH;
  };

  appContent.hidden = true;
  checkoutScreen.hidden = false;
  cleanCheckoutQueryParams();
  return true;
}

function handleCheckoutStatusFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("success") ? "success" : urlParams.get("cancel") ? "cancel" : null;
  return renderCheckoutStatusPage(status);
}

function resetCheckoutButton(btn) {
  if (!btn) return;

  btn.disabled = false;
  btn.innerText = "Оформить заказ";
  isCheckoutRequestInFlight = false;
}

function startCheckoutButtonLoading(btn) {
  if (!btn) return;

  isCheckoutRequestInFlight = true;
  btn.disabled = true;
  btn.innerText = "Переход к оплате...";
}

// =========================
// ЯЗЫК И ТОВАРЫ
// =========================
function setLang(selectedLang) {
  lang = selectedLang;
  updateText();
  renderProducts();
}

function updateText() {
  const shop = document.querySelector(".nav-shop");
  const hero = document.querySelector(".hero-text");
  const buyBtn = document.querySelector(".buy-btn");
  const cartLabel = document.querySelector(".cart-text");

  if (shop) shop.innerText = translations[lang].shop;
  if (hero) hero.innerText = translations[lang].hero;
  if (buyBtn) buyBtn.innerText = translations[lang].buy;
  if (cartLabel) cartLabel.innerText = translations[lang].cart;
}

function renderProducts() {
  const container = document.getElementById("products");
  if (!container) return;

  container.innerHTML = "";

  products.forEach((product) => {
    container.innerHTML += `
      <div class="product-card">
        <div class="image-wrapper" onclick="openModal(${product.id})">
          <img src="${product.image}" class="main-img">
          <img src="${product.hoverImg}" class="hover-img">
        </div>

        <div class="like-btn ${favorites.includes(product.name) ? "active" : ""}">❤</div>

        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="price">${product.price} ₽</p>
        </div>

        <button class="view-btn" onclick="event.stopPropagation(); openModal(${product.id})">
          СМОТРЕТЬ
        </button>
      </div>
    `;
  });
}

// =========================
// МОДАЛКА ТОВАРА
// =========================
function openModal(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  currentProduct = product;
  currentImageIndex = 0;
  selectedSize = null;
  selectedColor = null;

  document.querySelectorAll(".sizes button").forEach((button) => button.classList.remove("active"));
  document.querySelectorAll(".color").forEach((button) => button.classList.remove("active"));

  const modalTitle = document.getElementById("modal-title");
  const modalPrice = document.getElementById("modal-price");
  const modalImg = document.getElementById("modal-img");
  const modal = document.getElementById("modal");
  const modalBuyBtn = document.getElementById("modal-buy");

  if (modalTitle) modalTitle.innerText = product.name;
  if (modalPrice) modalPrice.innerText = `${product.price} ₽`;
  if (modalImg) modalImg.src = product.images[0];
  if (modal) modal.style.display = "flex";
  if (modalBuyBtn) modalBuyBtn.disabled = true;
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

function updateModal() {
  const modalImg = document.getElementById("modal-img");
  if (!modalImg || !currentProduct) return;
  modalImg.src = currentProduct.images[currentImageIndex];
}

function checkSelection() {
  const modalBuyBtn = document.getElementById("modal-buy");
  if (!modalBuyBtn) return;
  modalBuyBtn.disabled = !(selectedSize && selectedColor);
}

// =========================
// КОРЗИНА
// =========================
function addToCart(id, size, color) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const existing = cart.find(
    (item) => item.id === id && item.size === size && item.color === color
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      ...product,
      size,
      color,
      qty: 1
    });
  }

  persistCart();
  updateCartCount();
  showToast("Добавлено в корзину");
}

function updateCartCount() {
  const countEl = document.getElementById("cart-count");
  if (!countEl) return;

  if (cart.length === 0) {
    countEl.style.display = "none";
  } else {
    countEl.style.display = "inline-block";
    countEl.textContent = cart.length;
  }

  countEl.classList.remove("animate");
  void countEl.offsetWidth;
  countEl.classList.add("animate");
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (!container || !totalEl) return;

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        Корзина пуста
      </div>
    `;
    totalEl.innerText = "Итого: 0 ₽";
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.qty;

    const div = document.createElement("div");
    div.classList.add("cart-item");

    div.innerHTML = `
      <div>
        <p>${item.name}</p>
        <small>${item.size} / ${item.color}</small>
      </div>

      <div>
        <p>${item.price} ₽ × ${item.qty}</p>
        <div class="qty-controls">
          <button onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${index}, 1)">+</button>
        </div>
        <button onclick="removeFromCart(${index})">✕</button>
      </div>
    `;

    container.appendChild(div);
  });

  totalEl.innerText = `Итого: ${total} ₽`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  persistCart();
  updateCartCount();
  renderCart();
}

function changeQty(index, delta) {
  if (!cart[index]) return;

  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  persistCart();
  updateCartCount();
  renderCart();
}

function clearCart() {
  cart = [];
  persistCart();
  updateCartCount();
  renderCart();
}

function closeCart() {
  const cartEl = document.getElementById("cart");
  const overlay = document.getElementById("overlay");

  if (cartEl) cartEl.classList.remove("active");
  if (overlay) overlay.classList.remove("active");

  document.body.classList.remove("no-scroll");
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

// =========================
// ОФОРМЛЕНИЕ ЗАКАЗА (STRIPE)
// =========================
function handleCheckout() {
  const btn = document.querySelector(".checkout-btn");
  if (!btn || btn.disabled || isCheckoutRequestInFlight) return;

  startCheckoutButtonLoading(btn);

  if (!Array.isArray(cart) || cart.length === 0) {
    showToast("Корзина пуста");
    resetCheckoutButton(btn);
    return;
  }

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const addressInput = document.getElementById("customer-address");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const address = addressInput ? addressInput.value.trim() : "";

  if (!name || !phone || !address) {
    showToast("Заполните все поля");
    resetCheckoutButton(btn);
    return;
  }

  fetch("https://rbc-store.onrender.com/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cart,
      name,
      phone,
      address
    })
  })
    .then(async (res) => {
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error("Checkout request failed");
      }

      return data;
    })
    .then((data) => {
      if (!data || typeof data.url !== "string" || !data.url) {
        throw new Error("Invalid checkout response");
      }
      window.location.href = data.url;
    })
    .catch(() => {
      showToast("Ошибка оплаты 😢");
      resetCheckoutButton(btn);
    });
}

// =========================
// ОБРАБОТЧИКИ СОБЫТИЙ UI
// =========================
function handleDocumentClick(e) {
  const sizeBtn = e.target.closest(".sizes button");
  if (sizeBtn) {
    selectedSize = sizeBtn.innerText;
    document.querySelectorAll(".sizes button").forEach((button) => button.classList.remove("active"));
    sizeBtn.classList.add("active");
    checkSelection();
  }

  const colorBtn = e.target.closest(".color");
  if (colorBtn) {
    selectedColor = Array.from(colorBtn.classList).find(
      (className) => className !== "color" && className !== "active"
    ) || null;
    document.querySelectorAll(".color").forEach((button) => button.classList.remove("active"));
    colorBtn.classList.add("active");
    checkSelection();
  }

  if (e.target.classList.contains("like-btn")) {
    const card = e.target.closest(".product-card");
    if (!card) return;

    const title = card.querySelector("h3");
    const name = title ? title.innerText : "";
    if (!name) return;

    if (favorites.includes(name)) {
      favorites = favorites.filter((favorite) => favorite !== name);
      e.target.classList.remove("active");
    } else {
      favorites.push(name);
      e.target.classList.add("active");
    }

    persistFavorites();
  }
}

document.addEventListener("click", handleDocumentClick);

const modalBuyBtn = document.getElementById("modal-buy");
if (modalBuyBtn) {
  modalBuyBtn.addEventListener("click", () => {
    if (!currentProduct) return;

    if (!selectedSize || !selectedColor) {
      showToast("Выбери размер и цвет");
      return;
    }

    addToCart(currentProduct.id, selectedSize, selectedColor);
    renderCart();
    closeModal();
  });
}

const closeModalBtn = document.querySelector(".close");
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeModal);
}

const cartEl = document.getElementById("cart");
const overlay = document.getElementById("overlay");
const cartBtn = document.querySelector(".nav-cart");
const closeCartBtn = document.getElementById("close-cart");

if (cartBtn && cartEl && overlay) {
  cartBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    closeModal();
    cartEl.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("no-scroll");
    renderCart();
  });
}

if (cartEl) {
  cartEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (overlay) overlay.addEventListener("click", closeCart);
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    closeModal();
  }
});

const prevBtn = document.getElementById("prev");
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (!currentProduct) return;
    currentImageIndex -= 1;
    if (currentImageIndex < 0) currentImageIndex = currentProduct.images.length - 1;
    updateModal();
  });
}

const nextBtn = document.getElementById("next");
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (!currentProduct) return;
    currentImageIndex += 1;
    if (currentImageIndex >= currentProduct.images.length) currentImageIndex = 0;
    updateModal();
  });
}

const clearCartBtn = document.getElementById("clear-cart");
if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);

const checkoutBtn = document.querySelector(".checkout-btn");
if (checkoutBtn) checkoutBtn.addEventListener("click", handleCheckout);

const buyBtn = document.querySelector(".buy-btn");
if (buyBtn) {
  buyBtn.addEventListener("click", () => {
    const productsBlock = document.getElementById("products");
    if (!productsBlock) return;
    productsBlock.scrollIntoView({ behavior: "smooth" });
  });
}

const burger = document.querySelector(".burger");
const nav = document.querySelector("nav");
if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}

// =========================
// СТАРТ ПРИЛОЖЕНИЯ
// =========================
const isCheckoutStatusRendered = handleCheckoutStatusFromUrl();
if (!isCheckoutStatusRendered) {
  updateText();
  renderProducts();
  updateCartCount();
  renderCart();
}
