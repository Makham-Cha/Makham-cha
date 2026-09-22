const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbwI5kax0Ke21Nk-JsW-IaGOHulEZ1sMeliQWtKmtXM0Zy8ybqSP1zK6Pnn5y9_PGpyk/exec",
  LIFF_ID: "2011672004-mTPUoEBy"
};
let lineUserId = "";
let latestPayment = {orderId:"",paymentKey:"",total:0,submitted:false};
let pendingOrderFrame = null;
let pendingPaymentFrame = null;
window.addEventListener("message",event=>{
  const data=event.data;
  if(!data || typeof data !== "object")return;
  if(pendingOrderFrame && data.orderId && Object.prototype.hasOwnProperty.call(data,"paymentKey")){
    const frame=pendingOrderFrame;pendingOrderFrame=null;
    latestPayment={orderId:String(data.orderId),paymentKey:String(data.paymentKey||""),total:Number(data.total||0),submitted:false};
    const box=document.getElementById("paymentBox"),info=document.getElementById("paymentOrderInfo"),status=document.getElementById("paymentStatus");
    if(data.ok){
      if(info)info.textContent="Order "+latestPayment.orderId+" • ยอดชำระ "+money(latestPayment.total);
      if(box)box.hidden=false;
      if(status)status.textContent="ชำระเงินแล้ว กรุณาเลือกรูปสลิปด้านล่าง แล้วกด “ส่งสลิปให้ร้าน”";
    }else if(status){status.textContent="ไม่สามารถสร้างข้อมูลสำหรับแนบสลิปได้: "+(data.error||"เกิดข้อผิดพลาด");}
    setTimeout(()=>{if(frame)frame.remove();},300);
    return;
  }
  if(pendingPaymentFrame && Object.prototype.hasOwnProperty.call(data,"source") && data.source==="makham-cha-payment"){
    const frame=pendingPaymentFrame;pendingPaymentFrame=null;
    const status=document.getElementById("paymentStatus"),btn=document.getElementById("uploadSlipBtn"),file=document.getElementById("slipFile");
    if(data.ok){
      latestPayment.submitted=true;
      if(status)status.textContent="✅ ส่งสลิปเรียบร้อยแล้ว • ร้านจะตรวจสอบยอดเงินเข้าธนาคารก่อนจัดออเดอร์";
      if(btn)btn.disabled=true;
      if(file)file.disabled=true;
    }else if(status){status.textContent="❌ ส่งสลิปไม่สำเร็จ: "+(data.error||"กรุณาลองใหม่");}
    setTimeout(()=>{if(frame)frame.remove();},300);
  }
});
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
let shopConfig = {storeConfigured:false,storeLat:null,storeLng:null,shippingRates:[]};
let shopConfigLoaded = false;

const productEl = document.getElementById("product");
const menuEl = document.getElementById("menu");
const cartEl = document.getElementById("cart");
const totalEl = document.getElementById("grandTotal");

function esc(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function money(n){ return "฿"+Number(n).toLocaleString("th-TH"); }
function loadShopConfig(){
  return new Promise(resolve=>{
    const cb="makhamConfig_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    let done=false;
    const finish=ok=>{if(done)return;done=true;delete window[cb];script.remove();resolve(ok);};
    window[cb]=data=>{
      if(data&&data.ok){shopConfig=data;shopConfigLoaded=true;finish(true);}
      else {console.error("publicConfig error",data&&data.error);finish(false);}
    };
    script.src=CONFIG.BACKEND_URL+"?action=publicConfig&callback="+encodeURIComponent(cb)+"&_="+Date.now();
    script.onerror=()=>finish(false);
    document.head.appendChild(script);
    setTimeout(()=>finish(false),15000);
  });
}

function haversineMeters(lat1,lng1,lat2,lng2){
  const R=6371000,toRad=Math.PI/180,dLat=(lat2-lat1)*toRad,dLng=(lng2-lng1)*toRad;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function shippingEstimate(){
  if(!customerLocation||!shopConfig.storeConfigured)return {distanceMeters:null,fee:null};
  const distance=Math.round(haversineMeters(shopConfig.storeLat,shopConfig.storeLng,customerLocation.lat,customerLocation.lng));
  const rate=(shopConfig.shippingRates||[]).find(r=>distance<=Number(r.maxMeters));
  return {distanceMeters:distance,fee:rate?Number(rate.fee):null};
}
function applyShopStatus(){
  const status=document.getElementById("orderStatus"),btn=document.querySelector(".order-btn");
  if(!status)return;
  if(!shopConfigLoaded){status.className="order-status warning";status.textContent="🔴 ไม่สามารถโหลดการตั้งค่าพื้นที่จัดส่งจากเซิร์ฟเวอร์ได้ กรุณารีเฟรชหน้าเว็บ";if(btn)btn.disabled=true;return;}
  if(!shopConfig.storeConfigured){status.className="order-status warning";status.textContent="🟡 ร้านยังไม่ได้ตั้งค่าพิกัดสำหรับคำนวณค่าจัดส่ง";if(btn)btn.disabled=true;return;}
  status.className="order-status open";status.textContent="🟢 พร้อมรับออเดอร์";if(btn)btn.disabled=false;
}

function renderShippingSummary(){
  const feeEl=document.getElementById("shippingFee"),distanceEl=document.getElementById("shippingDistance");
  if(!feeEl||!distanceEl)return;
  const est=shippingEstimate();
  if(est.fee===null){feeEl.textContent="ยังไม่คำนวณ";distanceEl.textContent=customerLocation?"ไม่อยู่ในช่วงจัดส่ง / ตรวจสอบพื้นที่":"กรุณาแท็กโลเคชั่น";return;}
  feeEl.textContent=est.fee===0?"ฟรี":money(est.fee);
  distanceEl.textContent=est.distanceMeters.toLocaleString("th-TH")+" เมตร";
}

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
  if(!cart.length){cartEl.innerHTML='<div class="empty-cart">ยังไม่มีสินค้าในตะกร้า เลือกเมนูด้านบนได้เลย</div>';totalEl.textContent=money(0);renderShippingSummary();return;}
  let subtotal=0;
  cartEl.innerHTML=cart.map(item=>{
    const p=products.find(x=>x.id===item.productId),o=p.options[item.optionIndex],line=o.price*item.qty; subtotal+=line;
    return `<div class="cart-item"><div class="cart-main"><strong>${esc(p.name)}</strong><span>${esc(o.label)} · ${esc(item.sweetness||"หวานปกติ")} · ${money(o.price)}/แก้ว</span></div>
      <div class="qty"><button onclick="changeQty('${item.key}',-1)" aria-label="ลด">−</button><b>${item.qty}</b><button onclick="changeQty('${item.key}',1)" aria-label="เพิ่ม">+</button></div>
      <div class="line-total">${money(line)}</div><button class="remove-btn" onclick="removeItem('${item.key}')" aria-label="ลบ">×</button></div>`;
  }).join("");
  const est=shippingEstimate(),grand=est.fee===null?subtotal:subtotal+est.fee;
  totalEl.textContent=money(grand);
  const subtotalEl=document.getElementById("subtotal");if(subtotalEl)subtotalEl.textContent=money(subtotal);
  renderShippingSummary();
}

function getCustomerLocation(){
  const btn=document.getElementById("locationBtn"),status=document.getElementById("locationStatus");
  if(!navigator.geolocation){status.textContent="เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง";return;}
  btn.disabled=true;btn.textContent="กำลังระบุตำแหน่ง...";
  navigator.geolocation.getCurrentPosition(pos=>{
    customerLocation={lat:Number(pos.coords.latitude.toFixed(7)),lng:Number(pos.coords.longitude.toFixed(7))};
    status.innerHTML=`ระบุตำแหน่งแล้ว • ${customerLocation.lat}, ${customerLocation.lng}<br><a href="https://www.google.com/maps?q=${customerLocation.lat},${customerLocation.lng}" target="_blank" rel="noopener">เปิดดูบน Google Maps</a>`;
    btn.disabled=false;btn.textContent="อัปเดตตำแหน่ง";
    renderCart();
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
  let subtotal=0;
  cart.forEach((x,i)=>{const p=products.find(a=>a.id===x.productId),op=p.options[x.optionIndex],line=op.price*x.qty;subtotal+=line;lines.push((i+1)+". "+p.name+" ("+op.label+", "+(x.sweetness||"หวานปกติ")+") x"+x.qty+" = "+money(line));});
  const est=shippingEstimate();
  if(o.comment)lines.push("","รายละเอียดเพิ่มเติม: "+o.comment);
  lines.push("","ค่าสินค้า: "+money(subtotal),"ค่าจัดส่ง: "+(est.fee===0?"ฟรี":est.fee===null?"ยังไม่คำนวณ":money(est.fee)),"ยอดชำระทั้งหมด: "+money(est.fee===null?subtotal:subtotal+est.fee),o.location?"พิกัด: "+o.location.lat+", "+o.location.lng:"พิกัด: ไม่ได้ระบุ");
  return lines.join("\n");
}

async function copyOrderText(){
  const text=orderText();
  if(text.startsWith("กรุณา")){alert(text);return;}
  try{await navigator.clipboard.writeText(text);alert("คัดลอกข้อความออเดอร์แล้ว");}
  catch(e){window.prompt("คัดลอกข้อความนี้",text);}
}
function submitOrder(){
  if(!shopConfigLoaded){alert("กำลังตรวจสอบสถานะร้าน กรุณารอสักครู่แล้วลองใหม่ครับ");return;}
  const order=buildOrder();
  if(order.error){alert(order.error);return;}
  const est=shippingEstimate();
  if(est.fee===null){alert(customerLocation?"ตำแหน่งนี้อยู่นอกพื้นที่จัดส่งของร้านครับ":"กรุณากด “แท็กโลเคชั่น” เพื่อระบุตำแหน่งจัดส่งก่อนสั่งซื้อ");return;}
  const btn=document.querySelector(".order-btn");
  if(btn.disabled)return;
  btn.disabled=true;btn.textContent="กำลังส่งออเดอร์...";
  const iframeName="makhamOrderFrame_"+Date.now();
  const iframe=document.createElement("iframe");iframe.name=iframeName;iframe.style.display="none";document.body.appendChild(iframe);
  const form=document.createElement("form");form.method="POST";form.action=CONFIG.BACKEND_URL;form.target=iframeName;form.style.display="none";
  const input=document.createElement("input");input.name="payload";input.value=JSON.stringify(order);form.appendChild(input);document.body.appendChild(form);
  pendingOrderFrame=iframe;
  form.submit();
  setTimeout(()=>{if(pendingOrderFrame===iframe){pendingOrderFrame=null;iframe.remove();form.remove();alert("ระบบยังไม่ได้รับคำตอบจากเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่ครับ");}btn.disabled=false;btn.textContent="ส่งออเดอร์ทาง LINE OA";},10000);
  cart=[];renderCart();
}
function previewSlip(input){
  const file=input.files&&input.files[0],preview=document.getElementById("slipPreview"),btn=document.getElementById("uploadSlipBtn"),status=document.getElementById("paymentStatus");
  if(!file){if(preview)preview.hidden=true;if(btn)btn.disabled=true;if(status)status.textContent="ยังไม่ได้แนบสลิป";return;}
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){input.value="";if(preview)preview.hidden=true;if(btn)btn.disabled=true;if(status)status.textContent="กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP";return;}
  if(file.size>4*1024*1024){input.value="";if(preview)preview.hidden=true;if(btn)btn.disabled=true;if(status)status.textContent="ไฟล์ใหญ่เกิน 4 MB กรุณาเลือกรูปที่เล็กลง";return;}
  const reader=new FileReader();reader.onload=()=>{if(preview){preview.src=reader.result;preview.hidden=false;}if(btn)btn.disabled=false;if(status)status.textContent="✅ แนบสลิปแล้ว • กด “ส่ง” เพื่อส่งให้ร้าน";};reader.readAsDataURL(file);
}
function uploadSlip(){
  if(latestPayment.submitted)return;
  if(!latestPayment.orderId||!latestPayment.paymentKey){alert("ยังไม่พบข้อมูลออเดอร์ กรุณาส่งออเดอร์ก่อน");return;}
  const input=document.getElementById("slipFile"),file=input&&input.files&&input.files[0],btn=document.getElementById("uploadSlipBtn"),status=document.getElementById("paymentStatus");
  if(!file){alert("กรุณาเลือกรูปสลิปก่อนกดส่ง");return;}
  btn.disabled=true;if(status)status.textContent="กำลังส่งสลิป...";
  const reader=new FileReader();reader.onload=()=>{
    const iframeName="makhamPaymentFrame_"+Date.now(),iframe=document.createElement("iframe");iframe.name=iframeName;iframe.style.display="none";document.body.appendChild(iframe);
    const form=document.createElement("form");form.method="POST";form.action=CONFIG.BACKEND_URL;form.target=iframeName;form.style.display="none";
    const payload={orderId:latestPayment.orderId,key:latestPayment.paymentKey,imageData:String(reader.result||"")};
    const inputEl=document.createElement("input");inputEl.name="slipPayload";inputEl.value=JSON.stringify(payload);form.appendChild(inputEl);document.body.appendChild(form);
    pendingPaymentFrame=iframe;form.submit();
    setTimeout(()=>{if(pendingPaymentFrame===iframe){pendingPaymentFrame=null;if(status)status.textContent="ยังไม่ได้รับผลตอบกลับจากระบบ กรุณาลองอีกครั้ง";btn.disabled=false;}iframe.remove();form.remove();},10000);
  };reader.readAsDataURL(file);
}

async function init(){
  await initLiff();
  await loadShopConfig();
  applyShopStatus();
  renderShippingSummary();
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
