// =========================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// =========================
let lang = "ru";
let cart = readArrayFromLocalStorage("cart");
let favorites = readArrayFromLocalStorage("favorites");

let selectedSize = null;
let selectedColor = null;
let currentProduct = null;
let currentImageIndex = 0;
let isCheckoutRequestInFlight = false;
let showFavoritesOnly = false;

const SHOP_HOME_PATH = "/rbc-store/";

function readArrayFromLocalStorage(key) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// =========================
// ПЕРЕВОДЫ И ТОВАРЫ
// =========================
const translations = {
  ru: {
    shop: "Магазин",
    cart: "Корзина",
    hero: "СОЗДАНО ДЛЯ РЕЗУЛЬТАТА",
    buy: "КАТАЛОГ",
    productsTitle: "Премиальная тренировочная коллекция",
    footerCatalog: "Каталог",
    footerAbout: "О бренде",
    footerDelivery: "Доставка",
    footerContacts: "Контакты",
    emptyFavoritesTitle: "Нет избранных товаров",
    emptyFavoritesSubtitle: "Нажмите на ❤️ чтобы сохранить",
    favoritesFilter: "Только избранное",
    favoritesFilterActive: "Показаны избранные",
    favoriteTooltip: "Добавить в избранное",
    viewProduct: "Смотреть",
    modalAddToCart: "Добавить в корзину",
    checkoutNameRequired: "Введите имя",
    checkoutPhoneRequired: "Введите телефон",
    checkoutAddressRequired: "Введите адрес доставки",
    checkoutSuccessTitle: "Спасибо за заказ",
    checkoutSuccessSubtitle: "Мы свяжемся с вами в ближайшее время",
    checkoutCancelTitle: "Оплата отменена",
    checkoutCancelSubtitle: "Вы можете вернуться в магазин и попробовать снова."
  },
  en: {
    shop: "Shop",
    cart: "Cart",
    hero: "BUILT FOR PERFORMANCE",
    buy: "SHOP NOW",
    productsTitle: "Premium Training Essentials",
    footerCatalog: "Catalog",
    footerAbout: "About",
    footerDelivery: "Delivery",
    footerContacts: "Contacts",
    emptyFavoritesTitle: "No favorite products",
    emptyFavoritesSubtitle: "Tap ❤️ to save items",
    favoritesFilter: "Favorites only",
    favoritesFilterActive: "Showing favorites",
    favoriteTooltip: "Add to favorites",
    viewProduct: "View",
    modalAddToCart: "Add to cart",
    checkoutNameRequired: "Enter your name",
    checkoutPhoneRequired: "Enter phone number",
    checkoutAddressRequired: "Enter delivery address",
    checkoutSuccessTitle: "Thank you for your order",
    checkoutSuccessSubtitle: "We will contact you shortly",
    checkoutCancelTitle: "Payment canceled",
    checkoutCancelSubtitle: "You can return to the store and try again."
  }
};

const products = [
  {
    id: 1,
    name: "Футболка RBC",
    catalogTitle: "RBC ATHLETIC T-SHIRT",
    catalogSubtitle: "OVERSIZED FIT",
    catalogColor: "BLACK",
    price: 2490,
    images: {
      front: "image/tshirt-front.png",
      back: "image/tshirt-back.png",
      gallery: ["image/tshirt-detail.png", "image/tshirt-side.png"]
    }
  },
  {
    id: 2,
    name: "Худи RBC",
    catalogTitle: "RBC PERFORMANCE HOODIE",
    catalogSubtitle: "RELAXED FIT",
    catalogColor: "GRAPHITE",
    price: 4990,
    images: {
      front: "image/hoodie-front.png",
      back: "image/hoodie-back.png",
      gallery: [
        "image/hoodie-detail.png",
        "image/hoodie-side.png"
      ]
    }
  },
  {
    id: 3,
    name: "Штаны RBC",
    catalogTitle: "RBC TRAINING SWEATPANTS",
    catalogSubtitle: "TAPERED FIT",
    catalogColor: "JET BLACK",
    price: 3590,
    images: {
      front: "image/sweatpants-front.png",
      back: "image/sweatpants-back.png",
      gallery: [
        "image/sweatpants-detail.png",
        "image/sweatpants-side.png"
      ]
    }
  }
];

function getProductCardImages(product) {
  const fallbackFront = product && typeof product.image === "string" ? product.image : "";
  const fallbackBack = product && typeof product.hoverImg === "string" ? product.hoverImg : fallbackFront;
  const imageConfig = product && typeof product.images === "object" && product.images !== null ? product.images : null;
  const front = imageConfig && typeof imageConfig.front === "string" ? imageConfig.front : fallbackFront;
  const back = imageConfig && typeof imageConfig.back === "string" ? imageConfig.back : fallbackBack;
  return {
    front,
    back: back || front
  };
}

function getProductGallery(product) {
  const cardImages = getProductCardImages(product);
  const gallery = Array.isArray(product && product.images && product.images.gallery)
    ? product.images.gallery.filter((imagePath) => typeof imagePath === "string" && imagePath)
    : [];

  return [cardImages.front, cardImages.back, ...gallery].filter((imagePath, index, arr) => imagePath && arr.indexOf(imagePath) === index);
}

function getProductModalMeta(product) {
  const subtitle = product && typeof product.catalogSubtitle === "string" && product.catalogSubtitle
    ? product.catalogSubtitle
    : "OVERSIZED FIT";
  const material = "HEAVYWEIGHT COTTON";
  const label = product && product.id % 2 === 0 ? "RBC CORE COLLECTION" : "RBC DROP 01";

  return {
    label,
    subtitle,
    material
  };
}

function renderModalThumbnails(product) {
  const thumbnailsContainer = document.getElementById("modal-thumbnails");
  if (!thumbnailsContainer) return;

  const galleryImages = getProductGallery(product);
  thumbnailsContainer.replaceChildren();

  galleryImages.forEach((imagePath, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-modal__thumb";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `Показать изображение ${index + 1}`);
    button.classList.toggle("is-active", index === currentImageIndex);

    const thumbnailImage = document.createElement("img");
    thumbnailImage.src = imagePath;
    thumbnailImage.alt = `Preview ${index + 1}`;
    thumbnailImage.loading = "lazy";
    button.appendChild(thumbnailImage);

    thumbnailsContainer.appendChild(button);
  });
}

function syncModalActiveThumbnail() {
  const thumbnailsContainer = document.getElementById("modal-thumbnails");
  if (!thumbnailsContainer) return;

  thumbnailsContainer.querySelectorAll(".product-modal__thumb").forEach((thumbButton) => {
    const thumbIndex = Number(thumbButton.dataset.index);
    thumbButton.classList.toggle("is-active", thumbIndex === currentImageIndex);
  });
}

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

function syncBodyScrollLock() {
  const cartIsOpen = Boolean(document.getElementById("cart") && document.getElementById("cart").classList.contains("active"));
  const modalIsOpen = Boolean(document.getElementById("modal") && document.getElementById("modal").classList.contains("is-open"));
  document.body.classList.toggle("no-scroll", cartIsOpen || modalIsOpen);
}

function cleanCheckoutQueryParams() {
  const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

function getStoreHomeUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

// =========================
// SUCCESS / CANCEL (ОДНО МЕСТО)
// =========================
function renderCheckoutStatusPage(status) {
  const locale = translations[lang] || translations.ru;
  const config = {
    success: {
      icon: "✅",
      title: locale.checkoutSuccessTitle,
      paragraphs: [locale.checkoutSuccessSubtitle],
      clearCart: true
    },
    cancel: {
      icon: "❌",
      title: locale.checkoutCancelTitle,
      paragraphs: [locale.checkoutCancelSubtitle],
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
    window.location.href = getStoreHomeUrl();
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestCheckoutSession(payload) {
  const response = await fetch("https://rbc-store.onrender.com/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data && typeof data.error === "string" ? data.error : "Checkout request failed");
    error.status = response.status;
    throw error;
  }

  if (!data || typeof data.url !== "string" || !data.url) {
    throw new Error("Invalid checkout response");
  }

  return data.url;
}

function scrollToProductsSection() {
  const productsBlock = document.getElementById("products");
  if (!productsBlock) return;

  const section = productsBlock.closest(".site-products-section") || productsBlock;
  const header = document.querySelector(".site-header") || document.querySelector(".header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const top = window.scrollY + section.getBoundingClientRect().top - headerHeight - 12;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth"
  });
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
  const productsTitle = document.querySelector(".site-products-section__title");
  const footerCatalog = document.getElementById("footer-nav-catalog");
  const footerAbout = document.getElementById("footer-nav-about");
  const footerDelivery = document.getElementById("footer-nav-delivery");
  const footerContacts = document.getElementById("footer-nav-contacts");
  const emptyFavoritesTitle = document.getElementById("products-empty-title");
  const emptyFavoritesSubtitle = document.getElementById("products-empty-subtitle");
  const modalBuyButton = document.getElementById("modal-buy");

  if (shop) shop.innerText = translations[lang].shop;
  if (hero) hero.innerText = translations[lang].hero;
  if (buyBtn) buyBtn.innerText = translations[lang].buy;
  if (cartLabel) cartLabel.innerText = translations[lang].cart;
  if (productsTitle) productsTitle.innerText = translations[lang].productsTitle;
  if (footerCatalog) footerCatalog.innerText = translations[lang].footerCatalog;
  if (footerAbout) footerAbout.innerText = translations[lang].footerAbout;
  if (footerDelivery) footerDelivery.innerText = translations[lang].footerDelivery;
  if (footerContacts) footerContacts.innerText = translations[lang].footerContacts;
  if (emptyFavoritesTitle) emptyFavoritesTitle.innerText = translations[lang].emptyFavoritesTitle;
  if (emptyFavoritesSubtitle) emptyFavoritesSubtitle.innerText = translations[lang].emptyFavoritesSubtitle;
  if (modalBuyButton) modalBuyButton.innerText = translations[lang].modalAddToCart;

  updateFavoritesToggleButton();
}

function updateFavoritesToggleButton() {
  const favoritesToggleBtn = document.getElementById("favorites-toggle");
  if (!favoritesToggleBtn) return;

  const buttonLabel = showFavoritesOnly
    ? translations[lang].favoritesFilterActive
    : translations[lang].favoritesFilter;
  favoritesToggleBtn.innerText = buttonLabel;
  favoritesToggleBtn.classList.toggle("is-active", showFavoritesOnly);
  favoritesToggleBtn.setAttribute("aria-pressed", showFavoritesOnly ? "true" : "false");
}

function renderProducts() {
  const container = document.getElementById("products");
  const emptyState = document.getElementById("products-empty-state");
  if (!container) return;

  container.innerHTML = "";
  if (emptyState) emptyState.hidden = true;

  const visibleProducts = products.filter((product) => favorites.includes(product.name));
  const dataSource = showFavoritesOnly ? visibleProducts : products;

  if (showFavoritesOnly && visibleProducts.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  dataSource.forEach((product) => {
    const displayTitle = product.catalogTitle || product.name.toUpperCase();
    const displaySubtitle = product.catalogSubtitle || "ATHLETIC FIT";
    const displayLabel = product.id % 2 === 0 ? "RBC CORE COLLECTION" : "RBC DROP 01";
    const formattedPrice = `${Number(product.price).toLocaleString("ru-RU")} ₽`;
    const cardImages = getProductCardImages(product);

    container.innerHTML += `
      <article class="product-card product-grid__card catalog-card" data-product-id="${product.id}">
        <div class="image-wrapper catalog-card__media" onclick="openModal(${product.id})">
          <img src="${cardImages.front}" class="main-img catalog-card__img catalog-card__img--front" alt="${displayTitle} FRONT">
          <img src="${cardImages.back}" class="hover-img catalog-card__img catalog-card__img--back" alt="${displayTitle} BACK">
        </div>

        <div
          class="like-btn ${favorites.includes(product.name) ? "active" : ""}"
          data-favorite-key="${product.name}"
          data-tooltip="${translations[lang].favoriteTooltip}"
          aria-label="${translations[lang].favoriteTooltip}"
        >❤</div>

        <div class="product-info catalog-card__content">
          <p class="catalog-card__eyebrow">${displayLabel}</p>
          <h3 class="catalog-card__title">${displayTitle}</h3>
          <p class="catalog-card__subtitle">${displaySubtitle}</p>

          <p class="price catalog-card__price">${formattedPrice}</p>
        </div>

        <button class="view-btn catalog-card__cta" onclick="event.stopPropagation(); openModal(${product.id})">
          ${translations[lang].viewProduct}
        </button>
      </article>
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
  const modalLabel = document.getElementById("modal-label");
  const modalSubtitle = document.getElementById("modal-subtitle");
  const modalMaterial = document.getElementById("modal-material");
  const galleryImages = getProductGallery(product);
  const modalMeta = getProductModalMeta(product);

  if (modalTitle) modalTitle.innerText = product.name;
  if (modalPrice) modalPrice.innerText = `${product.price} ₽`;
  if (modalImg) modalImg.src = galleryImages[0] || "";
  if (modalLabel) modalLabel.innerText = modalMeta.label;
  if (modalSubtitle) modalSubtitle.innerText = modalMeta.subtitle;
  if (modalMaterial) modalMaterial.innerText = modalMeta.material;
  renderModalThumbnails(product);
  if (modal) {
    modal.classList.add("is-open");
    syncBodyScrollLock();
  }
  if (modalBuyBtn) modalBuyBtn.disabled = true;
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.remove("is-open");
  syncBodyScrollLock();
}

function updateModal() {
  const modalImg = document.getElementById("modal-img");
  if (!modalImg || !currentProduct) return;
  const galleryImages = getProductGallery(currentProduct);
  if (galleryImages.length === 0) return;
  modalImg.src = galleryImages[currentImageIndex] || galleryImages[0];
  syncModalActiveThumbnail();
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

  const totalQty = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  if (totalQty === 0) {
    countEl.style.display = "none";
  } else {
    countEl.style.display = "inline-block";
    countEl.textContent = totalQty;
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
        <p class="empty-cart__title">Корзина пуста</p>
        <p class="empty-cart__subtitle">Добавьте товары из каталога</p>
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
    const itemInfo = document.createElement("div");
    const nameEl = document.createElement("p");
    const detailsEl = document.createElement("small");
    nameEl.textContent = item.name || "Без названия";
    detailsEl.textContent = `${item.size || "—"} / ${item.color || "—"}`;
    itemInfo.appendChild(nameEl);
    itemInfo.appendChild(detailsEl);

    const itemControls = document.createElement("div");
    const summaryEl = document.createElement("p");
    summaryEl.textContent = `${item.price} ₽ × ${item.qty}`;

    const qtyControls = document.createElement("div");
    qtyControls.className = "qty-controls";

    const decreaseBtn = document.createElement("button");
    decreaseBtn.type = "button";
    decreaseBtn.textContent = "-";
    decreaseBtn.addEventListener("click", () => changeQty(index, -1));

    const qtyValue = document.createElement("span");
    qtyValue.textContent = item.qty;

    const increaseBtn = document.createElement("button");
    increaseBtn.type = "button";
    increaseBtn.textContent = "+";
    increaseBtn.addEventListener("click", () => changeQty(index, 1));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeFromCart(index));

    qtyControls.appendChild(decreaseBtn);
    qtyControls.appendChild(qtyValue);
    qtyControls.appendChild(increaseBtn);

    itemControls.appendChild(summaryEl);
    itemControls.appendChild(qtyControls);
    itemControls.appendChild(removeBtn);

    div.appendChild(itemInfo);
    div.appendChild(itemControls);

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

  syncBodyScrollLock();
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

// =========================
// ОФОРМЛЕНИЕ ЗАКАЗА (STRIPE)
// =========================
async function handleCheckout() {
  const btn = document.querySelector(".checkout-btn");
  if (!btn || btn.disabled || isCheckoutRequestInFlight) return;

  startCheckoutButtonLoading(btn);

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const addressInput = document.getElementById("customer-address");
  const checkoutError = document.getElementById("checkout-error");

  const clearFieldError = (input) => {
    if (!input) return;
    input.classList.remove("is-invalid");
  };
  const markFieldInvalid = (input) => {
    if (!input) return;
    input.classList.add("is-invalid");
  };

  clearFieldError(nameInput);
  clearFieldError(phoneInput);
  clearFieldError(addressInput);
  if (checkoutError) checkoutError.hidden = true;

  if (!Array.isArray(cart) || cart.length === 0) {
    showToast("Корзина пуста");
    resetCheckoutButton(btn);
    return;
  }

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const address = addressInput ? addressInput.value.trim() : "";

  let errorMessage = "";
  if (!name) {
    markFieldInvalid(nameInput);
    errorMessage = translations[lang].checkoutNameRequired;
  } else if (!phone) {
    markFieldInvalid(phoneInput);
    errorMessage = translations[lang].checkoutPhoneRequired;
  } else if (!address) {
    markFieldInvalid(addressInput);
    errorMessage = translations[lang].checkoutAddressRequired;
  }

  if (errorMessage) {
    if (checkoutError) {
      checkoutError.innerText = errorMessage;
      checkoutError.hidden = false;
    }
    showToast(errorMessage);
    resetCheckoutButton(btn);
    return;
  }

  const payload = {
    cart,
    name,
    phone,
    address
  };

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const checkoutUrl = await requestCheckoutSession(payload);
      window.location.href = checkoutUrl;
      return;
    } catch (error) {
      const shouldRetry = attempt < maxAttempts && (!("status" in error) || error.status >= 500);

      if (shouldRetry) {
        await sleep(450);
        continue;
      }

      if (checkoutError) {
        checkoutError.innerText = "Сервер оплаты временно недоступен";
        checkoutError.hidden = false;
      }
      showToast("Сервер оплаты временно недоступен");
      resetCheckoutButton(btn);
      return;
    }
  }
}

// =========================
// ОБРАБОТЧИКИ СОБЫТИЙ UI
// =========================
function handleDocumentClick(e) {
  const modalThumbBtn = e.target.closest(".product-modal__thumb");
  if (modalThumbBtn && currentProduct) {
    e.preventDefault();
    const thumbIndex = Number(modalThumbBtn.dataset.index);
    if (!Number.isNaN(thumbIndex)) {
      currentImageIndex = thumbIndex;
      updateModal();
    }
    return;
  }

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
    const favoriteKey = e.target.dataset.favoriteKey || "";
    if (!favoriteKey) return;

    if (favorites.includes(favoriteKey)) {
      favorites = favorites.filter((favorite) => favorite !== favoriteKey);
      e.target.classList.remove("active");
    } else {
      favorites.push(favoriteKey);
      e.target.classList.add("active");
    }

    persistFavorites();
    if (showFavoritesOnly) {
      renderProducts();
    }
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
    syncBodyScrollLock();
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
    const galleryImages = getProductGallery(currentProduct);
    if (galleryImages.length === 0) return;
    currentImageIndex -= 1;
    if (currentImageIndex < 0) currentImageIndex = galleryImages.length - 1;
    updateModal();
  });
}

const nextBtn = document.getElementById("next");
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (!currentProduct) return;
    const galleryImages = getProductGallery(currentProduct);
    if (galleryImages.length === 0) return;
    currentImageIndex += 1;
    if (currentImageIndex >= galleryImages.length) currentImageIndex = 0;
    updateModal();
  });
}

const clearCartBtn = document.getElementById("clear-cart");
if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);

const checkoutBtn = document.querySelector(".checkout-btn");
if (checkoutBtn) checkoutBtn.addEventListener("click", handleCheckout);

const checkoutInputs = document.querySelectorAll(".checkout-form__input");
checkoutInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("is-invalid");
    const checkoutError = document.getElementById("checkout-error");
    if (checkoutError) checkoutError.hidden = true;
  });
});

const buyBtn = document.querySelector(".buy-btn");
if (buyBtn) {
  buyBtn.addEventListener("click", () => {
    scrollToProductsSection();
  });
}

const favoritesToggleBtn = document.getElementById("favorites-toggle");
if (favoritesToggleBtn) {
  favoritesToggleBtn.addEventListener("click", () => {
    showFavoritesOnly = !showFavoritesOnly;
    updateFavoritesToggleButton();
    renderProducts();
  });
}

const navShopLink = document.querySelector(".nav-shop");
if (navShopLink) {
  navShopLink.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToProductsSection();
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
