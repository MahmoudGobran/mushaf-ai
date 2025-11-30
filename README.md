# 📖 المصحف الذكي V6.0 - دليل النشر

## 🎯 نظرة عامة

مشروع المصحف الذكي - نظام بحث ذكي في القرآن الكريم مع الذكاء الاصطناعي.

### ✅ الميزات:
- 🔍 بحث نصي دقيق (5-20ms)
- ⚡ بحث هجين ذكي (FAISS + Lexical)
- 📊 إحصائيات الكلمات والآيات
- 🎮 نظام اختبارات (Quiz) مع وضع الخبير
- 🚀 نتائج فورية مع Cache
- 📝 دعم كامل للرسم العثماني

---

## 📦 المتطلبات

### Backend:
- Python 3.11.7
- FastAPI
- SQLite
- FAISS (CPU version)
- NumPy

### Frontend:
- React + Vite
- Tailwind CSS

---

## 🚀 النشر على Render.com

### 1️⃣ الإعداد المحلي:

```bash
# استنساخ المشروع
git clone https://github.com/YOUR_USERNAME/mushaf-ai.git
cd mushaf-ai

# إعداد Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# اختبار محلي
python main.py
```

### 2️⃣ إعداد Git:

```bash
# التأكد من الملفات المطلوبة
git status

# يجب أن تكون هذه الملفات موجودة:
✅ backend/quran.db (2.36 MB)
✅ backend/quran_embeddings.npy (24 MB)
✅ backend/quran_faiss_index.bin (24 MB)
✅ backend/quran_ids.npy
✅ backend/word_stats_cache.json (35 MB)
✅ backend/mutashabihat_kalima.json
✅ backend/quran_data_arabic_juz.csv

# رفع على GitHub
git add .
git commit -m "Production ready - V6.0"
git push origin main
```

### 3️⃣ النشر على Render.com:

1. **إنشاء حساب** على [Render.com](https://render.com)

2. **New Web Service**:
   - Connect Repository: اختر مشروعك
   - Name: `mushaf-ai-backend`
   - Region: `Frankfurt` أو `Singapore`
   - Branch: `main`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command:
     ```bash
     pip install --upgrade pip && pip install -r requirements.txt
     ```
   - Start Command:
     ```bash
     python main.py
     ```

3. **Environment Variables**:
   ```
   PORT=10000
   PRODUCTION=true
   DATABASE_URL=sqlite:///./quran.db
   WORKERS=1
   ```

4. **Deploy** 🚀

---

## 📊 حجم المشروع

### Backend Files:
```
quran.db                    2.36 MB   ✅
quran_embeddings.npy       24.36 MB   ✅
quran_faiss_index.bin      24.36 MB   ✅
word_stats_cache.json      35.55 MB   ✅
similarity_cache.npy        varies    ✅
quran_ids.npy               ~1 KB     ✅
mutashabihat_kalima.json    ~500 KB   ✅
quran_data_arabic_juz.csv   ~2 MB     ✅
----------------------------------------
Total:                     ~90 MB     ✅ يناسب Render Free Tier
```

### ❌ تم تعطيله:
```
Model Cache:              2,157 MB    ❌ غير مطلوب
(Hugging Face Models)
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | منفذ الخادم |
| `HOST` | `0.0.0.0` | عنوان الخادم |
| `PRODUCTION` | `false` | وضع Production |
| `DATABASE_URL` | `sqlite:///./quran.db` | قاعدة البيانات |
| `ALLOWED_ORIGINS` | `localhost:5173` | CORS Origins |
| `WORKERS` | `1` | عدد Workers |

---

## 🧪 الاختبار المحلي

```bash
# Backend
cd backend
python main.py

# يجب أن ترى:
✅ قاعدة البيانات معبأة بالفعل
✅ تم تحميل المتجهات: (6236, 1024)
✅ تم تحميل الفهرس: 6236 vectors
✅ النظام جاهز! (بدون Model - توفير 2.1 GB)
⏰ زمن التهيئة: 0.03 ثانية

# Frontend (في terminal منفصل)
cd frontend
npm install
npm run dev
```

---

## 📈 الأداء

### بدون Model (Production):
- ✅ Startup: 2-5 ثواني
- ✅ Memory: ~200 MB
- ✅ البحث: 5-300ms
- ✅ جميع الميزات تعمل (عدا البحث الدلالي)

### مع Model (Development):
- ⚠️ Startup: 30-45 ثانية
- ⚠️ Memory: 2,200 MB
- ⚠️ لا يناسب Render Free Tier

---

## 🐛 Troubleshooting

### مشكلة: Port already in use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### مشكلة: ملفات الـ cache مفقودة
```bash
# إعادة بناء Cache
curl http://localhost:8000/admin/build-cache?cache_type=all

# إعادة بناء FTS index
curl http://localhost:8000/admin/build-fts
```

### مشكلة: Render deployment fails
1. تحقق من `requirements.txt` - يجب ألا يحتوي على `torch` أو `transformers`
2. تحقق من حجم الملفات - يجب ألا تتجاوز 100 MB للملف الواحد
3. تحقق من `runtime.txt` - يجب أن يحتوي على `python-3.11.7`

---

## 📞 الدعم

للمشاكل أو الاقتراحات:
- GitHub Issues: [رابط المشروع]
- Email: your.email@example.com

---

## 📝 License

هذا المشروع مرخص تحت MIT License.

---

## 🙏 شكر خاص

- القرآن الكريم - المصدر الأساسي
- FastAPI - Web Framework
- FAISS - Vector Search
- Render.com - Hosting Platform

---

**تم بناء المشروع بـ ❤️ من قبل محمود**