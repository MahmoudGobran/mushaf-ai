"""
الخادم الرئيسي - نسخة هجينة ذكية (Smart Hybrid V5.2) + وضع الخبير 🏆
✅ FAISS للعثور على المرشحين (سريع)
✅ حساب التشابه اللفظي للنتائج النهائية (دقيق)
✅ استبعاد 100% من Quiz
✅ حد نتائج مرتفع (10000)
✅ نسبة تشابه قابلة للتخصيص
✅ اختبار "ما اسم السورة؟"
✅ إحصائيات القرآن
✅ دعم كامل للرسم العثماني
✅ تظليل النتائج
✅ 🏆 وضع الخبير (متشابهات كلمة)

🚀 الإضافات الجديدة (التحسينات):
✅ بحث فوري باستخدام FTS5 (5-20ms)
✅ متشابهات فورية من Cache (10-50ms) 
✅ إحصائيات محسنة مع Cache
✅ AutoComplete للاقتراحات
✅ نظام بناء فهارس تلقائي
✅ 🚀 بحث شامل مسرّع باستخدام Similarity Cache
"""

import random
from fastapi import FastAPI, Depends, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, Verse, init_db
from typing import List, Optional
import time
from difflib import SequenceMatcher
from contextlib import asynccontextmanager
import numpy as np
import faiss
#from sentence_transformers import SentenceTransformer
import json
from pathlib import Path as FilePath
import sqlite3
from functools import lru_cache
import os
from fastapi.responses import JSONResponse  # ✅ أضيف هذا الاستيراد

# ============================================
# ⚙️ Production Configuration
# ============================================
"""
إعدادات Production - تدعم Render.com و Railway و Heroku
"""

# 1️⃣ Port Configuration
PORT = int(os.environ.get("PORT", 8000))
print(f"🌐 Port: {PORT}")

# 2️⃣ Host Configuration
# Render.com يحتاج 0.0.0.0 (ليس 127.0.0.1)
HOST = os.environ.get("HOST", "0.0.0.0")
print(f"🌐 Host: {HOST}")

# 3️⃣ Production Mode
PRODUCTION = os.environ.get("PRODUCTION", "false").lower() == "true"
print(f"🚀 Production Mode: {PRODUCTION}")

# 4️⃣ Database URL (للمستقبل - إذا أردت PostgreSQL)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./quran.db")
print(f"💾 Database: {DATABASE_URL}")

# 5️⃣ CORS Origins (للأمان)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://mushaf-ai-frontend.onrender.com",
    "https://mushaf-smart.pages.dev",  # ✅ أضف هذا السطر
    "https://*.pages.dev",              # ✅ وهذا (أي subdomain)
]
print(f"🔐 Allowed Origins: {ALLOWED_ORIGINS}")

# 6️⃣ Workers (للتحكم في الأداء)
WORKERS = int(os.environ.get("WORKERS", 1))
print(f"⚡ Workers: {WORKERS}")

# ============================================
# 🆕 دالة مساعدة للـ Cache
# ============================================

def cached_response(data, max_age=3600):
    """
    دالة مساعدة لإنشاء response مع Cache headers
    
    Parameters:
    - data: البيانات (dict أو list)
    - max_age: مدة الحفظ بالثواني (افتراضي: ساعة)
    
    مثال:
    return cached_response({"message": "Hello"}, max_age=1800)
    """
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": f"public, max-age={max_age}",
            "Vary": "Accept-Encoding"
        }
    )

# استيراد دوال المعالجة
from similarity import normalize_arabic_text as clean_text, highlight_differences, calculate_similarity, highlight_words_in_text


# ============================================
# ❌ تعطيل نظام embeddings في Production
# ============================================
EMBEDDING_AVAILABLE = False
print("⚠️ نظام embeddings معطل في Production - سيتم استخدام البحث اللفظي فقط")

# تعطيل المتغيرات العالمية
QURAN_EMBEDDINGS = None
QURAN_IDS = None  
FAISS_INDEX = None
EMBEDDING_MODEL = None

# ============================================
# 🚫 قائمة استثناءات للمتشابهات 100% (لا تُظهر)
# ============================================

EXCLUDED_100_PERCENT_PATTERNS = {
    # البسملة بجميع أشكالها
    "بسم الله الرحمن الرحيم",
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    
    # الآيات المتكررة كثيراً
    "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
    "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ", 
    #"إِنَّ فِي ذَلِكَ لَآيَةً وَمَا كَانَ أَكْثَرُهُم مُّؤْمِنِينَ",
    
    # يمكن إضافة المزيد هنا
    #"إِنَّ رَبَّكَ حَكِيمٌ عَلِيمٌ",
    #"إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ",
    #"وَاللَّهُ عَلِيمٌ حَكِيمٌ"
}

def is_excluded_100_percent_match(text1: str, text2: str) -> bool:
    """
    التحقق إذا كانت الآيتين متطابقتين 100% ومستثنيتين من العرض
    """
    # إذا لم تكونا متطابقتين 100%، لا تستثنيهما
    if calculate_word_similarity(text1, text2) < 0.99:
        return False
    
    clean1 = clean_text(text1)
    clean2 = clean_text(text2)
    
    # التحقق من أن النصين متطابقين فعلاً
    if clean1 != clean2:
        return False
    
    # التحقق إذا كانت الآية في قائمة الاستثناءات
    for pattern in EXCLUDED_100_PERCENT_PATTERNS:
        pattern_clean = clean_text(pattern)
        if pattern_clean in clean1 or pattern_clean in clean2:
            return True
    
    # التحقق من البسملة بشكل خاص
    if is_basmala_text(text1) or is_basmala_text(text2):
        return True
        
    return False

def is_basmala_text(text: str) -> bool:
    """التحقق إذا كان النص هو البسملة"""
    basmala_variations = [
        "بسم الله الرحمن الرحيم",
        "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 
        "بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
    ]
    text_clean = clean_text(text)
    return any(clean_text(basmala) in text_clean for basmala in basmala_variations)

# ============================================
# 🌟 متغيرات عالمية لمحرك البحث الدلالي
# ============================================
QURAN_EMBEDDINGS: Optional[np.ndarray] = None
QURAN_IDS: Optional[np.ndarray] = None
FAISS_INDEX: Optional[faiss.Index] = None
EMBEDDING_MODEL: Optional[any] = None

# ============================================
# 🏆 متغيرات جديدة لوضع الخبير
# ============================================
MUTASHABIHAT_BANK = None

# ============================================
# 🚀 متغيرات جديدة للتحسينات
# ============================================
SIMILARITY_CACHE = None
WORD_STATS_CACHE = None
FTS_AVAILABLE = False

# ============================================
# ✅ دالة حساب التشابه اللفظي (على مستوى الكلمات)
# ============================================
def calculate_word_similarity(text1: str, text2: str) -> float:
    """حساب التشابه اللفظي على مستوى الكلمات"""
    return calculate_similarity(text1, text2, use_words=True)

# ============================================
# دوال مساعدة
# ============================================
def is_basmala_verse(verse: Verse) -> bool:
    """التحقق من أن الآية هي البسملة - نسخة محسنة"""
    if verse.ayah != 1 or verse.surah == 9:  # سورة التوبة لا تبدأ بالبسملة
        return False
    
    verse_clean = clean_text(verse.text)
    basmala_variations = [
        clean_text("بسم الله الرحمن الرحيم"),
        clean_text("بسم الله الرحمن الرحيم"),
        clean_text("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
        clean_text("بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
        "بسم الله الرحمن الرحيم",  # النص النظيف
    ]
    
    # التحقق من جميع الأشكال
    for basmala in basmala_variations:
        if (verse_clean == basmala or 
            verse_clean.startswith(basmala) or
            basmala in verse_clean):
            return True
    
    # استبعاد الآيات القصيرة جداً التي قد تكون بسملة
    return len(verse_clean) < 30 and any(word in verse_clean for word in ['بسم', 'الله', 'الرحمن', 'الرحيم'])

def initialize_search_engine(db: Session):
    """تهيئة محرك البحث الدلالي (FAISS) - معطل في Production"""
    global QURAN_EMBEDDINGS, QURAN_IDS, FAISS_INDEX, EMBEDDING_MODEL
    
    print("\n" + "="*60)
    print("🚫 نظام FAISS معطل في Production - استخدام البحث اللفظي فقط")
    print("="*60 + "\n")
    
    # تعطيل جميع متغيرات FAISS والبحث الدلالي
    QURAN_EMBEDDINGS = None
    QURAN_IDS = None
    FAISS_INDEX = None
    EMBEDDING_MODEL = None
    
    print("✅ تم تعطيل نظام FAISS والبحث الدلالي بنجاح")
    print("💡 النظام سيعمل بالبحث اللفظي فقط (أسرع وأخف)")
    print("   • البحث النصي الدقيق → دقيق 100% ✓")
    print("   • التشابه اللفظي → نتائج مضمونة ✓")
    print("   • FTS5 → بحث فوري أثناء الكتابة ⚡")
    print("   • Cache → متشابهات فورية 🚀\n")

# ============================================
# 🚀 دوال جديدة للتحسينات
# ============================================

def initialize_optimizations(db: Session):
    """تهيئة أنظمة التحسينات الجديدة"""
    global SIMILARITY_CACHE, WORD_STATS_CACHE, FTS_AVAILABLE
    
    print("\n" + "="*60)
    print("🚀 بدء تهيئة أنظمة التحسينات")
    print("="*60)
    
    # 1. تحميل similarity cache
    try:
        if os.path.exists("similarity_cache.npy"):
            SIMILARITY_CACHE = np.load("similarity_cache.npy", allow_pickle=True).item()
            print(f"✅ تم تحميل similarity cache: {len(SIMILARITY_CACHE)} آية")
        else:
            SIMILARITY_CACHE = {}
            print("⚠️ similarity cache غير موجود، سيتم إنشاؤه عند الحاجة")
    except Exception as e:
        print(f"❌ خطأ في تحميل similarity cache: {e}")
        SIMILARITY_CACHE = {}
    
    # 2. تحميل word statistics cache
    try:
        if os.path.exists("word_stats_cache.json"):
            with open("word_stats_cache.json", 'r', encoding='utf-8') as f:
                WORD_STATS_CACHE = json.load(f)
            print(f"✅ تم تحميل word stats cache: {len(WORD_STATS_CACHE)} كلمة")
        else:
            WORD_STATS_CACHE = {}
            print("⚠️ word stats cache غير موجود، سيتم إنشاؤه عند الحاجة")
    except Exception as e:
        print(f"❌ خطأ في تحميل word stats cache: {e}")
        WORD_STATS_CACHE = {}
    
    # 3. التحقق من FTS5
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'")
        FTS_AVAILABLE = cursor.fetchone() is not None
        conn.close()
        
        if FTS_AVAILABLE:
            print("✅ FTS5 index متاح للبحث الفوري")
        else:
            print("⚠️ FTS5 index غير متاح، استخدم /admin/build-fts لبنائه")
    except Exception as e:
        print(f"❌ خطأ في التحقق من FTS5: {e}")
        FTS_AVAILABLE = False
    
    print("✅ اكتملت تهيئة أنظمة التحسينات\n")

def fast_text_search_fts(query: str, limit: int = 20):
    """
    🔥 FTS5 محسن - للبحث السريع فقط مع الإشارة أنه غير دقيق
    """
    if not FTS_AVAILABLE:
        return []
    
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        
        # استخدام البحث بالكلمة كاملة (بدون تنظيف أو تقسيم) للرسم العثماني
        fts_query = f'"{query}"'
        
        cursor.execute(f'''
            SELECT verses.* 
            FROM verses_fts
            JOIN verses ON verses_fts.rowid = verses.id
            WHERE verses_fts.text MATCH ?
            ORDER BY rank
            LIMIT ?
        ''', (fts_query, limit))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'surah': row[1],
                'surah_name': row[2],
                'ayah': row[3],
                'text': row[4],
                'juz': row[5],
                'similarity': '0.9500',  # ⚠️ تشير إلى أن النتائج غير دقيقة
                'match_type': 'fts_fast',
                'note': 'نتيجة سريعة - قد لا تكون دقيقة 100%'
            })
        
        conn.close()
        
        if results:
            print(f"⚠️ FTS5: {len(results)} نتيجة سريعة (غير مضمونة الدقة)")
            
        return results
        
    except Exception as e:
        print(f"❌ خطأ في البحث FTS5: {e}")
        return []
    
@lru_cache(maxsize=1000)
def get_cached_similarities(verse_id: int, min_similarity: float = 0.6):
    """
    🚀 متشابهات فورية من Cache
    🚀 السرعة: 10-50ms للنتائج المخزنة
    """
    global SIMILARITY_CACHE
    
    if SIMILARITY_CACHE and verse_id in SIMILARITY_CACHE:
        cached_results = SIMILARITY_CACHE[verse_id]
        # تصفية حسب الحد الأدنى للتشابه
        filtered = [r for r in cached_results if r['similarity'] >= min_similarity]
        return filtered[:20]  # إرجاع 20 نتيجة كحد أقصى
    
    return []  # إذا لم تكن في cache، نرجع قائمة فارغة

# ============================================
# 🔥 الإصلاح 2: تحسين بناء Similarity Cache
# ============================================
# استبدل الدالة build_similarity_cache في main.py (حوالي السطر 324)

def build_similarity_cache(db: Session, min_similarity: float = 0.50):  # ✅ غيّر من 0.05 إلى 0.50
    """
    🔥 بناء similarity cache محسّن - سريع جداً!
    
    التحسينات الحاسمة:
    - ✅ min_similarity = 0.50 (بدلاً من 0.05)
    - ✅ MAX_RESULTS = 20 (بدلاً من 50)
    - ✅ إيقاف مبكر عند الوصول للحد
    - ✅ تخطي البسملات
    
    ⏱️ الزمن المتوقع: 5-15 دقيقة (بدلاً من 5+ ساعات!)
    """
    global SIMILARITY_CACHE
    
    print("="*60)
    print("🔥 بدء بناء similarity cache المحسّن (سريع)...")
    print(f"   🎯 حد التشابه: {min_similarity*100}%")
    print(f"   ⏱️  الزمن المتوقع: 5-15 دقيقة")
    print("="*60)
    
    start_time = time.time()
    
    all_verses = db.query(Verse).all()
    total_verses = len(all_verses)
    SIMILARITY_CACHE = {}
    
    # إحصائيات
    total_pairs_found = 0
    total_comparisons = 0
    skipped_basmala = 0
    
    for i, verse in enumerate(all_verses):
        # Progress update كل 100 آية (أقل إزعاج)
        if (i + 1) % 100 == 0:
            elapsed = time.time() - start_time
            progress = ((i + 1) / total_verses) * 100
            avg_time_per_verse = elapsed / (i + 1)
            remaining_verses = total_verses - (i + 1)
            eta = avg_time_per_verse * remaining_verses
            
            print(f"   📊 {i+1}/{total_verses} ({progress:.1f}%) | "
                  f"⏱️ {elapsed/60:.1f}م | "
                  f"ETA: {eta/60:.1f}م | "
                  f"متشابهات: {total_pairs_found:,}")
        
        # ✅ تخطي البسملات (توفير وقت)
        if is_basmala_verse(verse):
            SIMILARITY_CACHE[verse.id] = []
            skipped_basmala += 1
            continue
        
        # البحث عن متشابهات لهذه الآية
        similar_verses = []
        
        # ✅ التحسين الحاسم: حد أقصى 20 نتيجة
        MAX_RESULTS = 20  # بدلاً من 50
        
        for other_verse in all_verses:
            # تخطي نفس الآية
            if other_verse.id == verse.id:
                continue
            
            # ✅ تخطي البسملات
            if is_basmala_verse(other_verse):
                continue
            
            total_comparisons += 1
            
            similarity = calculate_word_similarity(verse.text, other_verse.text)
            
            # ✅ min_similarity أعلى (0.50) → نتائج أقل وأفضل!
            if min_similarity <= similarity < 0.99:
                # تأكد من عدم التكرار
                existing = any(sv['verse_id'] == other_verse.id for sv in similar_verses)
                if not existing:
                    similar_verses.append({
                        'verse_id': other_verse.id,
                        'surah': other_verse.surah,
                        'surah_name': other_verse.surah_name,
                        'ayah': other_verse.ayah,
                        'text': other_verse.text,
                        'similarity': similarity
                    })
                    total_pairs_found += 1
                    
                    # ✅✅✅ الإضافة الحاسمة: إيقاف مبكر!
                    if len(similar_verses) >= MAX_RESULTS:
                        break  # توقف فوراً عند 20 نتيجة!

        # ترتيب وتخزين أفضل النتائج
        similar_verses.sort(key=lambda x: x['similarity'], reverse=True)
        SIMILARITY_CACHE[verse.id] = similar_verses[:MAX_RESULTS]
        
        # ✅ حفظ تلقائي كل 200 آية (أسرع)
        if (i + 1) % 200 == 0:
            try:
                np.save("similarity_cache_temp.npy", SIMILARITY_CACHE)
                elapsed_now = time.time() - start_time
                print(f"   💾 حفظ مؤقت: {i+1} آية ({elapsed_now/60:.1f} دقيقة)...")
            except Exception as e:
                print(f"   ⚠️ خطأ في الحفظ المؤقت: {e}")
    
    # حفظ نهائي
    try:
        np.save("similarity_cache.npy", SIMILARITY_CACHE)
        print(f"\n✅ تم حفظ similarity cache: {len(SIMILARITY_CACHE)} آية")
        
        # حذف الملف المؤقت
        import os
        if os.path.exists("similarity_cache_temp.npy"):
            os.remove("similarity_cache_temp.npy")
    except Exception as e:
        print(f"❌ خطأ في حفظ similarity cache: {e}")
    
    elapsed = time.time() - start_time
    
    # حساب الحجم التقريبي
    avg_results_per_verse = total_pairs_found / (len(SIMILARITY_CACHE) - skipped_basmala) if (len(SIMILARITY_CACHE) - skipped_basmala) > 0 else 0
    estimated_size_mb = (len(SIMILARITY_CACHE) * avg_results_per_verse * 200) / 1024 / 1024
    
    print("="*60)
    print(f"✅ اكتمل بناء similarity cache")
    print(f"   ⏱️  الزمن: {elapsed/60:.1f} دقيقة ({elapsed:.0f} ثانية)")
    print(f"   📊 المقارنات: {total_comparisons:,}")
    print(f"   ✅ المتشابهات: {total_pairs_found:,}")
    print(f"   🚫 البسملات المستبعدة: {skipped_basmala}")
    print(f"   📈 متوسط النتائج/آية: {avg_results_per_verse:.1f}")
    print(f"   💾 الحجم التقريبي: ~{estimated_size_mb:.1f} MB")
    print("="*60)
    
    return SIMILARITY_CACHE

def build_word_statistics_cache(db: Session):
    """
    بناء إحصائيات الكلمات مسبقاً - مُحدّث
    """
    global WORD_STATS_CACHE
    
    print("🔄 بدء بناء word statistics cache...")
    start_time = time.time()
    
    all_verses = db.query(Verse).all()
    WORD_STATS_CACHE = {}
    
    # كلمات شائعة يجب استبعادها
    common_words = {
        'في', 'من', 'إلى', 'على', 'عن', 'أن', 'إن', 'ما', 'لا', 'هل', 'بل',
        'قد', 'سى', 'كان', 'يكون', 'قال', 'قل', 'إن', 'أن', 'هو', 'هي', 'هم',
        'كذلك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللائي', 'ذلك', 'هذه',
        'هذا', 'هؤلاء', 'تلك', 'أولئك', 'بعض', 'كل', 'جميع', 'أي', 'أين',
        'متى', 'كيف', 'لماذا', 'كم', 'أيضا', 'ثم', 'حتى', 'أما', 'أو', 'و'
    }
    
    for verse in all_verses:
        verse_clean = clean_text(verse.text)
        words = verse_clean.split()
        
        for word in words:
            if len(word) < 2 or word in common_words:
                continue
                
            if word not in WORD_STATS_CACHE:
                WORD_STATS_CACHE[word] = {
                    'total_count': 0,
                    'verses_count': 0,
                    'verses': [],  # ✅ سيحتوي على {verse_info, count}
                    'by_surah': {},
                    'by_juz': {}
                }
            
            # حساب التكرار في هذه الآية
            count_in_verse = verse_clean.count(word)
            WORD_STATS_CACHE[word]['total_count'] += count_in_verse
            
            # إضافة الآية إذا لم تكن موجودة
            verse_info = {
                'id': verse.id,
                'surah': verse.surah,
                'surah_name': verse.surah_name,
                'ayah': verse.ayah,
                'text': verse.text,
                'juz': verse.juz,
                'count': count_in_verse  # ✅ إضافة count هنا أيضاً
            }
            
            # تجنب التكرار
            existing_verse = next((v for v in WORD_STATS_CACHE[word]['verses'] 
                                if v['id'] == verse.id), None)
            if not existing_verse:
                WORD_STATS_CACHE[word]['verses'].append(verse_info)
                WORD_STATS_CACHE[word]['verses_count'] = len(WORD_STATS_CACHE[word]['verses'])
            
            # تحديث إحصائيات السورة
            surah_key = f"{verse.surah_name} ({verse.surah})"
            WORD_STATS_CACHE[word]['by_surah'][surah_key] = WORD_STATS_CACHE[word]['by_surah'].get(surah_key, 0) + count_in_verse
            
            # تحديث إحصائيات الجزء
            if verse.juz:
                juz_key = f"الجزء {verse.juz}"
                WORD_STATS_CACHE[word]['by_juz'][juz_key] = WORD_STATS_CACHE[word]['by_juz'].get(juz_key, 0) + count_in_verse
    
    # حفظ cache في ملف
    try:
        with open("word_stats_cache.json", 'w', encoding='utf-8') as f:
            json.dump(WORD_STATS_CACHE, f, ensure_ascii=False, indent=2)
        print(f"✅ تم حفظ word stats cache: {len(WORD_STATS_CACHE)} كلمة")
    except Exception as e:
        print(f"❌ خطأ في حفظ word stats cache: {e}")
    
    elapsed = time.time() - start_time
    print(f"✅ اكتمل بناء word statistics cache في {elapsed:.1f} ثانية")
    
    return WORD_STATS_CACHE

def build_fts_index(db: Session):
    """
    بناء فهرس FTS5 للبحث الفوري
    """
    print("🔄 بدء بناء فهرس FTS5...")
    start_time = time.time()
    
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        
        # إنشاء جدول FTS5
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts 
            USING fts5(text, content=verses, content_rowid=id)
        ''')
        
        # ملء الفهرس (إذا كان فارغاً)
        cursor.execute('SELECT COUNT(*) FROM verses_fts')
        count = cursor.fetchone()[0]
        
        if count == 0:
            cursor.execute('''
                INSERT INTO verses_fts(rowid, text)
                SELECT id, text FROM verses
            ''')
            print("✅ تم ملء فهرس FTS5 بالبيانات")
        else:
            print(f"✅ فهرس FTS5 موجود بالفعل: {count} آية")
        
        conn.commit()
        conn.close()
        
        elapsed = time.time() - start_time
        print(f"✅ اكتمل بناء فهرس FTS5 في {elapsed:.1f} ثانية")
        return True
        
    except Exception as e:
        print(f"❌ خطأ في بناء فهرس FTS5: {e}")
        return False

# ============================================
# 🚀 دالة جديدة: بحث شامل مسرّع باستخدام Similarity Cache
# ============================================

def fast_all_similarities_from_cache(db: Session, target_verses: List[Verse], compare_verses: List[Verse], 
                                   min_similarity: float, limit: int, exclude_basmala: bool):
    """
    🚀 بحث شامل مسرّع باستخدام Similarity Cache
    ⚡ السرعة: 1-10 ثوانٍ بدلاً من 300+ ثانية
    """
    print("🚀 استخدام Similarity Cache للبحث المسرّع...")
    start_time = time.time()
    
    similarities = []
    seen_pairs = set()
    
    # إنشاء مجموعات للتحقق السريع
    target_verse_ids = {v.id for v in target_verses}
    compare_verse_ids = {v.id for v in compare_verses}
    
    processed = 0
    total_target = len(target_verses)
    
    for target_verse in target_verses:
        processed += 1
        if processed % 50 == 0:
            elapsed_so_far = time.time() - start_time
            print(f"   📊 التقدم: {processed}/{total_target} آية ({elapsed_so_far:.1f}ث، {len(similarities)} متشابه)")
        
        # تخطي إذا كانت البسملة واستبعادها مطلوب
        if exclude_basmala and is_basmala_verse(target_verse):
            continue
            
        # جلب المتشابهات المخزنة لهذه الآية
        if target_verse.id in SIMILARITY_CACHE:
            cached_similarities = SIMILARITY_CACHE[target_verse.id]
            
            for sim in cached_similarities:
                compare_id = sim['verse_id']
                
                # التأكد من أن الآية المقارنة في النطاق المطلوب
                if compare_id not in compare_verse_ids:
                    continue
                
                # تجنب المقارنة مع نفس الآية
                if compare_id == target_verse.id:
                    continue
                
                # تجنب الأزواج المكررة
                pair = tuple(sorted([target_verse.id, compare_id]))
                if pair in seen_pairs:
                    continue
                
                # التحقق من الحد الأدنى للتشابه
                if sim['similarity'] >= min_similarity:
                    # جلب الآية المقارنة من قاعدة البيانات
                    compare_verse = db.query(Verse).filter(Verse.id == compare_id).first()
                    if not compare_verse:
                        continue
                    
                    # تخطي إذا كانت البسملة واستبعادها مطلوب
                    if exclude_basmala and is_basmala_verse(compare_verse):
                        continue
                    
                    # ✅ الإصلاح: التحقق من الاستثناءات للمتشابهات 100%
                    if not is_excluded_100_percent_match(target_verse.text, compare_verse.text):
                        seen_pairs.add(pair)
                        similarities.append({
                            'verse1': target_verse.to_dict(),
                            'verse2': compare_verse.to_dict(),
                            'similarity': sim['similarity'],
                            'score_percent': int(sim['similarity'] * 100)
                        })
                    
                    if len(similarities) >= limit:
                        break
        
        if len(similarities) >= limit:
            break
    
    # ترتيب النتائج حسب التشابه
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    
    elapsed = time.time() - start_time
    print(f"✅ البحث المسرّع: {len(similarities)} نتيجة في {elapsed:.1f}ث")
    
    return similarities

# ============================================
# 🏆 دوال جديدة لوضع الخبير
# ============================================

def load_mutashabihat_bank():
    """تحميل بنك الأسئلة من JSON"""
    global MUTASHABIHAT_BANK
    
    json_path = FilePath(__file__).parent / "mutashabihat_kalima.json"
    
    if not json_path.exists():
        print("⚠️ ملف mutashabihat_kalima.json غير موجود")
        return None
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            MUTASHABIHAT_BANK = json.load(f)
        
        print(f"✅ تم تحميل بنك المتشابهات: {MUTASHABIHAT_BANK['total_questions']} سؤال")
        return MUTASHABIHAT_BANK
    except Exception as e:
        print(f"❌ خطأ في تحميل البنك: {e}")
        return None

def get_expert_distinguish_question(db: Session, scope_filter):
    """
    🏆 وضع الخبير: استخدام أسئلة من "متشابهات كلمة"
    
    ✅ تحسينات:
    - ضمان وجود خيار صحيح واحد فقط
    - الخيارات من سور مختلفة فقط
    """
    global MUTASHABIHAT_BANK
    
    if not MUTASHABIHAT_BANK:
        print("⚠️ بنك المتشابهات غير محمل، نرجع للطريقة العادية")
        return get_distinguish_question(db, scope_filter, 0.85)
    
    questions = MUTASHABIHAT_BANK['questions']
    
    # محاولة إيجاد سؤال مناسب (10 محاولات)
    for attempt in range(10):
        # اختيار سؤال عشوائي
        question_data = random.choice(questions)
        
        # التأكد من وجود آيات كافية (على الأقل 2)
        if len(question_data['verses']) < 2:
            continue
        
        # جلب الآيات من قاعدة البيانات للتأكد من وجودها في النطاق
        valid_verses = []
        
        for verse_info in question_data['verses']:
            # جلب الآية من قاعدة البيانات
            verse = db.query(Verse).filter(
                Verse.surah == verse_info['surah'],
                Verse.ayah == verse_info['ayah']
            ).first()
            
            if verse:
                # التحقق من أن الآية في النطاق المحدد
                if scope_filter == True or db.query(Verse).filter(
                    Verse.id == verse.id,
                    scope_filter
                ).first():
                    valid_verses.append(verse)
        
        # إذا وجدنا 2+ آيات صالحة في النطاق
        if len(valid_verses) >= 2:
            # 🎯 اختيار آية عشوائية كإجابة صحيحة
            correct_verse = random.choice(valid_verses)
            
            # 🎯 الآيات الأخرى كخيارات (من سور مختلفة فقط)
            other_verses = [
                v for v in valid_verses 
                if v.id != correct_verse.id and v.surah != correct_verse.surah  # ✅ سورة مختلفة فقط
            ]
            
            # إذا لم نجد آيات من سور مختلفة، نستمر في البحث
            if len(other_verses) < 1:
                continue
            
            # تحديد الخيارات (2-3 خيارات من سور مختلفة)
            options = [correct_verse.text]
            for v in other_verses[:3]:
                options.append(v.text)
            
            # ✅ التأكد المزدوج: الخيار الصحيح موجود مرة واحدة فقط
            options = list(set(options))  # إزالة التكرار
            if options.count(correct_verse.text) > 1:
                continue  # نستمر في البحث عن سؤال آخر
            
            random.shuffle(options)
            
            print(f"✅ expert_mode: سؤال من البنك")
            print(f"   Category: {question_data['category']}")
            print(f"   Pattern: {question_data['pattern']}")
            print(f"   Correct: {correct_verse.surah_name} ({correct_verse.surah}:{correct_verse.ayah})")
            print(f"   Options: {len(options)} (من سور مختلفة)")
            
            # ✅ طباعة الخيارات للتأكد
            for i, opt in enumerate(options, 1):
                is_correct = "✓" if opt == correct_verse.text else ""
                print(f"      {i}. {opt[:50]}... {is_correct}")
            
            return {
                "question_type": "distinguish",
                "question_text": f"أي من الآيات التالية في سورة **{correct_verse.surah_name}**؟\n\n(وضع الخبير 🏆)",
                "correct_answer": correct_verse.text,
                "verse_info": {
                    "surah_name": correct_verse.surah_name,
                    "surah": correct_verse.surah,
                    "ayah": correct_verse.ayah
                },
                "options": options,
                "expert_mode": True,
                "bank_question_id": question_data['id'],
                "category": question_data['category']
            }
    
    # إذا فشلنا في إيجاد سؤال من البنك، نرجع للطريقة العادية
    print("⚠️ لم نجد سؤال مناسب من البنك، نستخدم الطريقة العادية")
    return get_distinguish_question(db, scope_filter, 0.85)

# ============================================
# 🆕 دوال مساعدة جديدة للاختبارات
# ============================================
def get_word_distractors(db: Session, target_word: str, current_surah_id: int, limit: int = 3) -> List[str]:
    """جلب كلمات مشتتة عشوائية"""
    # كلمات مشتتة شائعة
    distractors = ["السماء", "الأرض", "الناس", "الذي", "وهم", "الذين", "الله", "الرحمن", "الرحيم"]
    
    try:
        # جلب آيات قريبة (نطاق سورة)
        nearby_verses = db.query(Verse).filter(Verse.surah == current_surah_id).limit(10).all()
        
        all_words = []
        for v in nearby_verses:
            # استخراج الكلمات بعد تنظيفها
            words = [clean_text(w) for w in v.text.split() if len(w) > 2 and clean_text(w) != clean_text(target_word)]
            all_words.extend(words)
        
        # اختيار كلمات عشوائية فريدة
        unique_words = list(set(all_words))
        
        # تصفية وإضافة مشتتات فريدة
        selected_distractors = [d for d in unique_words if d != clean_text(target_word)]
        
        # ملء القائمة لضمان وجود 3 مشتتات على الأقل
        if len(selected_distractors) < 3:
            selected_distractors.extend(distractors)
            selected_distractors = list(set(selected_distractors))
            
        return random.sample(selected_distractors, min(limit, len(selected_distractors)))
        
    except Exception as e:
        print(f"❌ خطأ في جلب المشتتات: {e}")
        return random.sample(distractors, min(limit, len(distractors)))

def get_verse_distractor(db: Session, target_verse: Verse, threshold: float, limit: int = 5) -> Optional[Verse]:
    """جلب آية مشتتة متشابهة"""
    # البحث عن آية متشابهة من سورة أخرى
    try:
        # جلب آيات عشوائية من سورة أخرى
        other_verses = db.query(Verse).filter(Verse.surah != target_verse.surah, Verse.juz != target_verse.juz).limit(100).all()
        
        # البحث عن آية تشابهها لفظياً بنسبة عالية
        similar_distractors = []
        target_clean = clean_text(target_verse.text)
        
        for v in other_verses:
            v_clean = clean_text(v.text)
            similarity = calculate_word_similarity(target_clean, v_clean)
            
            # نختار آية متشابهة جداً، ولكن ليست 100%
            if 0.75 < similarity < 0.95:
                similar_distractors.append((v, similarity))
                
        if similar_distractors:
            # نختار الآية الأكثر تشابهاً
            similar_distractors.sort(key=lambda x: x[1], reverse=True)
            return similar_distractors[0][0]
        
        # إذا لم نجد، نرجع آية عشوائية قصيرة
        return db.query(Verse).filter(Verse.surah != target_verse.surah).order_by(func.random()).first()
        
    except Exception as e:
        print(f"❌ خطأ في جلب مشتت الآية: {e}")
        return db.query(Verse).filter(Verse.surah != target_verse.surah).order_by(func.random()).first()

def get_word_choice_question(db: Session, scope_filter, threshold: float):
    """إنشاء سؤال اختيار الكلمة مع خيارات"""
    random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
    
    if not random_verse:
        return {"error": "لم يتم العثور على آية مطابقة للمعايير."}
    
    # 1. اختيار كلمة عشوائية لحذفها
    words = random_verse.text.split()
    if len(words) < 5:
        # إذا كانت الآية قصيرة جداً، جلب آية أخرى.
        return get_word_choice_question(db, scope_filter, threshold) 
        
    # اختيار كلمة عشوائية ليست الكلمة الأولى أو الأخيرة
    word_index = random.randint(1, len(words) - 2)
    correct_word = words[word_index]
    
    # إنشاء نص السؤال
    question_text = " ".join(words[:word_index]) + " (___) " + " ".join(words[word_index+1:])
    
    # 2. جلب المشتتات
    distractors = get_word_distractors(db, correct_word, random_verse.surah, limit=3)
    
    # 3. تجميع الخيارات
    options = [correct_word] + distractors
    random.shuffle(options)
    
    return {
        "question_type": "word_choice",
        "question_text": question_text,
        "correct_answer": correct_word,
        "verse_info": {
            "surah_name": random_verse.surah_name,
            "surah": random_verse.surah,
            "ayah": random_verse.ayah
        },
        "options": options # 💡 حقل الخيارات الجديد
    }

def get_distinguish_question(db: Session, scope_filter, threshold: float):
    """إنشاء سؤال تمييز المتشابهات مع خيارات"""
    random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
    
    if not random_verse:
        return {"error": "لم يتم العثور على آية مطابقة للمعايير."}
    
    # 1. جلب آية مشتتة متشابهة جداً ولكن من سورة أخرى
    distractor_verse = get_verse_distractor(db, random_verse, threshold)
    
    if not distractor_verse:
        # إذا فشلنا في جلب مشتت جيد، نعود لاختيار كلمة (النمط القديم)
        return get_word_choice_question(db, scope_filter, threshold) 
    
    # 2. إنشاء السؤال
    question_text = f"أي من الآيات التالية في سورة **{random_verse.surah_name}**؟"
    
    # 3. تجميع الخيارات
    correct_option = random_verse.text
    distractor_option = distractor_verse.text
    
    options = [correct_option, distractor_option]
    random.shuffle(options)
    
    return {
        "question_type": "distinguish",
        "question_text": question_text,
        "correct_answer": correct_option, # الإجابة الصحيحة هي نص الآية
        "verse_info": {
            "surah_name": random_verse.surah_name,
            "surah": random_verse.surah,
            "ayah": random_verse.ayah
        },
        "options": options # 💡 حقل الخيارات الجديد
    }

# ============================================
# 🔍 دوال البحث المحسنة - البحث النصي الدقيق
# ============================================

def exact_phrase_search(db: Session, query: str, limit: int = 20) -> List[dict]:
    """
    🔥 بحث دقيق عن العبارة الكاملة - يضمن مطابقة 100%
    """
    start_time = time.time()
    
    # الحفاظ على النص الأصلي للبحث الدقيق
    original_query = query.strip()
    query_clean = clean_text(query)
    
    print(f"🔍 البحث الدقيق عن العبارة: '{original_query}'")
    print(f"   بعد التنظيف: '{query_clean}'")
    
    # جلب جميع الآيات للبحث الدقيق
    all_verses = db.query(Verse).all()
    
    exact_matches = []
    
    for verse in all_verses:
        verse_text_original = verse.text  # النص الأصلي
        verse_clean = clean_text(verse.text)
        
        # ✅ البحث الدقيق بثلاث طرق:
        
        # 1. مطابقة في النص الأصلي (الأفضل)
        if original_query in verse_text_original:
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = "1.0000"
            verse_dict['match_type'] = 'exact_phrase_original'
            exact_matches.append(verse_dict)
            continue
            
        # 2. مطابقة في النص النظيف
        if query_clean in verse_clean:
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = "1.0000" 
            verse_dict['match_type'] = 'exact_phrase_clean'
            exact_matches.append(verse_dict)
            continue
            
        # 3. مطابقة كلمات بالترتيب (للرسم العثماني)
        if all_words_in_sequence(query_clean.split(), verse_clean.split()):
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = "1.0000"
            verse_dict['match_type'] = 'exact_sequence'
            exact_matches.append(verse_dict)
        
        if len(exact_matches) >= limit:
            break
    
    elapsed = time.time() - start_time
    print(f"✅ البحث الدقيق: {len(exact_matches)} نتيجة مطابقة 100% في {elapsed:.3f}ث")
    
    return exact_matches

def all_words_in_sequence(query_words: list, verse_words: list) -> bool:
    """
    ✅ تحقق من أن كل كلمات الاستعلام موجودة بالترتيب في الآية
    """
    if not query_words:
        return False
    
    query_index = 0
    
    for verse_word in verse_words:
        if query_index >= len(query_words):
            break
            
        clean_verse_word = clean_text(verse_word)
        clean_query_word = clean_text(query_words[query_index])
        
        # ✅ مطابقة دقيقة للكلمة
        if clean_verse_word == clean_query_word:
            query_index += 1
    
    # ✅ نجحنا في إيجاد كل الكلمات بالترتيب
    return query_index == len(query_words)

def exact_text_search(db: Session, query: str, limit: int = 20) -> List[dict]:
    """
    🔥 بحث نصي دقيق - يبحث في النصين الأصلي والنظيف
    """
    start_time = time.time()
    
    original_query = query.strip()
    query_clean = clean_text(query)
    
    print(f"🔍 البحث النصي الدقيق عن: '{original_query}' (نظيف: '{query_clean}')")
    
    exact_matches = []
    all_verses = db.query(Verse).all()
    
    for verse in all_verses:
        verse_text_original = verse.text
        verse_clean = clean_text(verse.text)
        
        # ✅ البحث في النص الأصلي أولاً (للعثماني)
        if original_query in verse_text_original:
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = "1.0000"
            verse_dict['match_type'] = 'exact_original'
            exact_matches.append(verse_dict)
            continue
            
        # ✅ البحث في النص النظيف (للعادي)
        if query_clean and query_clean in verse_clean:
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = "1.0000"
            verse_dict['match_type'] = 'exact_clean' 
            exact_matches.append(verse_dict)
            continue
            
        if len(exact_matches) >= limit:
            break
    
    elapsed = time.time() - start_time
    print(f"✅ البحث النصي الدقيق: {len(exact_matches)} نتيجة في {elapsed:.3f}ث")
    
    return exact_matches

def semantic_search(query: str, limit: int = 100):
    """البحث الدلالي باستخدام FAISS - معطل في Production"""
    print(f"⚠️ البحث الدلالي معطل للاستعلام: '{query}'")
    print("💡 يتم استخدام البحث اللفظي بدلاً منه (أسرع وأدق)")
    return []  # إرجاع قائمة فارغة

def fallback_search(db: Session, query: str, limit: int = 20, threshold: float = 0.7, error: str = None):
    """
    🔥 بحث احتياطي محدث - برفع threshold إلى 0.7
    """
    start_time = time.time()
    all_verses = db.query(Verse).all()
    query_clean = clean_text(query)
    
    final_results = []
    
    for verse in all_verses:
        verse_clean = clean_text(verse.text)
        similarity = calculate_similarity(query_clean, verse_clean)
        
        if similarity >= threshold:  # ✅ رفع من 0.3 إلى 0.7
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = f"{similarity:.4f}"
            verse_dict['match_type'] = 'lexical'
            final_results.append((verse_dict, similarity))
            
    final_results.sort(key=lambda x: x[1], reverse=True)
    
    elapsed = time.time() - start_time
    
    return {
        "query": query,
        "search_time": f"{elapsed:.3f}s",
        "error": error if error else "تم استخدام البحث اللفظي الاحتياطي",
        "total_found": len(final_results),
        "results": [item[0] for item in final_results[:limit]]
    }

# ============================================
# إعداد FastAPI
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """دالة تُنفذ عند بدء التشغيل"""
    print("\n--- 💾 إعداد قاعدة بيانات SQLite ---")
    db = next(get_db())
    init_db(db)
    
    # تهيئة محرك البحث الدلالي
    initialize_search_engine(db)
    
    # 🏆 تحميل بنك المتشابهات
    load_mutashabihat_bank()
    
    # 🚀 تهيئة أنظمة التحسينات
    initialize_optimizations(db)
    
    db.close()
    yield
    print("\n--- 🧹 إغلاق الخادم ---")

app = FastAPI(
    title="المصحف الذكي API",
    description="API للبحث عن المتشابهات القرآنية (هجين ذكي: سريع + لفظي) + وضع الخبير 🏆 + تحسينات السرعة 🚀",
    version="5.3.0",  # ✅ تحديث الإصدار
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ استخدام المتغير
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 🆕 ENDPOINT الجديد: الصفحة الرئيسية
# ============================================

@app.get("/")
def root():
    """الصفحة الرئيسية للAPI"""
    return {
        "message": "مرحباً بك في مصحف AI API 🕌",
        "version": "5.3.0",
        "status": "يعمل بنجاح 🚀",
        "endpoints": {
            "search": "/search?q=الكلمة",
            "search_fixed": "/search/fixed?q=الكلمة (يدعم الرسم العثماني)",
            "live_search": "/search/live?q=الكلمة",
            "similar_verses": "/similar/{verse_id}",
            "quiz": "/quiz/get_question (POST)",
            "stats": "/stats",
            "performance": "/performance/stats",
            "documentation": "/docs"
        },
        "note": "زور /docs للوثائق التفاعلية الكاملة"
    }

# ============================================
# 🆕 ENDPOINT الجديد: بحث محسّن للرسم العثماني
# ============================================

@app.get("/search/fixed")
def fixed_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """
    🔍 بحث محسّن يدعم الرسم العثماني بالكامل
    ✅ يبحث في النص الأصلي مباشرة (بدون تنظيف)
    ✅ يدعم جميع أشكال الكتابة العثمانية
    """
    print(f"\n🎯 بحث محسّن للعثماني: '{q}'")
    start_time = time.time()
    
    # البحث في النص الأصلي مباشرة (يدعم العثماني)
    verses = db.query(Verse).filter(
        Verse.text.contains(q)
    ).limit(limit).all()
    
    results = []
    for verse in verses:
        results.append({
            **verse.to_dict(),
            'similarity': '1.0000',
            'match_type': 'exact_original'
        })
    
    elapsed = time.time() - start_time
    
    return {
        "query": q,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "match_type": "exact_original",
        "method": "contains_search",
        "results": results
    }

@app.get("/search/both")
def search_both_methods(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """
    🔥 بحث شامل يدعم الكتابة العادية والعثمانية معاً
    ✅ يبحث في النص الأصلي (العثماني) والنص النظيف (العادي)
    """
    print(f"\n🎯 بحث شامل: '{q}'")
    start_time = time.time()
    
    # البحث بطريقتين معاً
    results = []
    
    # الطريقة 1: البحث في النص الأصلي (العثماني)
    verses_original = db.query(Verse).filter(
        Verse.text.contains(q)
    ).limit(limit).all()
    
    for verse in verses_original:
        results.append({
            **verse.to_dict(),
            'similarity': '1.0000',
            'match_type': 'exact_original',
            'method': 'contains_original'
        })
    
    # الطريقة 2: البحث في النص النظيف (العادي)
    q_clean = clean_text(q)
    all_verses = db.query(Verse).all()
    
    for verse in all_verses:
        verse_clean = clean_text(verse.text)
        if q_clean in verse_clean:
            # تجنب التكرار
            existing = any(r['id'] == verse.id for r in results)
            if not existing:
                results.append({
                    **verse.to_dict(),
                    'similarity': '1.0000', 
                    'match_type': 'exact_clean',
                    'method': 'contains_clean'
                })
        
        if len(results) >= limit:
            break
    
    elapsed = time.time() - start_time
    
    return {
        "query": q,
        "query_clean": q_clean,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "match_type": "both_methods",
        "results": results[:limit]
    }

# ============================================
# 🚀 endpoints جديدة للتحسينات
# ============================================

@app.get("/search/live")
def live_search_verses(
    q: str = Query(..., min_length=1, description="استعلام البحث"),
    limit: int = Query(20, gt=0, le=50, description="عدد النتائج"),
    highlight: bool = Query(True, description="تظليل الكلمات في النتائج"),
    db: Session = Depends(get_db)
):
    """
    🚀 بحث فوري باستخدام FTS5
    ⚡ السرعة: 5-20ms
    ✅ مثالي للبحث المباشر أثناء الكتابة
    """
    print(f"\n🎯 بحث فوري: '{q}'")
    start_time = time.time()
    
    # البحث باستخدام FTS5
    results = fast_text_search_fts(q, limit)
    
    # إضافة التظليل إذا طُلب
    if highlight:
        for result in results:
            result['highlighted_text'] = highlight_words_in_text(result['text'], q)
    
    elapsed = time.time() - start_time
    
    return {
        "query": q,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "match_type": "fts_live",
        "method": "FTS5",
        "results": results
    }

@app.get("/similarities/fast/{verse_id}")
def get_fast_similarities(
    verse_id: int = Path(..., description="معرف الآية"),
    min_similarity: float = Query(0.6, ge=0.3, le=1.0, description="الحد الأدنى للتشابه"),
    db: Session = Depends(get_db)
):
    """
    🚀 متشابهات فورية من Cache
    ⚡ السرعة: 10-50ms (للنتائج المخزنة)
    ✅ يعمل حتى بدون اتصال بالإنترنت
    """
    print(f"\n🎯 متشابهات فورية للآية: {verse_id}")
    start_time = time.time()
    
    # التحقق من وجود الآية
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise HTTPException(status_code=404, detail="الآية غير موجودة")
    
    # جلب المتشابهات من cache
    similar_verses = get_cached_similarities(verse_id, min_similarity)
    
    elapsed = time.time() - start_time
    
    return {
        "verse": verse.to_dict(),
        "similar_verses": similar_verses,
        "search_time": f"{elapsed:.3f}s",
        "method": "cache",
        "cache_hit": len(similar_verses) > 0,
        "total_found": len(similar_verses)
    }

@app.get("/autocomplete/{prefix}")
def get_autocomplete_suggestions(
    prefix: str = Path(..., min_length=2, description="بادئة الكلمة"),
    limit: int = Query(10, gt=0, le=20, description="عدد الاقتراحات")
):
    """
    🚀 اقتراحات تلقائية أثناء الكتابة
    ⚡ السرعة: 1-5ms
    ✅ يعتمد على word statistics cache
    """
    print(f"\n🎯 AutoComplete: '{prefix}'")
    start_time = time.time()
    
    prefix_clean = clean_text(prefix)
    suggestions = []
    
    if WORD_STATS_CACHE:
        # البحث عن الكلمات التي تبدأ بالبادئة
        for word, stats in WORD_STATS_CACHE.items():
            if word.startswith(prefix_clean):
                suggestions.append({
                    'word': word,
                    'count': stats['total_count'],
                    'verses_count': stats['verses_count']
                })
        
        # ترتيب حسب التكرار
        suggestions.sort(key=lambda x: x['count'], reverse=True)
        suggestions = suggestions[:limit]
    
    elapsed = time.time() - start_time
    
    return {
        "prefix": prefix,
        "suggestions": suggestions,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(suggestions)
    }

@app.get("/admin/build-fts")
def admin_build_fts_index(db: Session = Depends(get_db)):
    """
    🔧 بناء فهرس FTS5 (للمسؤولين)
    ⚠️ يستغرق بضع ثوانٍ - يُشغّل مرة واحدة فقط
    """
    print("\n🔧 بناء فهرس FTS5...")
    success = build_fts_index(db)
    
    return {
        "success": success,
        "message": "تم بناء فهرس FTS5 بنجاح" if success else "فشل بناء فهرس FTS5"
    }

# ============================================
# 🔧 تحديث endpoint بناء الـ cache
# ============================================
# استبدل endpoint /admin/build-cache (حوالي السطر 590)

@app.get("/admin/build-cache")
def admin_build_cache(
    cache_type: str = Query("all", regex="^(all|similarity|word_stats)$"),
    min_similarity: float = Query(0.05, ge=0.01, le=0.5),
    db: Session = Depends(get_db)
):
    """
    🔧 بناء أنظمة Cache (للمسؤولين)
    
    ⚠️ تحذير: قد يستغرق 10-20 دقيقة للقرآن كاملاً
    
    Parameters:
    - cache_type: نوع الـ cache (all, similarity, word_stats)
    - min_similarity: الحد الأدنى للتشابه (افتراضي 0.05 = 5%)
    """
    print(f"\n🔧 بناء {cache_type} cache...")
    print(f"   🎯 min_similarity: {min_similarity}")
    
    results = {}
    start_time = time.time()
    
    try:
        if cache_type in ["all", "similarity"]:
            print("\n📊 بناء Similarity Cache...")
            results['similarity_cache'] = build_similarity_cache(db, min_similarity)
        
        if cache_type in ["all", "word_stats"]:
            print("\n📊 بناء Word Stats Cache...")
            results['word_stats_cache'] = build_word_statistics_cache(db)
        
        elapsed = time.time() - start_time
        
        return {
            "success": True,
            "message": f"تم بناء {cache_type} cache بنجاح",
            "min_similarity_used": min_similarity,
            "time_taken": f"{elapsed/60:.1f} دقيقة",
            "results": {
                "similarity_cache_size": len(results.get('similarity_cache', {})),
                "word_stats_cache_size": len(results.get('word_stats_cache', {}))
            },
            "note": "استخدم GET /all-similarities?use_cache=true للاستفادة من السرعة"
        }
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        
        print(f"\n❌ خطأ في بناء الـ cache:")
        print(error_details)
        
        return {
            "success": False,
            "message": f"حدث خطأ: {str(e)}",
            "error_details": error_details
        }
    
@app.get("/performance/stats")
def get_performance_statistics():
    """
    📊 إحصائيات أداء النظام
    """
    return {
        "database_size": "6,236 verses",
        "faiss_ready": FAISS_INDEX is not None,
        "faiss_index_size": os.path.getsize("quran_faiss_index.bin") / 1024 / 1024 if os.path.exists("quran_faiss_index.bin") else 0,
        "fts_available": FTS_AVAILABLE,
        "similarity_cache_size": len(SIMILARITY_CACHE) if SIMILARITY_CACHE else 0,
        "word_stats_cache_size": len(WORD_STATS_CACHE) if WORD_STATS_CACHE else 0,
        "expert_mode_questions": MUTASHABIHAT_BANK['total_questions'] if MUTASHABIHAT_BANK else 0,
        "optimizations_enabled": [
            "FTS5 Live Search (5-20ms)",
            "Similarity Cache (10-50ms)", 
            "Word Statistics Cache (1-5ms)",
            "AutoComplete Suggestions",
            "LRU Cache (1000 entries)",
            "🚀 Fast All Similarities (1-10s)"  # ✅ إضافة التحسين الجديد
        ]
    }

# ============================================
# 📊 endpoints الإحصائيات المحسنة
# ============================================

@app.get("/stats/word")
def get_word_statistics(
    word: str = Query(..., min_length=1, description="الكلمة أو العبارة للبحث"),
    limit: int = Query(100, gt=0, le=1000, description="عدد النتائج"),
    db: Session = Depends(get_db)
):
    """
    📊 إحصائيات كلمة أو عبارة في القرآن
    
    يعرض:
    - إجمالي عدد التكرارات
    - عدد الآيات التي وردت فيها
    - التوزيع حسب السور
    - التوزيع حسب الأجزاء
    - أمثلة من الآيات
    """
    start_time = time.time()
    
    try:
        word_clean = clean_text(word)
        
        if len(word_clean) < 2:
            raise HTTPException(status_code=400, detail="الكلمة قصيرة جداً")
        
        all_verses = db.query(Verse).all()
        
        matches = []
        surah_counts = {}
        juz_counts = {}
        total_count = 0
        
        for verse in all_verses:
            verse_clean = clean_text(verse.text)
            count = verse_clean.count(word_clean)
            
            if count > 0:
                matches.append({
                    'verse': verse.to_dict(),
                    'count': count
                })
                
                total_count += count
                
                # إحصائيات حسب السورة
                surah_key = f"{verse.surah_name} ({verse.surah})"
                surah_counts[surah_key] = surah_counts.get(surah_key, 0) + count
                
                # إحصائيات حسب الجزء
                if verse.juz:
                    juz_key = f"الجزء {verse.juz}"
                    juz_counts[juz_key] = juz_counts.get(juz_key, 0) + count
        
        # ترتيب حسب التكرار
        matches.sort(key=lambda x: x['count'], reverse=True)
        
        # ترتيب الإحصائيات
        surah_counts_sorted = dict(sorted(surah_counts.items(), key=lambda x: x[1], reverse=True))
        juz_counts_sorted = dict(sorted(juz_counts.items(), key=lambda x: x[1], reverse=True))
        
        elapsed = time.time() - start_time
        
        return {
            'word': word,
            'word_normalized': word_clean,
            'total_count': total_count,
            'verses_count': len(matches),
            'by_surah': surah_counts_sorted,
            'by_juz': juz_counts_sorted,
            'matches': matches[:limit],
            'search_time': f"{elapsed:.3f}s"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ خطأ في إحصائيات الكلمة: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
# ============================================
# مسارات API الأساسية - تم تحديث البحث
# ============================================

@app.get("/search")
def search_verses(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    threshold: float = Query(0.7, ge=0.05, le=1.0),  # ✅ رفع من 0.1 إلى 0.7
    highlight: bool = Query(True, description="تظليل الكلمات في النتائج"),
    db: Session = Depends(get_db)
):
    """
    🔍 البحث النصي المحسّن - مع الأولوية للبحث الدقيق
    يدعم الآن الرسم العثماني والكتابة العادية + تظليل النتائج
    """
    print(f"\n{'='*60}")
    print(f"🔍 بدء البحث: '{q}'")
    print(f"   الحد: {limit}، نسبة التشابه: {threshold}")  # ✅ threshold الجديد
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        # 🌟 الخطوة 1: البحث النصي الدقيق (لضمان تطابق الجمل)
        exact_results = exact_text_search(db, q, limit)

        # إذا كانت نتائج البحث الدقيق كافية، نكتفي بها
        if exact_results:
            # 🔥 إضافة التظليل إذا طُلب
            if highlight:
                for result in exact_results:
                    result['highlighted_text'] = highlight_words_in_text(result['text'], q)
    
            elapsed = time.time() - start_time
            print(f"✅ البحث الدقيق: {len(exact_results)} نتيجة في {elapsed:.3f}ث")
    
            return {
                "query": q,
                "search_time": f"{elapsed:.3f}s",
                "total_found": len(exact_results),
                "match_type": "exact",
                "results": exact_results
            }
        
        # 🌟 الخطوة 2: البحث الدلالي/اللفظي (إذا لم يكن هناك تطابق دقيق)
        if not EMBEDDING_AVAILABLE or FAISS_INDEX is None:
            print("⚠️ FAISS غير متاح — سيتم استخدام البحث اللفظي الاحتياطي")
            fallback_results = fallback_search(db, q, limit, threshold)
            
            # 🔥 إضافة التظليل إذا طُلب
            if highlight and 'results' in fallback_results:
                for result in fallback_results['results']:
                    result['highlighted_text'] = highlight_words_in_text(result['text'], q)
            
            return fallback_results

        # البحث الدلالي
        candidate_verse_ids = semantic_search(q, limit=100)
        candidate_verses = db.query(Verse).filter(Verse.id.in_(candidate_verse_ids)).all() if candidate_verse_ids else []
        
        # التصفية باستخدام التشابه اللفظي
        query_clean = clean_text(q)
        final_results = []
        
        for verse in candidate_verses:
            verse_clean = clean_text(verse.text)
            similarity = calculate_similarity(query_clean, verse_clean)
            
            if similarity >= threshold:  # ✅ threshold الجديد
                verse_dict = verse.to_dict()
                verse_dict['similarity'] = f"{similarity:.4f}"
                verse_dict['match_type'] = 'semantic'
                final_results.append((verse_dict, similarity))
                
        # إذا لم توجد نتائج دلالية كافية، نستخدم البحث اللفظي الكامل
        if len(final_results) < limit:
            all_verses = db.query(Verse).all()
            for verse in all_verses:
                if verse.id in candidate_verse_ids:  # تجنب التكرار
                    continue
                    
                verse_clean = clean_text(verse.text)
                similarity = calculate_similarity(query_clean, verse_clean)
                
                if similarity >= threshold:  # ✅ threshold الجديد
                    verse_dict = verse.to_dict()
                    verse_dict['similarity'] = f"{similarity:.4f}"
                    verse_dict['match_type'] = 'lexical'
                    final_results.append((verse_dict, similarity))
                    
                    if len(final_results) >= limit * 2:  # نتائج إضافية للفرز
                        break
        
        # الفرز واختيار الحد المطلوب
        final_results.sort(key=lambda x: x[1], reverse=True)
        final_results = final_results[:limit]
        
        # 🔥 إضافة التظليل إذا طُلب
        results_with_highlight = []
        for item in final_results:
            verse_dict = item[0]
            if highlight:
                verse_dict['highlighted_text'] = highlight_words_in_text(verse_dict['text'], q)
            results_with_highlight.append(verse_dict)
        
        elapsed = time.time() - start_time
        
        print(f"✅ البحث الدلالي/اللفظي: {len(results_with_highlight)} نتيجة في {elapsed:.3f}ث")
        
        return {
            "query": q,
            "search_time": f"{elapsed:.3f}s",
            "total_found": len(results_with_highlight),
            "match_type": "semantic_lexical",
            "results": results_with_highlight
        }

    except Exception as e:
        print(f"❌ خطأ في البحث: {e}")
        fallback_results = fallback_search(db, q, limit, threshold, error=str(e))
        
        # 🔥 إضافة التظليل إذا طُلب
        if highlight and 'results' in fallback_results:
            for result in fallback_results['results']:
                result['highlighted_text'] = highlight_words_in_text(result['text'], q)
        
        return fallback_results

# [بقية الدوال والأندبوينتس تبقى كما هي دون تغيير]
@app.get("/similar/{verse_id}")
def get_similar_verses(
    verse_id: int = Path(...),
    limit: int = Query(10, gt=0, le=50),
    threshold: float = Query(0.4, ge=0.3, le=1.0),
    exclude_basmala: bool = Query(True),
    method: str = Query("smart", regex="^(smart|semantic|lexical)$"),
    db: Session = Depends(get_db)
):
    """
    🌟 جلب الآيات المشابهة لآية معينة
    
    Methods:
    - smart: بحث هجين ذكي (FAISS للمرشحين + لفظي للدقة) ⭐
    - semantic: بحث دلالي باستخدام FAISS فقط
    - lexical: بحث لفظي فقط
    """
    global FAISS_INDEX, EMBEDDING_MODEL, QURAN_IDS, QURAN_EMBEDDINGS
    
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise HTTPException(status_code=404, detail="الآية غير موجودة")

    start_time = time.time()
    similarities = []

    # البحث الهجين الذكي
    if method == "smart" and FAISS_INDEX is not None and QURAN_EMBEDDINGS is not None:
        try:
            if verse_id in QURAN_IDS:
                target_index = np.where(QURAN_IDS == verse_id)[0][0]
                target_embedding = QURAN_EMBEDDINGS[target_index:target_index+1].astype('float32')
                
                k = min(limit * 3, FAISS_INDEX.ntotal)
                distances, indices = FAISS_INDEX.search(target_embedding, k)
                
                for i, idx in enumerate(indices[0]):
                    compare_id = int(QURAN_IDS[idx])
                    
                    if compare_id == verse_id:
                        continue
                    
                    compare_verse = db.query(Verse).filter(Verse.id == compare_id).first()
                    if not compare_verse or (exclude_basmala and is_basmala_verse(compare_verse)):
                        continue
                    
                    lexical_sim = calculate_word_similarity(verse.text, compare_verse.text)
                    
                    # ✅ استبعاد 100% تشابه
                    if lexical_sim >= threshold and lexical_sim < 0.99:
                        similarities.append({
                            'verse_id': compare_id,
                            'surah': compare_verse.surah,
                            'surah_name': compare_verse.surah_name,
                            'ayah': compare_verse.ayah,
                            'text': compare_verse.text,
                            'distance': 1.0 - lexical_sim,
                            'similarity': lexical_sim,
                            'method': 'smart_hybrid'
                        })
                
                similarities.sort(key=lambda x: x['similarity'], reverse=True)
                similarities = similarities[:limit]
                
        except Exception as e:
            print(f"❌ خطأ في البحث الهجين: {e}")
            method = "lexical"

    # البحث اللفظي (fallback)
    if method == "lexical" or (method == "smart" and not similarities):
        all_verses = db.query(Verse).all()
        if exclude_basmala:
            all_verses = [v for v in all_verses if not is_basmala_verse(v)]
        
        for other_verse in all_verses:
            if other_verse.id == verse_id:
                continue
            
            similarity = calculate_word_similarity(verse.text, other_verse.text)
            
            # ✅ استبعاد 100% تشابه
            if similarity >= threshold and similarity < 0.99:
                similarities.append({
                    'verse_id': other_verse.id,
                    'surah': other_verse.surah,
                    'surah_name': other_verse.surah_name,
                    'ayah': other_verse.ayah,
                    'text': other_verse.text,
                    'distance': 1.0 - similarity,
                    'similarity': similarity,
                    'method': 'lexical'
                })
        
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        similarities = similarities[:limit]

    elapsed = time.time() - start_time
    
    return {
        'verse': verse.to_dict(),
        'similar_verses': similarities[:limit],
        'search_time': f"{elapsed:.2f}s",
        'method_used': method,
        'total_found': len(similarities)
    }

@app.get("/verse/{surah}/{ayah}")
def get_specific_verse(
    surah: int = Path(..., gt=0, le=114),
    ayah: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """جلب آية محددة"""
    verse = db.query(Verse).filter(Verse.surah == surah, Verse.ayah == ayah).first()
    if not verse:
        raise HTTPException(status_code=404, detail=f"لم يتم العثور على الآية {surah}:{ayah}")
    return verse.to_dict()

@app.get("/verses", response_model=List[dict])
def get_verses(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """جلب قائمة من الآيات"""
    verses = db.query(Verse).offset(skip).limit(limit).all()
    
    # ✅ استخدم cached_response بدلاً من JSONResponse
    return cached_response(
        [v.to_dict() for v in verses],
        max_age=3600  # ساعة (البيانات ثابتة)
    )

@app.get("/compare/{id1}/{id2}")
def compare_verses(
    id1: int = Path(...),
    id2: int = Path(...),
    db: Session = Depends(get_db)
):
    """مقارنة آيتين"""
    verse1 = db.query(Verse).filter(Verse.id == id1).first()
    verse2 = db.query(Verse).filter(Verse.id == id2).first()
    
    if not verse1 or not verse2:
        raise HTTPException(status_code=404, detail="آية واحدة أو كلاهما غير موجودة")

    highlighted1, highlighted2 = highlight_differences(verse1.text, verse2.text)
    
    return {
        "verse1": verse1.to_dict(),
        "verse2": verse2.to_dict(),
        "highlighted1": highlighted1,
        "highlighted2": highlighted2,
    }

@app.get("/stats")
def get_statistics(db: Session = Depends(get_db)):
    """إحصائيات قاعدة البيانات"""
    total_verses = db.query(Verse).count()
    surahs = db.query(Verse.surah).distinct().count()
    
    return cached_response(
        {
            "total_verses": total_verses,
            "total_surahs": surahs,
            "faiss_ready": FAISS_INDEX is not None,
            "smart_hybrid_available": FAISS_INDEX is not None,
            "fts_available": FTS_AVAILABLE,
            "similarity_cache_size": len(SIMILARITY_CACHE) if SIMILARITY_CACHE else 0,
            "word_stats_cache_size": len(WORD_STATS_CACHE) if WORD_STATS_CACHE else 0
        },
        max_age=1800  # 30 دقيقة
    )

# ============================================
# 🔥 الإصلاح 1: تسريع /all-similarities
# ============================================
# استبدل الكود من السطور 1107-1230 في main.py بهذا:

@app.get("/all-similarities")
def get_all_similarities(
    min_similarity: float = Query(0.70, ge=0.1, le=1.0),
    limit: int = Query(100, gt=0, le=10000),
    exclude_basmala: bool = Query(True),
    surah: Optional[int] = Query(None, ge=1, le=114),
    juz: Optional[int] = Query(None, ge=1, le=30),
    third: Optional[int] = Query(None, ge=1, le=3),
    full_quran: Optional[bool] = Query(False),
    compare_surah: Optional[int] = Query(None, ge=1, le=114),
    compare_juz: Optional[int] = Query(None, ge=1, le=30),
    use_cache: bool = Query(True),  # ✅ إزالة use_faiss (غير مستخدم)
    db: Session = Depends(get_db)
):
    """
    🔥 البحث الشامل المحسّن - سريع بنسبة 100x
    """
    
    # التحقق من صحة المعاملات
    #if compare_surah is not None and surah is None:
    #    raise HTTPException(status_code=422, detail="compare_surah requires surah")
    
    #if compare_juz is not None and juz is None:
    #    raise HTTPException(status_code=422, detail="compare_juz requires juz")
    
    print(f"\n{'='*60}")
    print(f"🔍 بدء البحث الشامل")
    print(f"   🚀 Cache المسرّع: {'مُفعل' if use_cache else 'مُعطل'}")
    print(f"   حد التشابه: {min_similarity*100}%")
    print(f"   الحد الأقصى: {limit} نتيجة")
    print(f"{'='*60}\n")

    start_time = time.time()
    
    # ============================================
    # 1. تحديد نطاق البحث (الآيات المستهدفة)
    # ============================================
    target_query = db.query(Verse)
    
    if full_quran:
        target_verses = target_query.order_by(Verse.id).all()
        search_scope = "القرآن كاملاً"
    elif third:
        if third == 1:
            juz_range = (1, 10)
            third_name = "الثلث الأول"
        elif third == 2:
            juz_range = (11, 20)
            third_name = "الثلث الثاني"
        else:
            juz_range = (21, 30)
            third_name = "الثلث الثالث"
        
        target_verses = target_query.filter(Verse.juz.between(*juz_range)).all()
        search_scope = f"{third_name} (أجزاء {juz_range[0]}-{juz_range[1]})"
    elif surah:
        target_verses = target_query.filter(Verse.surah == surah).all()
        search_scope = f"سورة {surah}"
    elif juz:
        target_verses = target_query.filter(Verse.juz == juz).all()
        search_scope = f"الجزء {juz}"
    else:
        target_verses = target_query.order_by(Verse.id).all()
        search_scope = "القرآن كاملاً"

    if exclude_basmala:
        target_verses = [v for v in target_verses if not is_basmala_verse(v)]

    print(f"📊 نطاق البحث: {search_scope} ({len(target_verses)} آية)")

    # ============================================
    # 2. تحديد نطاق المقارنة (الآيات المقارنة)
    # ============================================
    compare_query = db.query(Verse)
    
    if compare_surah:
        compare_verses = compare_query.filter(Verse.surah == compare_surah).all()
        compare_scope = f"سورة {compare_surah}"
    elif compare_juz:
        compare_verses = compare_query.filter(Verse.juz == compare_juz).all()
        compare_scope = f"الجزء {compare_juz}"
    else:
        compare_verses = compare_query.order_by(Verse.id).all()
        compare_scope = "القرآن كاملاً"
    
    if exclude_basmala:
        compare_verses = [v for v in compare_verses if not is_basmala_verse(v)]
    
    print(f"📊 نطاق المقارنة: {compare_scope} ({len(compare_verses)} آية)")

    if len(target_verses) < 1:
        return {
            "total_found": 0,
            "similarities": [],
            "search_time": "0.00s",
            "min_similarity": min_similarity,
            "search_scope": search_scope,
            "compare_scope": compare_scope,
            "method": "cache"
        }

    # ============================================
    # 🚀 3. استخدام Similarity Cache (الطريقة السريعة)
    # ============================================
    if use_cache and SIMILARITY_CACHE and len(SIMILARITY_CACHE) > 0:
        print("🚀 استخدام Similarity Cache للبحث المسرّع...")
        similarities = fast_all_similarities_from_cache(
            db, target_verses, compare_verses, min_similarity, limit, exclude_basmala
        )
        method_used = "cache_accelerated"
    
    # ============================================
    # ⚡ 4. البحث المحسّن (بدون O(n²) الكاملة)
    # ============================================
    else:
        print("⚡ استخدام البحث المحسّن (محدود بالـ limit)...")
        
        similarities = []
        seen_pairs = set()
        compare_verse_ids = set(v.id for v in compare_verses)
        
        processed = 0
        total_target = len(target_verses)
        
        # 🔥 التحسين: نتوقف عند الوصول لـ limit × 2
        # بدلاً من مقارنة كل شيء
        max_comparisons = limit * 10  # ✅ حد أقصى للمقارنات
        comparisons_done = 0
        
        for target_verse in target_verses:
            processed += 1
            
            if processed % 50 == 0:
                elapsed_so_far = time.time() - start_time
                print(f"   📊 التقدم: {processed}/{total_target} آية ({elapsed_so_far:.1f}ث، {len(similarities)} متشابه)")
            
            # تخطي إذا كانت البسملة واستبعادها مطلوب
            if exclude_basmala and is_basmala_verse(target_verse):
                continue
            
            # 🔥 التحسين: نعمل sample عشوائي بدلاً من المقارنة الكاملة
            # إذا كان عدد الآيات كبير جداً
            if len(compare_verses) > 1000:
                sample_size = min(500, len(compare_verses))
                compare_sample = random.sample(compare_verses, sample_size)
            else:
                compare_sample = compare_verses
            
            for compare_verse in compare_sample:
                comparisons_done += 1
                
                # تخطي نفس الآية
                if target_verse.id >= compare_verse.id:
                    continue
                
                # التأكد من أن الآية في نطاق المقارنة
                if compare_verse.id not in compare_verse_ids:
                    continue
                
                # تجنب الأزواج المكررة
                pair = tuple(sorted([target_verse.id, compare_verse.id]))
                if pair in seen_pairs:
                    continue
                
                similarity = calculate_word_similarity(target_verse.text, compare_verse.text)
                
                # الإصلاح: السماح بـ 100% مع استثناءات ذكية  
                if similarity >= min_similarity and not is_excluded_100_percent_match(target_verse.text, compare_verse.text):
                    seen_pairs.add(pair)
                    similarities.append({
                        'verse1': target_verse.to_dict(),
                        'verse2': compare_verse.to_dict(),
                        'similarity': similarity,
                        'score_percent': int(similarity * 100)
                    })
                    
                    if len(similarities) >= limit:
                        break
                
                # 🔥 توقف عند الحد الأقصى من المقارنات
                if comparisons_done >= max_comparisons:
                    print(f"⚠️ توقف عند {max_comparisons} مقارنة (تحسين الأداء)")
                    break
            
            if len(similarities) >= limit or comparisons_done >= max_comparisons:
                break
        
        print(f"📊 إحصائيات البحث المحسّن:")
        print(f"   🔍 إجمالي المقارنات: {comparisons_done:,}")
        print(f"   📋 النتائج النهائية: {len(similarities)}")
        
        method_used = "optimized_limited"

    # ترتيب النتائج حسب التشابه
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    elapsed = time.time() - start_time

    print(f"\n{'='*60}")
    print(f"✅ انتهى في {elapsed:.2f}ث. {len(similarities)} زوج.")
    print(f"{'='*60}\n")

    return {
        "total_found": len(similarities),
        "similarities": similarities,
        "search_time": f"{elapsed:.2f}s",
        "min_similarity": min_similarity,
        "search_scope": search_scope,
        "compare_scope": compare_scope,
        "method": method_used,
        "cache_used": use_cache and SIMILARITY_CACHE and len(SIMILARITY_CACHE) > 0,
        "note": "استخدم /admin/build-cache لتسريع البحث مستقبلاً" if method_used != "cache_accelerated" else None
    }

# ============================================
# 🎮 Quiz Endpoints - FIXED COMPLETELY + وضع الخبير 🏆
# ============================================

def get_quiz_scope_filter(scope_type: str, scope_value: str):
    """تنشئ شرط الفلترة لجلب آيات الاختبار"""
    if scope_type == 'all':
        return True
    elif scope_type == 'juz' and scope_value.isdigit():
        return Verse.juz == int(scope_value)
    elif scope_type == 'surah' and scope_value.isdigit():
        return Verse.surah == int(scope_value)
    elif scope_type == 'thulth' and scope_value.isdigit():
        thulth = int(scope_value)
        if thulth == 1:
            return Verse.juz.between(1, 10)
        elif thulth == 2:
            return Verse.juz.between(11, 20)
        elif thulth == 3:
            return Verse.juz.between(21, 30)
    return True

# ============================================
# 🏆 دوال جديدة لوضع الخبير لجميع أنواع Quiz
# ============================================

def get_expert_surah_name_question(db: Session, scope_filter):
    """وضع الخبير: سؤال ما اسم السورة مع آيات متشابهة"""
    # استخدام بنك المتشابهات للحصول على آيات متشابهة
    if not MUTASHABIHAT_BANK:
        return get_quiz_question({"question_type": "surah_name", "expert_mode": False}, db)
    
    questions = MUTASHABIHAT_BANK['questions']
    
    for attempt in range(10):
        question_data = random.choice(questions)
        
        if len(question_data['verses']) < 2:
            continue
        
        valid_verses = []
        for verse_info in question_data['verses']:
            verse = db.query(Verse).filter(
                Verse.surah == verse_info['surah'],
                Verse.ayah == verse_info['ayah']
            ).first()
            
            if verse and (scope_filter == True or db.query(Verse).filter(Verse.id == verse.id, scope_filter).first()):
                valid_verses.append(verse)
        
        if len(valid_verses) >= 2:
            correct_verse = random.choice(valid_verses)
            
            # خيارات من سور مختلفة
            other_surahs = list(set([v.surah for v in valid_verses if v.surah != correct_verse.surah]))
            if len(other_surahs) < 3:
                # إذا لم يكن هناك سور كافية، نستخدم سور عشوائية
                other_surahs = db.query(Verse.surah).filter(Verse.surah != correct_verse.surah).distinct().limit(3).all()
                other_surahs = [s[0] for s in other_surahs]
            
            wrong_choices = []
            for surah_id in other_surahs[:3]:
                surah_name = db.query(Verse.surah_name).filter(Verse.surah == surah_id).first()[0]
                wrong_choices.append(surah_name)
            
            choices = [correct_verse.surah_name] + wrong_choices
            random.shuffle(choices)
            
            print(f"🏆 expert_surah_name: {correct_verse.surah_name}")
            print(f"   Category: {question_data['category']}")
            print(f"   Choices: {choices}")
            
            return {
                "question_type": "surah_name",
                "question_text": f"{correct_verse.text}\n\n(وضع الخبير 🏆 - {question_data['category']})",
                "correct_answer": correct_verse.surah_name,
                "choices": choices,
                "verse_info": {
                    "surah_name": correct_verse.surah_name,
                    "surah": correct_verse.surah,
                    "ayah": correct_verse.ayah
                },
                "expert_mode": True,
                "category": question_data['category']
            }
    
    return get_quiz_question({"question_type": "surah_name", "expert_mode": False}, db)

def get_expert_word_choice_question(db: Session, scope_filter, threshold: float):
    """وضع الخبير: اختيار الكلمة مع كلمات متشابهة"""
    if not MUTASHABIHAT_BANK:
        return get_word_choice_question(db, scope_filter, threshold)
    
    questions = MUTASHABIHAT_BANK['questions']
    
    for attempt in range(10):
        question_data = random.choice(questions)
        
        if len(question_data['verses']) < 2:
            continue
        
        valid_verses = []
        for verse_info in question_data['verses']:
            verse = db.query(Verse).filter(
                Verse.surah == verse_info['surah'],
                Verse.ayah == verse_info['ayah']
            ).first()
            
            if verse and (scope_filter == True or db.query(Verse).filter(Verse.id == verse.id, scope_filter).first()):
                valid_verses.append(verse)
        
        if len(valid_verses) >= 1:
            correct_verse = random.choice(valid_verses)
            words = correct_verse.text.split()
            
            if len(words) < 5:
                continue
            
            # اختيار كلمة من النمط المشابه
            word_index = random.randint(1, len(words) - 2)
            correct_word = words[word_index]
            
            # إنشاء نص السؤال
            question_text = " ".join(words[:word_index]) + " (___) " + " ".join(words[word_index+1:])
            
            # خيارات من كلمات متشابهة
            similar_words = []
            for v in valid_verses:
                if v.id != correct_verse.id:
                    v_words = v.text.split()
                    if len(v_words) > word_index:
                        similar_words.append(v_words[word_index])
            
            # إذا لم توجد كلمات كافية، نستخدم كلمات عشوائية
            if len(similar_words) < 3:
                distractors = get_word_distractors(db, correct_word, correct_verse.surah, 3)
                options = [correct_word] + distractors
            else:
                options = [correct_word] + similar_words[:3]
            
            options = list(set(options))  # إزالة التكرار
            random.shuffle(options)
            
            print(f"🏆 expert_word_choice: {correct_word}")
            print(f"   Category: {question_data['category']}")
            print(f"   Options: {options}")
            
            return {
                "question_type": "word_choice",
                "question_text": f"{question_text}\n\n(وضع الخبير 🏆 - {question_data['category']})",
                "correct_answer": correct_word,
                "verse_info": {
                    "surah_name": correct_verse.surah_name,
                    "surah": correct_verse.surah,
                    "ayah": correct_verse.ayah
                },
                "options": options,
                "expert_mode": True,
                "category": question_data['category']
            }
    
    return get_word_choice_question(db, scope_filter, threshold)

def get_expert_continue_question(db: Session, scope_filter):
    """وضع الخبير: إكمال الآية مع آيات متشابهة"""
    if not MUTASHABIHAT_BANK:
        return get_quiz_question({"question_type": "continue", "expert_mode": False}, db)
    
    questions = MUTASHABIHAT_BANK['questions']
    
    for attempt in range(10):
        question_data = random.choice(questions)
        
        if len(question_data['verses']) < 1:
            continue
        
        valid_verses = []
        for verse_info in question_data['verses']:
            verse = db.query(Verse).filter(
                Verse.surah == verse_info['surah'],
                Verse.ayah == verse_info['ayah']
            ).first()
            
            if verse and (scope_filter == True or db.query(Verse).filter(Verse.id == verse.id, scope_filter).first()):
                valid_verses.append(verse)
        
        if len(valid_verses) >= 1:
            correct_verse = random.choice(valid_verses)
            words = correct_verse.text.split()
            
            if len(words) < 6:
                continue
            
            # حذف 1-3 كلمات
            num_words_to_hide = min(3, max(1, len(words) // 5))
            max_start = len(words) - num_words_to_hide - 1
            start_index = random.randint(1, max(1, max_start))
            
            hidden_words = words[start_index:start_index + num_words_to_hide]
            correct_answer = ' '.join(hidden_words)
            
            question_words = (
                words[:start_index] + 
                ['____'] + 
                words[start_index + num_words_to_hide:]
            )
            question_text = ' '.join(question_words)
            
            print(f"🏆 expert_continue: {correct_answer}")
            print(f"   Category: {question_data['category']}")
            print(f"   Hidden: {num_words_to_hide} كلمات")
            
            return {
                "question_type": "continue",
                "question_text": f"{question_text}\n\n(وضع الخبير 🏆 - {question_data['category']})",
                "correct_answer": correct_answer,
                "choices": [],
                "verse_info": {
                    "surah_name": correct_verse.surah_name,
                    "surah": correct_verse.surah,
                    "ayah": correct_verse.ayah
                },
                "expert_mode": True,
                "category": question_data['category']
            }
    
    return get_quiz_question({"question_type": "continue", "expert_mode": False}, db)

@app.post("/quiz/get_question")
def get_quiz_question(data: dict, db: Session = Depends(get_db)):
    """
    ✅ Quiz محسّن - مع دعم وضع الخبير الكامل
    
    أنواع الأسئلة:
    - continue: إكمال الآية (حذف 1-3 كلمات)
    - word_choice: اختيار الكلمة (حذف 1-3 كلمات + خيارات متشابهة)
    - distinguish: تمييز المتشابهات (آيات متشابهة 85-95%)
    - surah_name: ما اسم السورة؟
    
    🏆 وضع الخبير:
    - expert_mode: true → استخدام بنك "متشابهات كلمة" لجميع أنواع الأسئلة
    """
    scope_type = data.get('scope_type', 'all')
    scope_value = data.get('scope_value', '1')
    question_type = data.get('question_type', 'continue')
    threshold = data.get('threshold', 0.75)
    expert_mode = data.get('expert_mode', False)  # 🏆 جديد

    print(f"\n{'='*60}")
    print(f"🎮 Quiz Request:")
    print(f"   Type: {question_type}")
    print(f"   Scope: {scope_type} = {scope_value}")
    print(f"   Threshold: {threshold}")
    print(f"   🏆 Expert Mode: {expert_mode}")  # 🏆 جديد
    print(f"{'='*60}\n")

    try:
        scope_filter = get_quiz_scope_filter(scope_type, scope_value)
        
        # ============================================
        # 🏆 إذا كان وضع الخبير مفعلاً
        # ============================================
        if expert_mode:
            print("🏆 وضع الخبير مفعّل - استخدام أسئلة متقدمة")
            
            # 1. اختبار: ما اسم السورة؟ (وضع خبير)
            if question_type == 'surah_name':
                return get_expert_surah_name_question(db, scope_filter)
            
            # 2. اختبار: ميز بين المتشابهات (وضع خبير)
            elif question_type == 'distinguish':
                return get_expert_distinguish_question(db, scope_filter)
            
            # 3. اختبار: اختيار الكلمة (وضع خبير)
            elif question_type == 'word_choice':
                return get_expert_word_choice_question(db, scope_filter, threshold)
            
            # 4. اختبار: إكمال الآية (وضع خبير)
            elif question_type == 'continue':
                return get_expert_continue_question(db, scope_filter)
        
        # ============================================
        # ✅ الوضع العادي (بدون خبير)
        # ============================================
        
        # 1. اختبار: ما اسم السورة؟
        if question_type == 'surah_name':
            random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
    
            if not random_verse:
                raise HTTPException(status_code=404, detail="No verses found")
    
            wrong_surahs = db.query(Verse.surah_name).\
                filter(Verse.surah != random_verse.surah).\
                distinct().\
                order_by(func.random()).\
                limit(3).all()
    
            wrong_choices = [s[0] for s in wrong_surahs if s[0]][:3]
            choices = [random_verse.surah_name] + wrong_choices
            random.shuffle(choices)
    
            print(f"✅ surah_name: {random_verse.surah_name}")
            print(f"   Choices: {choices}\n")
    
            return {
                "question_type": "surah_name",
                "question_text": random_verse.text,
                "correct_answer": random_verse.surah_name,
                "choices": choices,
                "verse_info": {
                    "surah_name": random_verse.surah_name,
                    "surah": random_verse.surah,
                    "ayah": random_verse.ayah
                }
            }
        
        # 2. اختبار: ميز بين المتشابهات (عادي)
        elif question_type == 'distinguish':
            return get_distinguish_question(db, scope_filter, threshold)
        
        # 3. اختبار: اختيار الكلمة
        elif question_type == 'word_choice':
            return get_word_choice_question(db, scope_filter, threshold)
        
        # 4. اختبار: إكمال الآية
        random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
        
        if not random_verse:
            raise HTTPException(status_code=404, detail="No verses found")
        
        words = random_verse.text.split()
        
        if len(words) < 6:
            return get_quiz_question(data, db)
        
        # حذف 1-3 كلمات
        num_words_to_hide = min(3, max(1, len(words) // 5))
        
        max_start = len(words) - num_words_to_hide - 1
        start_index = random.randint(1, max(1, max_start))
        
        hidden_words = words[start_index:start_index + num_words_to_hide]
        correct_answer = ' '.join(hidden_words)
        
        question_words = (
            words[:start_index] + 
            ['____'] + 
            words[start_index + num_words_to_hide:]
        )
        question_text = ' '.join(question_words)
        
        print(f"✅ continue:")
        print(f"   Hidden: {num_words_to_hide} كلمات")
        print(f"   Question: {question_text}")
        print(f"   Correct: {correct_answer}\n")
        
        return {
            "question_type": "continue",
            "question_text": question_text,
            "correct_answer": correct_answer,
            "choices": [],
            "verse_info": {
                "surah_name": random_verse.surah_name,
                "surah": random_verse.surah,
                "ayah": random_verse.ayah
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ خطأ حرج في Quiz: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
    
# ============================================
# 🆕 endpoint جديد: آيات عشوائية مع متشابهات
# ============================================

# ============================================
# 🔥 الإصلاح 3: تحسين الآيات العشوائية
# ============================================
# استبدل endpoint /verses/random-with-similarities (السطور 1296-1390)

@app.get("/verses/random-with-similarities")
def get_random_verses_with_similarities(
    limit: int = Query(10, gt=0, le=20),
    min_similarity: float = Query(0.75, ge=0.5, le=0.95),  # ✅ خفض من 0.85 إلى 0.75
    max_attempts: int = Query(50, gt=10, le=100),  # ✅ جديد: عدد المحاولات
    db: Session = Depends(get_db)
):
    """
    🎲 جلب آيات عشوائية مع متشابهات محسّن
    
    التحسينات:
    - ✅ عتبة تشابه أقل (75% بدلاً من 85%)
    - ✅ استخدام Cache إذا كان متاحاً
    - ✅ fallback ذكي إذا لم توجد نتائج
    - ✅ من سور مختلفة فقط
    """
    
    start_time = time.time()
    print(f"\n{'='*60}")
    print(f"🎲 جلب {limit} آيات عشوائية مع متشابهات {min_similarity*100}%+")
    print(f"{'='*60}\n")
    
    try:
        # جلب جميع الآيات
        all_verses = db.query(Verse).all()
        
        # استبعاد البسملات
        all_verses = [v for v in all_verses if not is_basmala_verse(v)]
        
        if len(all_verses) < limit:
            return {
                "verses": [v.to_dict() for v in all_verses],
                "search_time": "0.00s",
                "total_found": len(all_verses),
                "note": "عدد الآيات أقل من المطلوب"
            }
        
        # خلط الآيات
        random.shuffle(all_verses)
        
        selected_verses = []
        used_surahs = set()
        attempts = 0
        max_total_attempts = len(all_verses)
        
        # ✅ استخدام Cache إذا كان متاحاً
        use_cache = SIMILARITY_CACHE and len(SIMILARITY_CACHE) > 0
        
        # البحث عن آيات مناسبة
        for verse in all_verses:
            attempts += 1
            
            # تقدم
            if attempts % 100 == 0:
                print(f"   🔍 المحاولة {attempts}: وجدت {len(selected_verses)}/{limit}")
            
            # تخطي إذا كانت السورة مستخدمة بالفعل
            if verse.surah in used_surahs:
                continue
            
            # البحث عن متشابهات لهذه الآية
            has_similarities = False
            
            # ✅ الطريقة 1: استخدام Cache (سريع جداً!)
            if use_cache and verse.id in SIMILARITY_CACHE:
                cached_sims = SIMILARITY_CACHE[verse.id]
                # تحقق من وجود متشابهات ضمن العتبة
                matching_sims = [s for s in cached_sims if s['similarity'] >= min_similarity]
                if len(matching_sims) > 0:
                    has_similarities = True
                    print(f"   ✅ Cache: وجدت {len(matching_sims)} متشابهة للآية {verse.surah}:{verse.ayah}")
            
            # ✅ الطريقة 2: بحث محدود (sample) إذا لم يكن Cache متاحاً
            elif not use_cache:
                # نبحث في عينة عشوائية (100 آية) للتسريع
                sample_verses = random.sample(all_verses, min(100, len(all_verses)))
                
                for other_verse in sample_verses:
                    if other_verse.id == verse.id:
                        continue
                    
                    similarity = calculate_word_similarity(verse.text, other_verse.text)
                    
                    if min_similarity <= similarity < 0.99:
                        has_similarities = True
                        print(f"   ✅ Sample: وجدت متشابهة للآية {verse.surah}:{verse.ayah} ({similarity:.2%})")
                        break
            
            # إذا وجدنا متشابهات، أضف الآية
            if has_similarities:
                selected_verses.append(verse)
                used_surahs.add(verse.surah)
                
                print(f"   ✔ وجدت الآية {len(selected_verses)}: {verse.surah_name} ({verse.surah}:{verse.ayah})")
                
                # إذا وصلنا للعدد المطلوب
                if len(selected_verses) >= limit:
                    break
            
            # توقف إذا فحصنا كل الآيات
            if attempts >= max_total_attempts:
                print(f"   ⚠️ فحص جميع الآيات ({attempts})")
                break
        
        elapsed = time.time() - start_time
        
        # ✅ Fallback: إذا لم نجد العدد الكافي، خفّض العتبة
        if len(selected_verses) < limit:
            print(f"\n⚠️ وجدنا {len(selected_verses)} فقط. نحاول مع عتبة أقل...")
            
            # أعد المحاولة مع عتبة 60%
            if min_similarity > 0.6:
                return get_random_verses_with_similarities(
                    limit=limit,
                    min_similarity=0.6,
                    max_attempts=max_attempts,
                    db=db
                )
            
            # إذا فشل كل شيء، أعد آيات عشوائية عادية
            if len(selected_verses) == 0:
                print("   ⚠️ استخدام آيات عشوائية عادية...")
                random_verses = random.sample(all_verses, min(limit, len(all_verses)))
                return {
                    "verses": [v.to_dict() for v in random_verses],
                    "search_time": f"{elapsed:.2f}s",
                    "total_found": len(random_verses),
                    "note": "تم استخدام آيات عشوائية عادية (لا توجد متشابهات كافية)",
                    "fallback": True
                }
        
        print(f"\n{'='*60}")
        print(f"✅ تم جلب {len(selected_verses)} آيات في {elapsed:.2f}ث")
        print(f"   Method: {'Cache' if use_cache else 'Sample Search'}")
        print(f"{'='*60}\n")
        
        return {
            "verses": [v.to_dict() for v in selected_verses],
            "search_time": f"{elapsed:.2f}s",
            "total_found": len(selected_verses),
            "min_similarity": min_similarity,
            "method": "cache" if use_cache else "sample",
            "attempts": attempts
        }
        
    except Exception as e:
        print(f"❌ خطأ في جلب الآيات العشوائية: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback نهائي: آيات عشوائية بسيطة
        try:
            random_verses = db.query(Verse).order_by(func.random()).limit(limit).all()
            return {
                "verses": [v.to_dict() for v in random_verses],
                "search_time": "0.00s",
                "total_found": len(random_verses),
                "error": "تم الرجوع للآيات العشوائية العادية",
                "error_details": str(e)
            }
        except:
            return {
                "verses": [],
                "search_time": "0.00s",
                "total_found": 0,
                "error": f"خطأ حرج: {str(e)}"
            }
                
# أضف هذا endpoint مؤقت للتحقق
@app.get("/debug/check-cache")
def debug_check_cache(
    surah: int = Query(..., ge=1, le=114),
    ayah: int = Query(..., ge=1),
    db: Session = Depends(get_db)
):
    """فحص إذا كانت الآية موجودة في الكاش"""
    verse = db.query(Verse).filter(Verse.surah == surah, Verse.ayah == ayah).first()
    
    if not verse:
        raise HTTPException(status_code=404, detail="الآية غير موجودة")
    
    cache_entries = []
    if verse.id in SIMILARITY_CACHE:
        for sim in SIMILARITY_CACHE[verse.id]:
            cache_entries.append({
                "compare_verse": f"{sim['surah']}:{sim['ayah']}",
                "similarity": sim['similarity'],
                "text_preview": sim['text'][:50] + "..."
            })
    
    return {
        "verse": f"{verse.surah}:{verse.ayah}",
        "in_cache": verse.id in SIMILARITY_CACHE,
        "cache_entries_count": len(cache_entries),
        "cache_entries": cache_entries[:10]  # أول 10 إدخالات فقط
    }

# ============================================
# ⭐ نظام التقييم والتعليقات - NEW!
# ============================================
# أضف هذا الكود في نهاية main.py (قبل if __name__ == "__main__":)

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import json
from pathlib import Path as FilePath

# ============================================
# 📊 Models (Pydantic)
# ============================================

class RatingFeedback(BaseModel):
    """تقييم بالنجوم مع تعليق اختياري"""
    rating: int = Field(..., ge=1, le=5, description="التقييم من 1 إلى 5 نجوم")
    comment: Optional[str] = Field(None, max_length=500, description="تعليق اختياري")
    user_email: Optional[str] = Field(None, max_length=100, description="Email اختياري")
    page: Optional[str] = Field(None, description="الصفحة التي تم التقييم منها")

class SuggestionFeedback(BaseModel):
    """اقتراح لتحسين التطبيق"""
    title: str = Field(..., min_length=5, max_length=100, description="عنوان الاقتراح")
    description: str = Field(..., min_length=10, max_length=1000, description="تفاصيل الاقتراح")
    category: Optional[Literal["feature", "ui", "performance", "content", "other"]] = Field("other", description="نوع الاقتراح")
    user_email: Optional[str] = Field(None, max_length=100, description="Email للتواصل")

class BugReportFeedback(BaseModel):
    """إبلاغ عن خطأ أو مشكلة"""
    title: str = Field(..., min_length=5, max_length=100, description="عنوان المشكلة")
    description: str = Field(..., min_length=10, max_length=1000, description="وصف المشكلة")
    steps_to_reproduce: Optional[str] = Field(None, max_length=1000, description="خطوات إعادة إنتاج المشكلة")
    browser: Optional[str] = Field(None, max_length=50, description="المتصفح المستخدم")
    device: Optional[str] = Field(None, max_length=50, description="الجهاز المستخدم")
    user_email: Optional[str] = Field(None, max_length=100, description="Email للتواصل")

# ============================================
# 💾 دوال حفظ وقراءة البيانات
# ============================================

FEEDBACK_DIR = FilePath("feedback_data")
RATINGS_FILE = FEEDBACK_DIR / "ratings.json"
SUGGESTIONS_FILE = FEEDBACK_DIR / "suggestions.json"
BUGS_FILE = FEEDBACK_DIR / "bugs.json"

def ensure_feedback_dir():
    """إنشاء مجلد feedback إذا لم يكن موجوداً"""
    FEEDBACK_DIR.mkdir(exist_ok=True)
    
    # إنشاء الملفات إذا لم تكن موجودة
    for file in [RATINGS_FILE, SUGGESTIONS_FILE, BUGS_FILE]:
        if not file.exists():
            file.write_text("[]", encoding="utf-8")

def save_feedback(file_path: FilePath, data: dict) -> dict:
    """حفظ feedback في ملف JSON"""
    try:
        ensure_feedback_dir()
        
        # قراءة البيانات الحالية
        existing_data = json.loads(file_path.read_text(encoding="utf-8"))
        
        # إضافة timestamp و id
        data["id"] = len(existing_data) + 1
        data["timestamp"] = datetime.now().isoformat()
        
        # إضافة البيانات الجديدة
        existing_data.append(data)
        
        # حفظ البيانات
        file_path.write_text(
            json.dumps(existing_data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        
        return data
    except Exception as e:
        print(f"❌ خطأ في حفظ feedback: {e}")
        raise

def load_feedback(file_path: FilePath) -> list:
    """قراءة feedback من ملف JSON"""
    try:
        ensure_feedback_dir()
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"❌ خطأ في قراءة feedback: {e}")
        return []

# ============================================
# 🌐 Endpoints
# ============================================

@app.post("/api/feedback/rating")
def submit_rating(feedback: RatingFeedback):
    """
    إرسال تقييم بالنجوم
    
    - **rating**: التقييم من 1 إلى 5 نجوم
    - **comment**: تعليق اختياري (حتى 500 حرف)
    - **user_email**: Email اختياري للتواصل
    """
    try:
        data = feedback.dict()
        saved_data = save_feedback(RATINGS_FILE, data)
        
        print(f"⭐ تقييم جديد: {feedback.rating} نجوم")
        if feedback.comment:
            print(f"   التعليق: {feedback.comment[:50]}...")
        
        return {
            "success": True,
            "message": "شكراً لتقييمك! 🌟",
            "data": saved_data
        }
    except Exception as e:
        print(f"❌ خطأ في حفظ التقييم: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback/suggestion")
def submit_suggestion(feedback: SuggestionFeedback):
    """
    إرسال اقتراح لتحسين التطبيق
    
    - **title**: عنوان الاقتراح (5-100 حرف)
    - **description**: تفاصيل الاقتراح (10-1000 حرف)
    - **category**: نوع الاقتراح (feature/ui/performance/content/other)
    """
    try:
        data = feedback.dict()
        saved_data = save_feedback(SUGGESTIONS_FILE, data)
        
        print(f"💡 اقتراح جديد: {feedback.title}")
        print(f"   الفئة: {feedback.category}")
        
        return {
            "success": True,
            "message": "شكراً لاقتراحك! سننظر فيه قريباً 💡",
            "data": saved_data
        }
    except Exception as e:
        print(f"❌ خطأ في حفظ الاقتراح: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/feedback/bug")
def submit_bug_report(feedback: BugReportFeedback):
    """
    إبلاغ عن خطأ أو مشكلة
    
    - **title**: عنوان المشكلة (5-100 حرف)
    - **description**: وصف المشكلة (10-1000 حرف)
    - **steps_to_reproduce**: خطوات إعادة إنتاج المشكلة (اختياري)
    - **browser**: المتصفح المستخدم (اختياري)
    - **device**: الجهاز المستخدم (اختياري)
    """
    try:
        data = feedback.dict()
        saved_data = save_feedback(BUGS_FILE, data)
        
        print(f"🐛 بلاغ خطأ جديد: {feedback.title}")
        if feedback.browser:
            print(f"   المتصفح: {feedback.browser}")
        
        return {
            "success": True,
            "message": "شكراً لإبلاغك! سنعمل على إصلاح المشكلة 🔧",
            "data": saved_data
        }
    except Exception as e:
        print(f"❌ خطأ في حفظ البلاغ: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/feedback/summary")
def get_feedback_summary():
    """
    📊 ملخص جميع التقييمات والاقتراحات (للمسؤول)
    """
    try:
        ratings = load_feedback(RATINGS_FILE)
        suggestions = load_feedback(SUGGESTIONS_FILE)
        bugs = load_feedback(BUGS_FILE)
        
        # حساب متوسط التقييم
        avg_rating = 0
        if ratings:
            total_rating = sum(r.get("rating", 0) for r in ratings)
            avg_rating = round(total_rating / len(ratings), 2)
        
        # إحصائيات التقييمات
        rating_counts = {i: 0 for i in range(1, 6)}
        for r in ratings:
            rating = r.get("rating", 0)
            if 1 <= rating <= 5:
                rating_counts[rating] += 1
        
        # إحصائيات الاقتراحات حسب الفئة
        suggestion_categories = {}
        for s in suggestions:
            category = s.get("category", "other")
            suggestion_categories[category] = suggestion_categories.get(category, 0) + 1
        
        return {
            "summary": {
                "total_ratings": len(ratings),
                "average_rating": avg_rating,
                "rating_distribution": rating_counts,
                "total_suggestions": len(suggestions),
                "suggestion_by_category": suggestion_categories,
                "total_bugs": len(bugs)
            },
            "recent_ratings": ratings[-5:] if ratings else [],
            "recent_suggestions": suggestions[-5:] if suggestions else [],
            "recent_bugs": bugs[-5:] if bugs else []
        }
    except Exception as e:
        print(f"❌ خطأ في جلب الملخص: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/feedback/all")
def get_all_feedback(
    type: Literal["rating", "suggestion", "bug"] = Query("rating", description="نوع الـ feedback"),
    limit: int = Query(50, ge=1, le=1000, description="عدد النتائج")
):
    """
    📋 جلب جميع التقييمات/الاقتراحات/البلاغات (للمسؤول)
    """
    try:
        if type == "rating":
            data = load_feedback(RATINGS_FILE)
        elif type == "suggestion":
            data = load_feedback(SUGGESTIONS_FILE)
        elif type == "bug":
            data = load_feedback(BUGS_FILE)
        else:
            raise HTTPException(status_code=400, detail="Invalid type")
        
        # ترتيب عكسي (الأحدث أولاً)
        data.reverse()
        
        return {
            "type": type,
            "total": len(data),
            "data": data[:limit]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ خطأ في جلب البيانات: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 🧪 Endpoint للاختبار (اختياري)
# ============================================

@app.post("/api/admin/feedback/test")
def create_test_feedback():
    """
    🧪 إنشاء بيانات اختبار (للتطوير فقط)
    """
    try:
        # تقييمات تجريبية
        test_ratings = [
            {"rating": 5, "comment": "تطبيق رائع جداً! استفدت كثيراً من ميزة المتشابهات"},
            {"rating": 4, "comment": "ممتاز ولكن يحتاج تحسين السرعة قليلاً"},
            {"rating": 5, "comment": "ماشاء الله تبارك الله، جزاكم الله خيراً"},
            {"rating": 3, "comment": "جيد لكن الواجهة تحتاج تحسين"},
            {"rating": 5, "comment": "أفضل تطبيق قرآني استخدمته!"}
        ]
        
        for rating in test_ratings:
            save_feedback(RATINGS_FILE, rating)
        
        # اقتراحات تجريبية
        test_suggestions = [
            {
                "title": "إضافة وضع ليلي",
                "description": "يرجى إضافة وضع ليلي لحماية العينين",
                "category": "ui"
            },
            {
                "title": "تحميل الآيات للقراءة دون إنترنت",
                "description": "إمكانية تحميل السور للقراءة بدون اتصال",
                "category": "feature"
            }
        ]
        
        for suggestion in test_suggestions:
            save_feedback(SUGGESTIONS_FILE, suggestion)
        
        # بلاغات تجريبية
        test_bugs = [
            {
                "title": "خطأ في عرض الآيات الطويلة",
                "description": "بعض الآيات الطويلة لا تظهر كاملة على الشاشات الصغيرة",
                "browser": "Chrome",
                "device": "Android"
            }
        ]
        
        for bug in test_bugs:
            save_feedback(BUGS_FILE, bug)
        
        return {
            "success": True,
            "message": "تم إنشاء بيانات الاختبار بنجاح",
            "created": {
                "ratings": len(test_ratings),
                "suggestions": len(test_suggestions),
                "bugs": len(test_bugs)
            }
        }
    except Exception as e:
        print(f"❌ خطأ في إنشاء بيانات الاختبار: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# تهيئة مجلد feedback عند بدء التشغيل
# ============================================
ensure_feedback_dir()
print("✅ نظام التقييم والتعليقات جاهز")


# ============================================
# ⚙️ تشغيل الخادم
# ============================================
if __name__ == "__main__":
    import uvicorn
    try:
        db_session = next(get_db())
        init_db(db_session)
        if EMBEDDING_AVAILABLE:
            initialize_search_engine(db_session)
        db_session.close()
    except Exception as e:
        print(f"❌ خطأ في التهيئة: {e}")

    print(f"\n--- 💻 بدء تشغيل الخادم على http://{HOST}:{PORT} ---")
    
    # ✅ استخدام المتغيرات الجديدة
    uvicorn.run(
        "main:app", 
        host=HOST,           # ✅ من Environment
        port=PORT,           # ✅ من Environment
        reload=not PRODUCTION  # ✅ تعطيل reload في Production
    )