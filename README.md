# Product Review Video Search System (ระบบค้นหาวิดีโอรีวิวสินค้า)

ระบบเว็บแอปพลิเคชันสำหรับค้นหาวิดีโอรีวิวสินค้าด้วย **ภาพถ่าย (Image Upload)** หรือ **ข้อความ (Text Search)** โดยรวบรวมคลิปรีวิวจากแหล่งวิดีโอหลักทั้ง **ฝั่งจีน 🇨🇳** (Bilibili, Douyin, Xiaohongshu, Kuaishou) และ **ฝั่งต่างประเทศ 🌐** (YouTube, TikTok, Instagram Reels, Amazon)

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **ค้นหาได้ทั้งข้อความและรูปภาพ (Text & Image Search)**
   - **Text Search**: ค้นหาด้วยชื่อสินค้า แบรนด์ หรือรุ่นภาษาไทย/อังกฤษ/จีน (มีคำค้นหายอดนิยมให้เลือกกดค้นหาทันที)
   - **Image Search**: Drag & Drop หรืออัพโหลดรูปภาพสินค้า -> AI Vision จะวิเคราะห์ลักษณะภาพและสกัด Tag สินค้า พร้อมแนะนำคำค้นหาและดึงวิดีโอรีวิวที่เกี่ยวข้องให้อัตโนมัติ

2. **ครอบคลุมแหล่งวิดีโอรีวิวทั้งจีนและต่างประเทศ (China & International Platforms)**
   - **ฝั่งจีน (China 🇨🇳)**: Bilibili (哔哩哔哩), Douyin (抖音), Xiaohongshu (小红书), Kuaishou (快手)
   - **ฝั่งต่างประเทศ (International 🌐)**: YouTube, TikTok, Instagram Reels

3. **ระบบกรองข้อมูลและจัดเรียงแบบเรียลไทม์ (Filters & Sorting)**
   - สลับดูเฉพาะวิดีโอรีวิวฝั่งจีน หรือต่างประเทศ หรือทั้งหมด
   - กรองตามแพลตฟอร์มรายตัว
   - กรองตามหมวดหมู่สินค้า (IT & สมาร์ทโฟน, เครื่องสำอาง & ความงาม, แฟชั่น & รองเท้า, เครื่องใช้ในบ้าน, ของเล่น & สะสม)
   - เรียงตามความแม่นยำ (Relevance Match Score), ยอดเข้าชมสูงสุด (Most Viewed), อัพโหลดล่าสุด (Newest)

4. **เครื่องมือเล่นวิดีโอตัวอย่างและระบบบันทึก (Modal Player & Bookmarks)**
   - Interactive Modal Player คลิกเล่นวิดีโอตัวอย่าง พร้อมรายละเอียดผู้รีวิว ยอดชม และปุ่มวิดีโอต้นทาง
   - ระบบบันทึกวิดีโอที่สนใจ (Bookmark System) เก็บไว้ในเครื่อง และสามารถส่งออกข้อมูลเป็นไฟล์ JSON ได้

---

## 🚀 วิธีการติดตั้งและรันใช้งาน (Getting Started)

### 1. การเปิดใช้งานผ่าน terminal
ไปยังไดเรกทอรีโครงการ:
```bash
cd C:\Users\MSI\.gemini\antigravity\scratch\product-review-video-search
```

### 2. รันแอปพลิเคชัน
รันคำสั่งเพียงคำสั่งเดียว ระบบจะติดตั้งพารามิเตอร์ที่จำเป็น (ถ้ามี) และเปิดเว็บบราวเซอร์ให้อัตโนมัติ:
```bash
python run.py
```

เข้าใช้งานได้ที่: `http://localhost:8000`

---

## 📁โครงสร้างโปรเจกต์ (Project Structure)

```
product-review-video-search/
├── backend/
│   ├── main.py                   # FastAPI REST Endpoints
│   ├── requirements.txt           # Dependency requirements
│   └── services/
│       ├── __init__.py
│       ├── video_aggregator.py    # Multi-platform search logic (China & Int)
│       ├── image_analyzer.py      # AI Image Vision & Tag Extraction
│       └── seed_dataset.py        # Curated catalog of video reviews
├── frontend/
│   ├── index.html                 # Main Single Page Application UI
│   ├── css/
│   │   └── styles.css             # Glassmorphic UI styles & badges
│   └── js/
│       ├── api.js                 # API Communication module
│       ├── google_sheets.js       # Google Sheets Database Connector
│       └── app.js                 # Main UI & search handler
├── run.py                         # One-click startup script
└── README.md                      # Documentation
```

---

## 📊 การใช้งาน Google Sheets เป็น Database

ระบบรองรับการใช้ Google Sheets เป็นระบบจัดการฐานข้อมูล (Headless CMS):
1. เปิดหน้าเว็บแล้วคลิกปุ่ม **"Google Database"** ที่มุมขวาบน
2. กด **"ดาวน์โหลดไฟล์ต้นแบบ (CSV)"** แล้วนำไป Import ใน Google Sheets ของคุณ
3. ตั้งค่าการแชร์ใน Google Sheets เป็น **"ทุกคนที่มีลิงก์สามารถดูได้" (Anyone with the link can view)**
4. คัดลอกลิงก์หรือ Sheet ID มาวางในช่องแล้วกด **"เชื่อมต่อและซิงค์"**
5. ข้อมูลวิดีโอ หมวดหมู่ และลิงก์ MP4 ในตาราง Google Sheets จะถูกดึงมาแสดงบนหน้าเว็บแบบเรียลไทม์ทันที!

---

## ⬇️ การดาวน์โหลดวิดีโอเป็นไฟล์ MP4

- ในแต่ละการ์ดวิดีโอและในหน้าต่าง Video Modal จะมีปุ่ม **"ดาวน์โหลด MP4" (⬇️)**
- เมื่อคลิก ระบบจะดึงไฟล์และบันทึกลงในเครื่องคอมพิวเตอร์ของคุณเป็นไฟล์ `.mp4` พร้อมตั้งชื่อตามชื่อคลิปวิดีโอโดยอัตโนมัติ

---

## 🌐 เปิดใช้งานผ่าน GitHub Pages

เว็บเปิดได้ที่: **https://krittatee2537.github.io/VIDEO-REVIEWER/**

บน GitHub Pages ไม่มี backend Python หน้าเว็บจะค้นหาและวิเคราะห์ภาพในเบราว์เซอร์เองด้วย `frontend/js/engine.js` และข้อมูลใน `frontend/js/data.js` (สร้างจาก `backend/services/seed_dataset.py`) รวมถึงสามารถซิงค์ดึงข้อมูลตรงจาก Google Sheets ได้โดยไม่ต้องมีเซิร์ฟเวอร์ และเมื่อรัน `python run.py` ในเครื่อง หน้าเว็บจะสลับไปใช้ backend FastAPI ให้อัตโนมัติ
