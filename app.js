const MENU = [
  {
    code: 'MATCHA_LATTE',
    name: 'มัทฉะ ลาเต้',
    image: 'images/matcha-latte.jpg',
    variants: [
      { name: 'ธรรมดา', price: 79 },
      { name: 'Premium', price: 99 }
    ]
  },
  {
    code: 'MATCHA_COCONUT_FOAM',
    name: 'มัทฉะโฟมมะพร้าว',
    image: 'images/coconut-foam.jpg',
    variants: [{ name: 'ธรรมดา', price: 79 }]
  },
  {
    code: 'MATCHA_COCONUT',
    name: 'มัทฉะมะพร้าว',
    image: 'images/coconut-matcha.jpg',
    variants: [
      { name: 'ธรรมดา', price: 79 },
      { name: 'Premium', price: 99 }
    ]
  },
  {
    code: 'COLD_WHISK',
    name: 'Cold Whisk',
    image: 'images/cold-whisk.jpg',
    variants: [
      { name: 'ธรรมดา', price: 79 },
      { name: 'นมโอ๊ต', price: 89 }
    ]
  },
  {
    code: 'PURE_MATCHA',
    name: 'เพียวมัทฉะ',
    image: 'images/pure-matcha.jpg',
    variants: [
      { name: 'ธรรมดา', price: 79 },
      { name: 'Premium', price: 109 }
    ]
  }
];

const SWEETNESS = ['หวานปกติ', 'หวานน้อย', 'ไม่หวาน'];

const state = {
  profile: null,
  cart: JSON.parse(localStorage.getItem('makhamChaCart') || '[]'),
  latitude: null,
  longitude: null,
  currentOrder: null,
  submitting: false,
  storeStatus: {
    isOpen: true,
    message: ''
  }
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  try {
    renderMenu();
    bindEvents();
    updateCartUI();

    await Promise.all([
      initializeLiff(),
      loadStoreStatus()
    ]);
  } catch (error) {
    console.error(error);
    showToast('ไม่สามารถเปิดระบบ LINE ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    document.getElementById('loadingScreen').classList.add('hidden');
  }
}

async function initializeLiff() {
  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return;
  }

  const profile = await liff.getProfile();
  state.profile = {
    lineUserId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || 'https://via.placeholder.com/100?text=LINE'
  };

  document.getElementById('profileName').textContent = state.profile.displayName;
  document.getElementById('profileImage').src = state.profile.pictureUrl;
  document.getElementById('checkoutProfileName').textContent = state.profile.displayName;
  document.getElementById('checkoutProfileImage').src = state.profile.pictureUrl;
}


async function loadStoreStatus() {
  try {
    const response = await callApi('getStoreStatus', {});

    if (!response.success) {
      throw new Error(response.message || 'ไม่สามารถตรวจสอบสถานะร้านได้');
    }

    state.storeStatus = {
      isOpen: response.isOpen,
      message: response.message || ''
    };

    applyStoreStatusUI();
  } catch (error) {
    console.error(error);

    // กรณีตรวจสอบสถานะร้านไม่ได้ ให้ปิดการสั่งซื้อเพื่อความปลอดภัย
    state.storeStatus = {
      isOpen: false,
      message: 'ไม่สามารถตรวจสอบสถานะร้านได้ กรุณาลองใหม่ภายหลัง'
    };

    applyStoreStatusUI();
  }
}

function applyStoreStatusUI() {
  const banner = document.getElementById('storeStatusBanner');
  const title = document.getElementById('storeStatusTitle');
  const message = document.getElementById('storeStatusMessage');
  const menuList = document.getElementById('menuList');

  const isOpen = state.storeStatus.isOpen;

  banner.classList.toggle('hidden', isOpen);
  menuList.classList.toggle('store-closed-overlay', !isOpen);

  if (!isOpen) {
    title.textContent = 'ขณะนี้ร้านปิดรับออเดอร์';
    message.textContent = state.storeStatus.message || 'กรุณากลับมาใช้บริการใหม่ในภายหลัง';
  }

  document.querySelectorAll('.add-cart-btn').forEach((button) => {
    button.disabled = !isOpen;
  });

  document.getElementById('goCheckoutBtn').disabled = !isOpen;
  document.getElementById('checkoutBtn').disabled = !isOpen;
}


function bindEvents() {
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('goCheckoutBtn').addEventListener('click', openCart);
  document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
  document.getElementById('locationBtn').addEventListener('click', getLocation);
  document.getElementById('createOrderBtn').addEventListener('click', createOrder);
  document.getElementById('uploadSlipBtn').addEventListener('click', uploadSlip);
  document.getElementById('slipInput').addEventListener('change', showSelectedFile);
  document.getElementById('closeSuccessBtn').addEventListener('click', resetAfterSuccess);

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.close).classList.add('hidden');
    });
  });
}

function renderMenu() {
  const menuList = document.getElementById('menuList');

  menuList.innerHTML = MENU.map((menu, index) => `
    <article class="menu-card">
      <img class="menu-image" src="${menu.image}" alt="${menu.name}" onerror="this.src='https://via.placeholder.com/600x400?text=Makham+Cha'" />
      <div class="menu-content">
        <div class="menu-title-row">
          <h3 class="menu-title">${menu.name}</h3>
          <span class="menu-price">เริ่ม ฿${menu.variants[0].price}</span>
        </div>

        <label for="variant-${index}">เลือกระดับเมนู</label>
        <select id="variant-${index}">
          ${menu.variants.map((variant) =>
            `<option value="${variant.name}" data-price="${variant.price}">${variant.name} — ฿${variant.price}</option>`
          ).join('')}
        </select>

        <label for="sweetness-${index}">ระดับความหวาน</label>
        <select id="sweetness-${index}">
          ${SWEETNESS.map((sweetness) => `<option value="${sweetness}">${sweetness}</option>`).join('')}
        </select>

        <div class="menu-actions">
          <div class="qty-control">
            <button type="button" onclick="changeMenuQty(${index}, -1)">−</button>
            <span id="qty-${index}">1</span>
            <button type="button" onclick="changeMenuQty(${index}, 1)">+</button>
          </div>
          <button type="button" class="add-cart-btn" onclick="addToCart(${index})">เพิ่มลงตะกร้า</button>
        </div>
      </div>
    </article>
  `).join('');
}

function changeMenuQty(index, amount) {
  const target = document.getElementById(`qty-${index}`);
  const nextValue = Math.max(1, Number(target.textContent) + amount);
  target.textContent = nextValue;
}

function addToCart(menuIndex) {
  if (!state.storeStatus.isOpen) {
    showToast('ขณะนี้ร้านปิดรับออเดอร์');
    return;
  }

  const menu = MENU[menuIndex];
  const variantSelect = document.getElementById(`variant-${menuIndex}`);
  const sweetness = document.getElementById(`sweetness-${menuIndex}`).value;
  const quantity = Number(document.getElementById(`qty-${menuIndex}`).textContent);
  const selectedOption = variantSelect.options[variantSelect.selectedIndex];

  const item = {
    id: `${menu.code}_${selectedOption.value}_${sweetness}`,
    menuCode: menu.code,
    menuName: menu.name,
    image: menu.image,
    variant: selectedOption.value,
    sweetness,
    unitPrice: Number(selectedOption.dataset.price),
    quantity
  };

  const existing = state.cart.find((cartItem) => cartItem.id === item.id);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    state.cart.push(item);
  }

  document.getElementById(`qty-${menuIndex}`).textContent = '1';
  saveCart();
  updateCartUI();
  showToast(`เพิ่ม ${menu.name} ลงตะกร้าแล้ว`);
}

function updateCartUI() {
  const totalQuantity = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateSubtotal();

  document.getElementById('cartBadge').textContent = totalQuantity;
  document.getElementById('bottomCartCount').textContent = `${totalQuantity} รายการ`;
  document.getElementById('bottomCartTotal').textContent = formatBaht(subtotal);

  document.getElementById('bottomCart').classList.toggle('hidden', totalQuantity === 0);
  renderCartItems();
}

function renderCartItems() {
  const cartItems = document.getElementById('cartItems');
  const emptyMessage = document.getElementById('emptyCartMessage');
  const cartSummary = document.getElementById('cartSummary');

  if (!state.cart.length) {
    cartItems.innerHTML = '';
    emptyMessage.classList.remove('hidden');
    cartSummary.classList.add('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');
  cartSummary.classList.remove('hidden');

  cartItems.innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <img class="cart-item-image" src="${item.image}" alt="${item.menuName}" />
      <div class="cart-item-info">
        <h3>${item.menuName}</h3>
        <p>${item.variant} · ${item.sweetness}</p>
        <p class="cart-item-price">${formatBaht(item.unitPrice)} × ${item.quantity} = ${formatBaht(item.unitPrice * item.quantity)}</p>
        <div class="cart-item-actions">
          <button class="small-action-btn" onclick="changeCartQty(${index}, -1)">−</button>
          <strong>${item.quantity}</strong>
          <button class="small-action-btn" onclick="changeCartQty(${index}, 1)">+</button>
          <button class="delete-btn" onclick="removeCartItem(${index})">ลบ</button>
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('cartSubtotal').textContent = formatBaht(calculateSubtotal());
}

function changeCartQty(index, amount) {
  state.cart[index].quantity += amount;

  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }

  saveCart();
  updateCartUI();
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function openCart() {
  if (!state.cart.length) {
    showToast('กรุณาเลือกเมนูก่อน');
    return;
  }
  document.getElementById('cartModal').classList.remove('hidden');
}

function openCheckout() {
  if (!state.storeStatus.isOpen) {
    showToast('ขณะนี้ร้านปิดรับออเดอร์');
    return;
  }

  if (!state.cart.length) return;

  document.getElementById('cartModal').classList.add('hidden');
  renderCheckout();
  document.getElementById('checkoutModal').classList.remove('hidden');
}

function renderCheckout() {
  const subtotal = calculateSubtotal();

  document.getElementById('checkoutItems').innerHTML = state.cart.map((item) => `
    <div class="checkout-item-row">
      <span>${item.menuName} (${item.variant}, ${item.sweetness}) × ${item.quantity}</span>
      <strong>${formatBaht(item.unitPrice * item.quantity)}</strong>
    </div>
  `).join('');

  document.getElementById('checkoutSubtotal').textContent = formatBaht(subtotal);
  document.getElementById('checkoutShipping').textContent = 'รอคำนวณ';
  document.getElementById('checkoutTotal').textContent = formatBaht(subtotal);
}

function getLocation() {
  if (!navigator.geolocation) {
    showToast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
    return;
  }

  const button = document.getElementById('locationBtn');
  button.disabled = true;
  button.textContent = 'กำลังรับตำแหน่ง...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;

      const result = document.getElementById('locationResult');
      result.innerHTML = `
        <strong>รับตำแหน่งสำเร็จ</strong><br>
        Latitude: ${state.latitude.toFixed(6)}<br>
        Longitude: ${state.longitude.toFixed(6)}
      `;
      result.classList.remove('hidden');

      button.disabled = false;
      button.textContent = '📍 รับตำแหน่งปัจจุบันอีกครั้ง';
      showToast('รับตำแหน่งจัดส่งสำเร็จ');
    },
    (error) => {
      button.disabled = false;
      button.textContent = '📍 รับตำแหน่งปัจจุบัน';
      showToast('ไม่สามารถรับตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
      console.error(error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function createOrder() {
  if (state.submitting) return;

  const phone = document.getElementById('phoneInput').value.trim();
  const note = document.getElementById('noteInput').value.trim();

  if (!state.profile?.lineUserId) {
    showToast('ไม่พบข้อมูล LINE กรุณาเปิดผ่าน LINE OA');
    return;
  }

  if (!/^0\d{8,9}$/.test(phone)) {
    showToast('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
    return;
  }

  if (state.latitude === null || state.longitude === null) {
    showToast('กรุณากดรับตำแหน่งจัดส่งก่อน');
    return;
  }

  setSubmitting('createOrderBtn', true, 'กำลังคำนวณและสร้างคำสั่งซื้อ...');

  try {
    const response = await callApi('createOrder', {
      profile: state.profile,
      phone,
      latitude: state.latitude,
      longitude: state.longitude,
      customerNote: note,
      items: state.cart
    });

    if (!response.success) {
      throw new Error(response.message || 'ไม่สามารถสร้างคำสั่งซื้อได้');
    }

    state.currentOrder = response.order;
    showPayment(response.order);
    document.getElementById('checkoutModal').classList.add('hidden');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ');
  } finally {
    setSubmitting('createOrderBtn', false, 'ยืนยันคำสั่งซื้อและคำนวณค่าส่ง');
  }
}

function showPayment(order) {
  document.getElementById('paymentOrderId').textContent = order.orderId;
  document.getElementById('paymentSubtotal').textContent = formatBaht(order.itemsSubtotal);
  document.getElementById('paymentShipping').textContent = formatBaht(order.shippingFee);
  document.getElementById('paymentTotal').textContent = formatBaht(order.grandTotal);
  document.getElementById('paymentDistance').textContent = `${Number(order.distanceMeters).toLocaleString()} เมตร`;

  const qrElement = document.getElementById('qrcode');
  qrElement.innerHTML = '';

  new QRCode(qrElement, {
    text: order.promptPayPayload,
    width: 205,
    height: 205,
    colorDark: '#1d3021',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });

  document.getElementById('paymentModal').classList.remove('hidden');
}

function showSelectedFile() {
  const file = document.getElementById('slipInput').files[0];
  document.getElementById('selectedFileText').textContent = file ? `ไฟล์ที่เลือก: ${file.name}` : '';
}

async function uploadSlip() {
  if (state.submitting) return;

  const file = document.getElementById('slipInput').files[0];

  if (!state.currentOrder?.orderId) {
    showToast('ไม่พบข้อมูลคำสั่งซื้อ กรุณาลองใหม่');
    return;
  }

  if (!file) {
    showToast('กรุณาเลือกไฟล์สลิปการโอนเงิน');
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  if (!allowedTypes.includes(file.type)) {
    showToast('รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ PDF');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('ไฟล์มีขนาดเกิน 5 MB');
    return;
  }

  setSubmitting('uploadSlipBtn', true, 'กำลังอัปโหลดสลิป...');

  try {
    const base64 = await fileToBase64(file);

    const response = await callApi('uploadSlip', {
      orderId: state.currentOrder.orderId,
      lineUserId: state.profile.lineUserId,
      fileName: file.name,
      mimeType: file.type,
      base64Data: base64
    });

    if (!response.success) {
      throw new Error(response.message || 'ไม่สามารถอัปโหลดสลิปได้');
    }

    document.getElementById('paymentModal').classList.add('hidden');
    document.getElementById('successOrderId').textContent = state.currentOrder.orderId;
    document.getElementById('successTotal').textContent = formatBaht(state.currentOrder.grandTotal);
    document.getElementById('successModal').classList.remove('hidden');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิป');
  } finally {
    setSubmitting('uploadSlipBtn', false, 'ยืนยันการแจ้งโอนเงิน');
  }
}

async function callApi(action, payload) {
  if (!APP_CONFIG.API_URL || APP_CONFIG.API_URL.includes('YOUR_GOOGLE')) {
    throw new Error('กรุณาตั้งค่า API_URL ในไฟล์ config.js ก่อนใช้งาน');
  }

  const response = await fetch(APP_CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload })
  });

  return response.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(',')[1]);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function calculateSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function saveCart() {
  localStorage.setItem('makhamChaCart', JSON.stringify(state.cart));
}

function formatBaht(amount) {
  return `฿${Number(amount || 0).toLocaleString('th-TH')}`;
}

function setSubmitting(buttonId, isSubmitting, label) {
  state.submitting = isSubmitting;
  const button = document.getElementById(buttonId);
  button.disabled = isSubmitting;
  button.textContent = label;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function resetAfterSuccess() {
  state.cart = [];
  state.currentOrder = null;
  state.latitude = null;
  state.longitude = null;

  localStorage.removeItem('makhamChaCart');
  document.getElementById('phoneInput').value = '';
  document.getElementById('noteInput').value = '';
  document.getElementById('slipInput').value = '';
  document.getElementById('selectedFileText').textContent = '';
  document.getElementById('locationResult').classList.add('hidden');
  document.getElementById('successModal').classList.add('hidden');

  updateCartUI();
}

window.changeMenuQty = changeMenuQty;
window.addToCart = addToCart;
window.changeCartQty = changeCartQty;
window.removeCartItem = removeCartItem;