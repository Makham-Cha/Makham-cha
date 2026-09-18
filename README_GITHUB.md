# Makham CHA — GitHub Pages

เว็บไซต์เมนูสินค้าแบบกดทีละรายการสำหรับใช้กับ LINE OA Rich Menu

## สินค้า
1. มัทฉะ ลาเต้ — ธรรมดา 79 ฿ / Premium 99 ฿
2. มัทฉะโฟมมะพร้าว — 79 ฿
3. มัทฉะมะพร้าว — ธรรมดา 79 ฿ / Premium 99 ฿
4. Cold whisk — 79 ฿ / นมโอ๊ด 89 ฿
5. เพียวมัทฉะ — 79 ฿ / Premium 109 ฿

## วิธีใส่รูป
นำรูปจริงมาใส่ใน `images/` และตั้งชื่อ:
- `matcha-latte.jpg`
- `coconut-foam.jpg`
- `coconut-matcha.jpg`
- `cold-whisk.jpg`
- `pure-matcha.jpg`

ถ้าเป็น PNG ให้แก้ `.jpg` เป็น `.png` ใน `app.js`

## URL ที่ใช้กับ Rich Menu
หลังเปิด GitHub Pages แล้ว ตัวอย่างลิงก์จะเป็น:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?product=1`
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?product=2`
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?product=3`
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?product=4`
`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?product=5`

นำ URL ทั้ง 5 อันไปกำหนดให้พื้นที่กดทั้ง 5 ช่องของ LINE OA Rich Menu

## เปิด GitHub Pages
1. สร้าง Repository ใหม่บน GitHub
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
3. เข้า Settings → Pages
4. เลือก Deploy from a branch
5. เลือก branch `main` และ folder `/ (root)`
6. รอ GitHub สร้างเว็บไซต์ แล้วใช้ URL ที่ได้

GitHub Pages เป็น static hosting จึงเหมาะกับหน้าเมนู/สินค้าและรูปภาพ หากภายหลังต้องการระบบสั่งซื้อ ฐานข้อมูล สต็อก หรือชำระเงิน จะต้องเพิ่มบริการ backend/ฐานข้อมูลแยกต่างหาก
