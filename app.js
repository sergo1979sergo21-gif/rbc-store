
let lang = "ru";

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let selectedSize = null;
let selectedColor = null;
let currentProduct = null;

let currentImageIndex = 0;

// 👉 ВЫБОР РАЗМЕРА И ЦВЕТА (ОДИН обработчик)
document.addEventListener("click", (e) => {

  // 👉 размер
  if (e.target.closest(".sizes button")) {
    const btn = e.target;

    selectedSize = btn.innerText;

    document.querySelectorAll(".sizes button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    console.log("Размер:", selectedSize);
    checkSelection();
  }

  // 👉 цвет
  if (e.target.closest(".color")) {
    const btn = e.target;

    selectedColor = btn.classList[1];

    document.querySelectorAll(".color").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    console.log("Цвет:", selectedColor);
    checkSelection();
  }

});

// 👉 ПЕРЕВОДЫ
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

// 👉 ТОВАРЫ
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

// 👉 ЯЗЫК
function setLang(selectedLang) {
  lang = selectedLang;
  updateText();
  renderProducts();
}

function updateText() {
  const shop = document.querySelector(".nav-shop");
  const hero = document.querySelector(".hero-text");
  const btn = document.querySelector(".buy-btn");
  const cartLabel = document.querySelector(".cart-text");

  if (shop) shop.innerText = translations[lang].shop;
  if (hero) hero.innerText = translations[lang].hero;
  if (btn) btn.innerText = translations[lang].buy;
  if (cartLabel) cartLabel.innerText = translations[lang].cart;
}

// 👉 РЕНДЕР ТОВАРОВ
function renderProducts() {
  const container = document.getElementById("products");
  container.innerHTML = "";

  products.forEach(product => {
    container.innerHTML += `
      <div class="product-card">

        <div class="image-wrapper" onclick="openModal(${product.id})">
          <img src="${product.image}" class="main-img">
          <img src="${product.hoverImg}" class="hover-img">
        </div>

        <div class="like-btn ${favorites.includes(product.name) ? 'active' : ''}">❤</div>

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

// 👉 МОДАЛКА
function openModal(productId) {

  // ❗ закрываем корзину если открыта


  const product = products.find(p => p.id === productId);

  currentProduct = product;
  currentImageIndex = 0;

  selectedSize = null;
  selectedColor = null;

  document.querySelectorAll(".sizes button").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".color").forEach(b => b.classList.remove("active"));

  document.getElementById("modal-title").innerText = product.name;
  document.getElementById("modal-price").innerText = product.price + " ₽";
  document.getElementById("modal-img").src = product.images[0];

  document.getElementById("modal").style.display = "flex";
  document.getElementById("modal-buy").disabled = true;
}

// 👉 ОБНОВЛЕНИЕ КАРТИНКИ
function updateModal() {
  const img = document.getElementById("modal-img");

  img.src = currentProduct.images[currentImageIndex];
}

// 👉 ДОБАВЛЕНИЕ В КОРЗИНУ
function addToCart(id, size, color) {
  const product = products.find(p => p.id === id);

  // 👉 ищем такой же товар
  const existing = cart.find(item =>
    item.id === id &&
    item.size === size &&
    item.color === color
  );

  if (existing) {
    existing.qty += 1; // увеличиваем количество
  } else {
    cart.push({
      ...product,
      size,
      color,
      qty: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  showToast("Добавлено в корзину");
}

function checkSelection() {
  const btn = document.getElementById("modal-buy");

  if (selectedSize && selectedColor) {
    btn.disabled = false;
  } else {
    btn.disabled = true;
  }
}

// 👉 СЧЕТЧИК
function updateCartCount() {
  const countEl = document.getElementById("cart-count");

  if (cart.length === 0) {
    countEl.style.display = "none";
  } else {
    countEl.style.display = "inline-block";
    countEl.textContent = cart.length;
  }

  // анимация
  countEl.classList.remove("animate");
  void countEl.offsetWidth;
  countEl.classList.add("animate");
}

// 👉 КНОПКА "В КОРЗИНУ"
document.getElementById("modal-buy").addEventListener("click", () => {

  if (!currentProduct) return;

  if (!selectedSize || !selectedColor) {
    alert("Выбери размер и цвет");
    return;
  }

  addToCart(currentProduct.id, selectedSize, selectedColor);

   renderCart();

  document.getElementById("modal").style.display = "none";
});

// 👉 ЗАКРЫТИЕ МОДАЛКИ
document.querySelector(".close").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

// 👉 ЛАЙК
document.addEventListener("click", function(e) {
  if (e.target.classList.contains("like-btn")) {
    e.target.classList.toggle("active");
  }
});


// рендер корзины
function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (!container || !totalEl) return;

  container.innerHTML = "";

  // ✅ ЕСЛИ КОРЗИНА ПУСТА
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

  totalEl.innerText = "Итого: " + total + " ₽";
}

function removeFromCart(index) {
  cart.splice(index, 1);

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount();
  renderCart();
}

const cartEl = document.getElementById("cart");
const overlay = document.getElementById("overlay");
const cartBtn = document.querySelector(".nav-cart");
const closeCartBtn = document.getElementById("close-cart");

// ОТКРЫТИЕ
cartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation(); 

   // 🔥 закрываем модалку
  document.getElementById("modal").style.display = "none";

  cartEl.classList.add("active");
  overlay.classList.add("active");

  document.body.classList.add("no-scroll"); // 🔥 ВОТ ЭТО

  renderCart();
});

cartEl.addEventListener("click", (e) => {
  e.stopPropagation();
});

// ЗАКРЫТИЕ
function closeCart() {
  cartEl.classList.remove("active");
  overlay.classList.remove("active");

  document.body.classList.remove("no-scroll"); // 🔥 ВОТ ЭТО
   document.activeElement.blur();
}

overlay.addEventListener("click", closeCart);
closeCartBtn.addEventListener("click", closeCart);

// 👉 Закрытие корзины по ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    document.getElementById("modal").style.display = "none";
  }
});

// 👉 Подключаем стрелки
document.getElementById("prev").addEventListener("click", () => {
  if (!currentProduct) return;

  currentImageIndex--;

  if (currentImageIndex < 0) {
    currentImageIndex = currentProduct.images.length - 1;
  }

  updateModal();
});

document.getElementById("next").addEventListener("click", () => {
  if (!currentProduct) return;

  currentImageIndex++;

  if (currentImageIndex >= currentProduct.images.length) {
    currentImageIndex = 0;
  }

  updateModal();
});

// 👉 отчистка корзины
document.getElementById("clear-cart").addEventListener("click", () => {
  cart = [];
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  renderCart();
});

// ✅ ОФОРМЛЕНИЕ ЗАКАЗА
document.querySelector(".checkout-btn").addEventListener("click", () => {

  const btn = document.querySelector(".checkout-btn");

  if (btn.disabled) return; // 🔥 защита от спама

  btn.disabled = true;
  btn.innerText = "Отправка..."; // 🔥 loading

  // 👉 корзина пустая
  if (cart.length === 0) {
    alert("Корзина пуста");
    btn.disabled = false;
    btn.innerText = "Оформить заказ";
    return;
  }

  // 👉 данные
  const name = document.getElementById("customer-name").value;
  const phone = document.getElementById("customer-phone").value;
  const address = document.getElementById("customer-address").value;

  // 👉 проверка
  if (!name || !phone || !address) {
    alert("Заполните все поля");
    btn.disabled = false;
    btn.innerText = "Оформить заказ";
    return;
  }

  // 🔥 ID заказа
  const orderId = Date.now();

  let text = `📦 Заказ №${orderId}\n\n`;
  text += `👤 Имя: ${name}\n`;
  text += `📞 Телефон: ${phone}\n`;
  text += `📍 Адрес: ${address}\n\n`;

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

  // 🔥 отправка
  fetch("https://rbc-store.onrender.com/order", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name,
    phone,
    address,
    cart
  })
})
  .then(() => {

    document.getElementById("success-modal").style.display = "flex";

    // очистка
    cart = [];
    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();
    renderCart();

    // очистка полей
    document.getElementById("customer-name").value = "";
    document.getElementById("customer-phone").value = "";
    document.getElementById("customer-address").value = "";

    btn.disabled = false;
    btn.innerText = "Оформить заказ";

    closeCart();
    window.scrollTo({ top: 0, behavior: "smooth" });

  })
  .catch(() => {
    alert("Ошибка отправки 😢");
    btn.disabled = false;
    btn.innerText = "Оформить заказ";
  });

});

//УВЕДОМЛЕНИЕ "ДОБАВЛЕНО В КОРЗИНУ"
function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = text;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

//КНОПКА "КУПИТЬ" В HERO
document.querySelector(".buy-btn").addEventListener("click", () => {
  document.getElementById("products").scrollIntoView({
    behavior: "smooth"
  });
});

//отправка заказа в Telegram
const TELEGRAM_TOKEN = "8633471473:AAHBKp17NO60xf4XKk8HVSbWEpe0yEDfd4E";
const CHAT_ID = "8410151779";

// функция отправки
function sendOrderToTelegram(text) {
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text
    })
  })
  .then(res => res.json())
  .then(data => console.log("Отправлено:", data))
  .catch(err => console.error("Ошибка:", err));
}

//ФУНКЦИЯ ЗАКРЫТИЯ
function closeSuccess() {
  document.getElementById("success-modal").style.display = "none";
}

//ФУНКЦИЯ + - товары в корзине
function changeQty(index, delta) {
  cart[index].qty += delta;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount();
  renderCart();
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.innerText = text;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

document.addEventListener("click", function(e) {
  if (e.target.classList.contains("like-btn")) {

    const card = e.target.closest(".product-card");
    const name = card.querySelector("h3").innerText;

    if (favorites.includes(name)) {
      favorites = favorites.filter(f => f !== name);
      e.target.classList.remove("active");
    } else {
      favorites.push(name);
      e.target.classList.add("active");
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
  }
});

const burger = document.querySelector(".burger");
const nav = document.querySelector("nav");

burger.addEventListener("click", () => {
  nav.classList.toggle("active");
});

// 👉 СТАРТ
updateText();
renderProducts();
updateCartCount();
renderCart(); // 🔥 ВАЖНО
