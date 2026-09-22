const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbyVNBG8xvw4ox7fWzv4JZhYxhIUgaKI4vewYSVZLi0NVN4c8CoexntwLUbLq-WZYbzorg/exec",
  LIFF_ID: "2011672004-mTPUoEBy"
};
let lineUserId = "";
async function initLiff(){
  const nameEl=document.getElementById("lineNameDisplay");
  if(!CONFIG.LIFF_ID || typeof liff === "undefined"){if(nameEl)nameEl.value="ลูกค้า LINE";return;}
  try{
    await liff.init({liffId:CONFIG.LIFF_ID});
    if(liff.isLoggedIn()){
      const p=await liff.getProfile();
      lineUserId=p.userId||"";
      if(nameEl)nameEl.value=p.displayName||"ลูกค้า LINE";
    }else if(nameEl){nameEl.value="กรุณาเปิดผ่าน LINE";}
  }catch(e){console.warn("LIFF init skipped",e);if(nameEl)nameEl.value="ลูกค้า LINE";}
}

const products = [
  {id:1,name:"มัทฉะ ลาเต้",image:"images/matcha-latte.jpg",options:[{label:"ธรรมดา",price:79},{label:"Premium",price:99}]},
  {id:2,name:"มัทฉะโฟมมะพร้าว",image:"images/coconut-foam.jpg",options:[{label:"มาตรฐาน",price:79}]},
  {id:3,name:"มัทฉะมะพร้าว",image:"images/coconut-matcha.jpg",options:[{label:"ธรรมดา",price:79},{label:"Premium",price:99}]},
  {id:4,name:"Cold whisk",image:"images/cold-whisk.jpg",options:[{label:"มาตรฐาน",price:79},{label:"นมโอ๊ต",price:89}]},
  {id:5,name:"เพียวมัทฉะ",image:"images/pure-matcha.jpg",options:[{label:"มาตรฐาน",price:79},{label:"Premium",price:109}]}
];

let cart = [];
let customerLocation = null;

const productEl = document.getElementById("product");
const menuEl = document.getElementById("menu");
const cartEl = document.getElementById("cart");
const totalEl = document.getElementById("grandTotal");

function esc(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function money(n){ return "฿"+Number(n).toLocaleString("th-TH"); }

function imageWithFallback(src,alt,extraClass=""){
  return `<img class="${extraClass}" src="${src}" alt="${esc(alt)}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
    <div class="image-placeholder" style="display:none"><div class="cup">🍵</div><div>ใส่รูปสินค้าในโฟลเดอร์ images</div></div>`;
}

function renderMenu(){
  menuEl.innerHTML=products.map(p=>`
    <button class="menu-item" onclick="showProduct(${p.id})" aria-label="เปิด ${esc(p.name)}">
      ${imageWithFallback(p.image,p.name)}
      <div class="menu-copy"><div class="menu-name">${esc(p.name)}</div>
      <div class="menu-price">${p.options.map(o=>esc(o.label)+" "+money(o.price)).join(" / ")}</div></div>
    </button>`).join("");
}

function showProduct(id,updateUrl=true){
  const p=products.find(x=>x.id===Number(id))||products[0];
  if(updateUrl) history.replaceState(null,"",`?product=${p.id}`);
  productEl.innerHTML=`
    <div class="product-image-wrap">${imageWithFallback(p.image,p.name,"product-image")}</div>
    <div class="product-info">
      <div class="product-no">รายการที่ ${p.id}</div><div class="product-name">${esc(p.name)}</div>
      <div class="price-list">${p.options.map((o,i)=>`<div class="price">${esc(o.label)} ${money(o.price)}</div>`).join("")}</div>
      <div class="actions product-actions"><button class="back-btn" onclick="scrollToMenu()">ดูเมนูทั้งหมด</button></div>
      <div class="add-panel">
        <div class="option-label">เลือกรูปแบบ</div>
        <select id="optionSelect" aria-label="เลือกตัวเลือก">${p.options.map((o,i)=>`<option value="${i}">${esc(o.label)} — ${money(o.price)}</option>`).join("")}</select>
        <div class="option-label">ระดับความหวาน</div>
        <div class="sweetness-options" role="group" aria-label="ระดับความหวาน">
          ${["หวานปกติ","หวานน้อย","ไม่หวาน"].map((sweet,i)=>`<label class="sweetness-option"><input type="checkbox" name="sweetness" value="${sweet}" ${i===0?"checked":""} onchange="selectSweetness(this)"><span>${sweet}</span></label>`).join("")}
        </div>
        <div class="add-row"><input id="optionQty" type="number" min="1" max="99" value="1" aria-label="จำนวน"><button class="add-btn" onclick="addToCart(${p.id})">เพิ่มลงตะกร้า</button></div>
      </div>
    </div>`;
  renderMenu();
}

function scrollToMenu(){ document.querySelector(".menu-section").scrollIntoView({behavior:"smooth"}); }

function selectSweetness(input){
  document.querySelectorAll('input[name="sweetness"]').forEach(x=>{if(x!==input)x.checked=false;});
  input.checked=true;
}
function currentSweetness(){const x=document.querySelector('input[name="sweetness"]:checked');return x?x.value:"หวานปกติ";}
function addToCart(productId){
  const p=products.find(x=>x.id===Number(productId));
  const optionIndex=Number(document.getElementById("optionSelect").value);
  const qty=Math.max(1,Math.min(99,Number(document.getElementById("optionQty").value)||1));
  const sweetness=currentSweetness();
  const key=productId+"-"+optionIndex+"-"+sweetness;
  const found=cart.find(x=>x.key===key);
  if(found) found.qty=Math.min(99,found.qty+qty);
  else cart.push({key,productId:p.id,optionIndex,qty,sweetness});
  renderCart();
  document.getElementById("order").scrollIntoView({behavior:"smooth",block:"center"});
}

function changeQty(key,delta){
  const item=cart.find(x=>x.key===key); if(!item)return;
  item.qty=Math.max(0,Math.min(99,item.qty+delta));
  if(item.qty===0) cart=cart.filter(x=>x.key!==key);
  renderCart();
}

function removeItem(key){ cart=cart.filter(x=>x.key!==key); renderCart(); }

function renderCart(){
  if(!cart.length){cartEl.innerHTML='<div class="empty-cart">ยังไม่มีสินค้าในตะกร้า เลือกเมนูด้านบนได้เลย</div>';totalEl.textContent=money(0);return;}
  let total=0;
  cartEl.innerHTML=cart.map(item=>{
    const p=products.find(x=>x.id===item.productId),o=p.options[item.optionIndex],line=o.price*item.qty; total+=line;
    return `<div class="cart-item"><div class="cart-main"><strong>${esc(p.name)}</strong><span>${esc(o.label)} · ${esc(item.sweetness||"หวานปกติ")} · ${money(o.price)}/แก้ว</span></div>
      <div class="qty"><button onclick="changeQty('${item.key}',-1)" aria-label="ลด">−</button><b>${item.qty}</b><button onclick="changeQty('${item.key}',1)" aria-label="เพิ่ม">+</button></div>
      <div class="line-total">${money(line)}</div><button class="remove-btn" onclick="removeItem('${item.key}')" aria-label="ลบ">×</button></div>`;
  }).join("");
  totalEl.textContent=money(total);
}

function getCustomerLocation(){
  const btn=document.getElementById("locationBtn"),status=document.getElementById("locationStatus");
  if(!navigator.geolocation){status.textContent="เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง";return;}
  btn.disabled=true;btn.textContent="กำลังระบุตำแหน่ง...";
  navigator.geolocation.getCurrentPosition(pos=>{
    customerLocation={lat:Number(pos.coords.latitude.toFixed(7)),lng:Number(pos.coords.longitude.toFixed(7))};
    status.innerHTML=`ระบุตำแหน่งแล้ว • ${customerLocation.lat}, ${customerLocation.lng}<br><a href="https://www.google.com/maps?q=${customerLocation.lat},${customerLocation.lng}" target="_blank" rel="noopener">เปิดดูบน Google Maps</a>`;
    btn.disabled=false;btn.textContent="อัปเดตตำแหน่ง";
  },err=>{
    const msg=err.code===1?"กรุณาอนุญาตการเข้าถึงตำแหน่ง":err.code===2?"ไม่สามารถระบุตำแหน่งได้":"การระบุตำแหน่งใช้เวลานานเกินไป";
    status.textContent=msg;btn.disabled=false;btn.textContent="ลองอีกครั้ง";
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}

function buildOrder(){
  const phone=document.getElementById("phone").value.trim();
  if(!phone)return {error:"กรุณากรอกเบอร์ติดต่อ"};
  if(!cart.length)return {error:"กรุณาเลือกสินค้าอย่างน้อย 1 รายการ"};
  const comment=document.getElementById("comment").value.trim();
  return {nickname:"",phone,comment,lineUserId,location:customerLocation,items:cart.map(x=>({productId:x.productId,optionIndex:x.optionIndex,qty:x.qty,sweetness:x.sweetness||"หวานปกติ"}))};
}

function orderText(){
  const o=buildOrder(); if(o.error)return o.error;
  const lines=["🍵 MAKHAM CHA — ออเดอร์","ชื่อ LINE: "+(o.nickname||"ลูกค้า LINE"),"เบอร์ติดต่อ: "+o.phone,""];
  let total=0;
  cart.forEach((x,i)=>{const p=products.find(a=>a.id===x.productId),op=p.options[x.optionIndex],line=op.price*x.qty;total+=line;lines.push((i+1)+". "+p.name+" ("+op.label+", "+(x.sweetness||"หวานปกติ")+") x"+x.qty+" = "+money(line));});
  if(o.comment)lines.push("","รายละเอียดเพิ่มเติม: "+o.comment);
  lines.push("","ยอดรวม: "+money(total),o.location?"พิกัด: "+o.location.lat+", "+o.location.lng:"พิกัด: ไม่ได้ระบุ");
  return lines.join("\n");
}

async function copyOrderText(){
  const text=orderText();
  if(text.startsWith("กรุณา")){alert(text);return;}
  try{await navigator.clipboard.writeText(text);alert("คัดลอกข้อความออเดอร์แล้ว");}
  catch(e){window.prompt("คัดลอกข้อความนี้",text);}
}
function submitOrder(){
  const order=buildOrder();
  if(order.error){alert(order.error);return;}
  const btn=document.querySelector(".order-btn");
  if(btn.disabled)return;
  btn.disabled=true;btn.textContent="กำลังส่งออเดอร์...";
  const iframeName="makhamOrderFrame_"+Date.now();
  const iframe=document.createElement("iframe");iframe.name=iframeName;iframe.style.display="none";document.body.appendChild(iframe);
  const form=document.createElement("form");form.method="POST";form.action=CONFIG.BACKEND_URL;form.target=iframeName;form.style.display="none";
  const input=document.createElement("input");input.name="payload";input.value=JSON.stringify(order);form.appendChild(input);document.body.appendChild(form);
  let completed=false;
  iframe.onload=()=>{if(completed)return;completed=true;setTimeout(()=>{form.remove();iframe.remove();},1000);
    alert("ส่งออเดอร์เรียบร้อยแล้ว\nระบบกำลังแจ้งรายละเอียดไปยัง LINE OA");
    cart=[];renderCart();btn.disabled=false;btn.textContent="ส่งออเดอร์ทาง LINE OA";
  };
  form.submit();
  setTimeout(()=>{if(!completed){completed=true;form.remove();iframe.remove();alert("ระบบรับคำสั่งซื้อแล้ว\nหากไม่ได้รับข้อความใน LINE OA ให้ตรวจสอบการตั้งค่า Backend");cart=[];renderCart();btn.disabled=false;btn.textContent="ส่งออเดอร์ทาง LINE OA";}},5000);
}

async function init(){
  await initLiff();
  const params=new URLSearchParams(location.search);
  const selected=params.get("product");
  if(selected) showProduct(Number(selected),false);
  else {
    productEl.innerHTML="";
    renderMenu();
  }
  renderCart();
}
init();
