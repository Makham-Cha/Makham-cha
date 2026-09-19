const products = [
  {
    id: 1,
    name: "มัทฉะ ลาเต้",
    image: "images/matcha-latte.jpg",
    prices: ["ธรรมดา 79 ฿", "Premium 99 ฿"]
  },
  {
    id: 2,
    name: "มัทฉะโฟมมะพร้าว",
    image: "images/coconut-foam.jpg",
    prices: ["79 ฿"]
  },
  {
    id: 3,
    name: "มัทฉะมะพร้าว",
    image: "images/coconut-matcha.jpg",
    prices: ["ธรรมดา 79 ฿", "Premium 99 ฿"]
  },
  {
    id: 4,
    name: "Cold whisk",
    image: "images/cold-whisk.jpg",
    prices: ["79 ฿", "นมโอ๊ด 89 ฿"]
  },
  {
    id: 5,
    name: "เพียวมัทฉะ",
    image: "images/pure-matcha.jpg",
    prices: ["79 ฿", "Premium 109 ฿"]
  }
];

const productEl = document.getElementById("product");
const menuEl = document.getElementById("menu");

function esc(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function imageWithFallback(src, alt, extraClass=""){
  return `<img class="${extraClass}" src="${src}" alt="${esc(alt)}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
    <div class="image-placeholder" style="display:none">
      <div class="cup">🍵</div><div>ใส่รูปสินค้าในโฟลเดอร์ images</div>
    </div>`;
}

function renderMenu(activeId){
  menuEl.innerHTML = products.map(p => `
    <button class="menu-item" onclick="showProduct(${p.id})" aria-label="เปิด ${esc(p.name)}">
      ${imageWithFallback(p.image,p.name)}
      <div class="menu-copy">
        <div class="menu-name">${esc(p.name)}</div>
        <div class="menu-price">${p.prices.map(esc).join(" / ")}</div>
      </div>
    </button>
  `).join("");
}

function showProduct(id, updateUrl=true){
  const p = products.find(x => x.id === Number(id)) || products[0];
  if(updateUrl) history.replaceState(null,"",`?product=${p.id}`);
  productEl.innerHTML = `
    <div class="product-image-wrap">
      ${imageWithFallback(p.image,p.name,"product-image")}
    </div>
    <div class="product-info">
      <div class="product-no">รายการที่ ${p.id}</div>
      <div class="product-name">${esc(p.name)}</div>
      <div class="price-list">
        ${p.prices.map(x => `<div class="price">${esc(x)}</div>`).join("")}
      </div>
      <div class="actions">
        <button class="back-btn" onclick="scrollToMenu()">ดูเมนูทั้งหมด</button>
        <a class="line-btn" href="https://line.me/" target="_blank" rel="noopener">LINE OA</a>
      </div>
    </div>`;
  renderMenu(p.id);
  window.scrollTo({top:0,behavior:"smooth"});
}

function scrollToMenu(){
  document.querySelector(".menu-section").scrollIntoView({behavior:"smooth"});
}

const params = new URLSearchParams(location.search);
showProduct(Number(params.get("product")) || 1, false);
