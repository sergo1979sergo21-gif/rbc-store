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
    favoritesNav: "Избранное",
    favoritesDrawerTitle: "Избранное",
    favoritesEmptyTitle: "Избранное пусто",
    favoritesEmptySubtitle: "Добавляйте товары, чтобы не потерять их",
    favoritesToCart: "В корзину",
    favoritesRemove: "Удалить",
    favoriteTooltipAdd: "Добавить в избранное",
    favoriteTooltipRemove: "Убрать из избранного",
    viewProduct: "Смотреть",
    quickAdd: "Быстро в корзину",
    quickAddNeedOptions: "Выберите размер и цвет",
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
    favoritesNav: "Favorites",
    favoritesDrawerTitle: "Favorites",
    favoritesEmptyTitle: "Favorites is empty",
    favoritesEmptySubtitle: "Save products so you can return later",
    favoritesToCart: "To cart",
    favoritesRemove: "Remove",
    favoriteTooltipAdd: "Add to favorites",
    favoriteTooltipRemove: "Remove from favorites",
    viewProduct: "View",
    quickAdd: "Quick add",
    quickAddNeedOptions: "Choose size and color",
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
  const favoritesIsOpen = Boolean(document.getElementById("favorites-drawer") && document.getElementById("favorites-drawer").classList.contains("active"));
  const modalIsOpen = Boolean(document.getElementById("modal") && document.getElementById("modal").classList.contains("is-open"));
  document.body.classList.toggle("no-scroll", cartIsOpen || favoritesIsOpen || modalIsOpen);
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

function updateHeaderScrollState() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 14);
}

function updateText() {
  const shop = document.querySelector(".nav-shop");
  const hero = document.querySelector(".hero-text");
  const buyBtn = document.querySelector(".buy-btn");
  const cartLabel = document.querySelector(".cart-text");
  const favoritesLabel = document.querySelector(".favorites-text");
  const favoritesDrawerTitle = document.getElementById("favorites-drawer-title");
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
  if (favoritesLabel) favoritesLabel.innerText = translations[lang].favoritesNav;
  if (favoritesDrawerTitle) favoritesDrawerTitle.innerText = translations[lang].favoritesDrawerTitle;
  if (productsTitle) productsTitle.innerText = translations[lang].productsTitle;
  if (footerCatalog) footerCatalog.innerText = translations[lang].footerCatalog;
  if (footerAbout) footerAbout.innerText = translations[lang].footerAbout;
  if (footerDelivery) footerDelivery.innerText = translations[lang].footerDelivery;
  if (footerContacts) footerContacts.innerText = translations[lang].footerContacts;
  if (emptyFavoritesTitle) emptyFavoritesTitle.innerText = translations[lang].emptyFavoritesTitle;
  if (emptyFavoritesSubtitle) emptyFavoritesSubtitle.innerText = translations[lang].emptyFavoritesSubtitle;
  if (modalBuyButton) modalBuyButton.innerText = translations[lang].modalAddToCart;

  updateFavoritesCount();
  renderFavoritesDrawer();
  updateFavoriteTooltips();
  updateViewFiltersState();
}

function updateViewFiltersState() {
  const favoritesToggleBtn = document.getElementById("favorites-toggle");
  const emptyState = document.getElementById("products-empty-state");
  const hasFavorites = favorites.length > 0;
  if (!favoritesToggleBtn) {
    if (emptyState) emptyState.hidden = true;
    return;
  }

  favoritesToggleBtn.hidden = !hasFavorites;
  if (!hasFavorites && emptyState) emptyState.hidden = true;
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function getFavoriteTooltipTexts() {
  return {
    add: translations[lang].favoriteTooltipAdd,
    remove: translations[lang].favoriteTooltipRemove
  };
}

function updateFavoriteTooltips() {
  const tooltipTexts = getFavoriteTooltipTexts();
  document.querySelectorAll(".like-btn").forEach((likeButton) => {
    const isActive = likeButton.classList.contains("active");
    likeButton.dataset.tooltip = tooltipTexts.add;
    likeButton.dataset.tooltipActive = tooltipTexts.remove;
    likeButton.setAttribute("aria-label", isActive ? tooltipTexts.remove : tooltipTexts.add);
  });
}

function isFavorite(productName) {
  return favorites.includes(productName);
}

function toggleFavoriteByKey(favoriteKey) {
  if (!favoriteKey) return;

  if (isFavorite(favoriteKey)) {
    favorites = favorites.filter((favorite) => favorite !== favoriteKey);
  } else {
    favorites.push(favoriteKey);
  }

  persistFavorites();
  renderProducts();
  renderFavoritesDrawer();
  updateFavoritesCount();
  updateViewFiltersState();
  updateFavoriteTooltips();
  if (favorites.length === 0) {
    closeFavorites();
  }
}

function getQuickAddVariant(productId) {
  const existingItem = cart.find(
    (item) => item.id === productId && typeof item.size === "string" && item.size && typeof item.color === "string" && item.color
  );
  if (!existingItem) return null;

  return {
    size: existingItem.size,
    color: existingItem.color
  };
}

function handleSafeQuickAdd(productId) {
  const variant = getQuickAddVariant(productId);
  if (variant) {
    addToCart(productId, variant.size, variant.color);
    renderCart();
    return;
  }

  openModal(productId);
  showToast(translations[lang].quickAddNeedOptions);
}

function updateFavoritesCount() {
  const favoritesCountEl = document.getElementById("favorites-count");
  if (!favoritesCountEl) return;

  const totalFavorites = favorites.length;
  if (totalFavorites === 0) {
    favoritesCountEl.style.display = "none";
  } else {
    favoritesCountEl.style.display = "inline-block";
    favoritesCountEl.textContent = totalFavorites;
  }

  favoritesCountEl.classList.remove("animate");
  void favoritesCountEl.offsetWidth;
  favoritesCountEl.classList.add("animate");
}

function renderFavoritesDrawer() {
  const container = document.getElementById("favorites-items");
  if (!container) return;

  container.innerHTML = "";
  const favoriteProducts = products.filter((product) => isFavorite(product.name));

  if (favoriteProducts.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <p class="empty-cart__title">${translations[lang].favoritesEmptyTitle}</p>
        <p class="empty-cart__subtitle">${translations[lang].favoritesEmptySubtitle}</p>
      </div>
    `;
    return;
  }

  favoriteProducts.forEach((product) => {
    const item = document.createElement("article");
    item.className = "favorites-item";
    item.dataset.favoriteKey = product.name;

    const cardImages = getProductCardImages(product);
    item.innerHTML = `
      <div class="favorites-item__media">
        <img src="${cardImages.front}" alt="${product.name}">
      </div>
      <div class="favorites-item__body">
        <p class="favorites-item__name">${product.catalogTitle || product.name}</p>
        <p class="favorites-item__price">${formatPrice(product.price)}</p>
        <div class="favorites-item__actions">
          <button class="favorites-item__add" type="button" data-product-id="${product.id}">
            ${translations[lang].favoritesToCart}
          </button>
          <button class="favorites-item__remove" type="button" data-favorite-key="${product.name}" aria-label="${translations[lang].favoritesRemove}">
            ✕
          </button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function openFavoritesDrawer() {
  const favoritesDrawer = document.getElementById("favorites-drawer");
  if (!favoritesDrawer) return;

  closeCart();
  closeModal();
  favoritesDrawer.classList.add("active");
  syncOverlayState();
  syncBodyScrollLock();
  renderFavoritesDrawer();
}

function closeFavorites() {
  const favoritesDrawer = document.getElementById("favorites-drawer");
  if (favoritesDrawer) favoritesDrawer.classList.remove("active");
  syncOverlayState();
  syncBodyScrollLock();
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

function renderProducts() {
  const container = document.getElementById("products");
  const emptyState = document.getElementById("products-empty-state");
  if (!container) return;

  container.innerHTML = "";
  if (emptyState) emptyState.hidden = true;

  products.forEach((product) => {
    const displayTitle = product.catalogTitle || product.name.toUpperCase();
    const displaySubtitle = product.catalogSubtitle || "ATHLETIC FIT";
    const displayLabel = product.id % 2 === 0 ? "RBC CORE COLLECTION" : "RBC DROP 01";
    const formattedPrice = formatPrice(product.price);
    const cardImages = getProductCardImages(product);
    const favoriteActive = isFavorite(product.name);
    const tooltipTexts = getFavoriteTooltipTexts();

    container.innerHTML += `
      <article class="product-card product-grid__card catalog-card" data-product-id="${product.id}">
        <div class="image-wrapper catalog-card__media" onclick="openModal(${product.id})">
          <img src="${cardImages.front}" class="main-img catalog-card__img catalog-card__img--front" alt="${displayTitle} FRONT">
          <img src="${cardImages.back}" class="hover-img catalog-card__img catalog-card__img--back" alt="${displayTitle} BACK">
        </div>

        <div
          class="like-btn ${favoriteActive ? "active" : ""}"
          data-favorite-key="${product.name}"
          data-tooltip="${tooltipTexts.add}"
          data-tooltip-active="${tooltipTexts.remove}"
          aria-label="${favoriteActive ? tooltipTexts.remove : tooltipTexts.add}"
        >❤</div>

        <div class="product-info catalog-card__content">
          <p class="catalog-card__eyebrow">${displayLabel}</p>
          <h3 class="catalog-card__title">${displayTitle}</h3>
          <p class="catalog-card__subtitle">${displaySubtitle}</p>

          <p class="price catalog-card__price">${formattedPrice}</p>
        </div>

        <div class="catalog-card__actions">
          <button class="view-btn catalog-card__cta" onclick="event.stopPropagation(); openModal(${product.id})">
            ${translations[lang].viewProduct}
          </button>
          <button
            class="quick-add-btn"
            type="button"
            title="${translations[lang].quickAdd}"
            aria-label="${translations[lang].quickAdd}"
            onclick="event.stopPropagation(); handleSafeQuickAdd(${product.id})"
          >
            +
          </button>
        </div>
      </article>
    `;
  });

  updateFavoriteTooltips();
}

function syncOverlayState() {
  const overlay = document.getElementById("overlay");
  const cartEl = document.getElementById("cart");
  const favoritesDrawer = document.getElementById("favorites-drawer");
  if (!overlay) return;

  const hasOpenDrawer = Boolean(
    (cartEl && cartEl.classList.contains("active")) ||
    (favoritesDrawer && favoritesDrawer.classList.contains("active"))
  );
  overlay.classList.toggle("active", hasOpenDrawer);
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
  closeCart();
  closeFavorites();
  if (modal) {
    modal.classList.add("is-open");
    syncOverlayState();
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

  if (cartEl) cartEl.classList.remove("active");
  syncOverlayState();
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
    toggleFavoriteByKey(favoriteKey);
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
const cartBtn = document.querySelector("button.nav-cart");
const closeCartBtn = document.getElementById("close-cart");
const favoritesDrawerEl = document.getElementById("favorites-drawer");
const navFavoritesBtn = document.querySelector("button.nav-favorites");
const closeFavoritesBtn = document.getElementById("close-favorites");
const favoritesItemsEl = document.getElementById("favorites-items");

if (cartBtn && cartEl && overlay) {
  cartBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nav = document.querySelector("nav");
    if (nav) nav.classList.remove("active");
    closeFavorites();
    closeModal();
    cartEl.classList.add("active");
    syncOverlayState();
    syncBodyScrollLock();
    renderCart();
  });
}

if (cartEl) {
  cartEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (favoritesDrawerEl) {
  favoritesDrawerEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (navFavoritesBtn) {
  navFavoritesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nav = document.querySelector("nav");
    if (nav) nav.classList.remove("active");
    openFavoritesDrawer();
  });
}

if (closeFavoritesBtn) {
  closeFavoritesBtn.addEventListener("click", closeFavorites);
}

if (favoritesItemsEl) {
  favoritesItemsEl.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".favorites-item__add");
    if (addBtn) {
      const productId = Number(addBtn.dataset.productId);
      if (!Number.isNaN(productId)) {
        handleSafeQuickAdd(productId);
      }
      return;
    }

    const removeBtn = e.target.closest(".favorites-item__remove");
    if (removeBtn) {
      const favoriteKey = removeBtn.dataset.favoriteKey || "";
      toggleFavoriteByKey(favoriteKey);
    }
  });
}

if (overlay) {
  overlay.addEventListener("click", () => {
    closeCart();
    closeFavorites();
  });
}
if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCart();
    closeFavorites();
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
    favoritesToggleBtn.classList.toggle("is-active");
    favoritesToggleBtn.setAttribute("aria-pressed", favoritesToggleBtn.classList.contains("is-active") ? "true" : "false");
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

const navAboutLink = document.querySelector(".nav-about");
if (navAboutLink) {
  navAboutLink.addEventListener("click", (e) => {
    e.preventDefault();
    const footer = document.getElementById("app-footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const navDeliveryLink = document.querySelector(".nav-delivery");
if (navDeliveryLink) {
  navDeliveryLink.addEventListener("click", (e) => {
    e.preventDefault();
    const footer = document.getElementById("app-footer");
    if (footer) {
      footer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const burger = document.querySelector(".burger");
const nav = document.querySelector("nav");
if (burger && nav) {
  burger.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}
window.addEventListener("scroll", updateHeaderScrollState, { passive: true });

// =========================
// СТАРТ ПРИЛОЖЕНИЯ
// =========================
const isCheckoutStatusRendered = handleCheckoutStatusFromUrl();
if (!isCheckoutStatusRendered) {
  updateText();
  renderProducts();
  updateCartCount();
  renderCart();
  updateHeaderScrollState();
}
