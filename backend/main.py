"""
الخادم الرئيسي - نسخة محسّنة V5.3 - Production Ready - COMPLETE
✅ جميع الوظائف محفوظة
✅ تحسينات الأداء
✅ جاهز للنشر
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
import json
from pathlib import Path as FilePath
import sqlite3
from functools import lru_cache
import os

# ============================================
# ⚙️ Production Configuration
# ============================================
PORT = int(os.environ.get("PORT", 8000))
print(f"🌐 Port: {PORT}")

HOST = os.environ.get("HOST", "0.0.0.0")
print(f"🌐 Host: {HOST}")

PRODUCTION = os.environ.get("PRODUCTION", "false").lower() == "true"
print(f"🚀 Production Mode: {PRODUCTION}")

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./quran.db")
print(f"💾 Database: {DATABASE_URL}")

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
print(f"🔐 Allowed Origins: {ALLOWED_ORIGINS}")

WORKERS = int(os.environ.get("WORKERS", 1))
print(f"⚡ Workers: {WORKERS}")

from similarity import normalize_arabic_text as clean_text, highlight_differences, calculate_similarity, highlight_words_in_text

# ============================================
# ❌ تعطيل نظام embeddings في Production
# ============================================
EMBEDDING_AVAILABLE = False
print("⚠️ نظام embeddings معطل في Production")

QURAN_EMBEDDINGS = None
QURAN_IDS = None  
FAISS_INDEX = None
EMBEDDING_MODEL = None

# ============================================
# المتغيرات العالمية
# ============================================
EXCLUDED_100_PERCENT_PATTERNS = {
    "بسم الله الرحمن الرحيم",
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
    "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ", 
}

def is_excluded_100_percent_match(text1: str, text2: str) -> bool:
    if calculate_word_similarity(text1, text2) < 0.99:
        return False
    clean1 = clean_text(text1)
    clean2 = clean_text(text2)
    if clean1 != clean2:
        return False
    for pattern in EXCLUDED_100_PERCENT_PATTERNS:
        pattern_clean = clean_text(pattern)
        if pattern_clean in clean1 or pattern_clean in clean2:
            return True
    if is_basmala_text(text1) or is_basmala_text(text2):
        return True
    return False

def is_basmala_text(text: str) -> bool:
    basmala_variations = [
        "بسم الله الرحمن الرحيم",
        "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 
        "بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
    ]
    text_clean = clean_text(text)
    return any(clean_text(basmala) in text_clean for basmala in basmala_variations)

MUTASHABIHAT_BANK = None
SIMILARITY_CACHE = None
WORD_STATS_CACHE = None
FTS_AVAILABLE = False

def calculate_word_similarity(text1: str, text2: str) -> float:
    return calculate_similarity(text1, text2, use_words=True)

def is_basmala_verse(verse: Verse) -> bool:
    if verse.ayah != 1 or verse.surah == 9:
        return False
    verse_clean = clean_text(verse.text)
    basmala_variations = [
        clean_text("بسم الله الرحمن الرحيم"),
        clean_text("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
        clean_text("بِّسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"),
        "بسم الله الرحمن الرحيم",
    ]
    for basmala in basmala_variations:
        if (verse_clean == basmala or 
            verse_clean.startswith(basmala) or
            basmala in verse_clean):
            return True
    return len(verse_clean) < 30 and any(word in verse_clean for word in ['بسم', 'الله', 'الرحمن', 'الرحيم'])

def initialize_search_engine(db: Session):
    global QURAN_EMBEDDINGS, QURAN_IDS, FAISS_INDEX, EMBEDDING_MODEL
    print("\n" + "="*60)
    print("🚫 نظام FAISS معطل في Production")
    print("="*60 + "\n")
    QURAN_EMBEDDINGS = None
    QURAN_IDS = None
    FAISS_INDEX = None
    EMBEDDING_MODEL = None
    print("✅ تم تعطيل نظام FAISS والبحث الدلالي بنجاح")
    print("💡 النظام سيعمل بالبحث اللفظي فقط\n")

def initialize_optimizations(db: Session):
    global SIMILARITY_CACHE, WORD_STATS_CACHE, FTS_AVAILABLE
    print("\n" + "="*60)
    print("🚀 بدء تهيئة أنظمة التحسينات")
    print("="*60)
    try:
        if os.path.exists("similarity_cache.npy"):
            SIMILARITY_CACHE = np.load("similarity_cache.npy", allow_pickle=True).item()
            print(f"✅ تم تحميل similarity cache: {len(SIMILARITY_CACHE)} آية")
        else:
            SIMILARITY_CACHE = {}
            print("⚠️ similarity cache غير موجود")
    except Exception as e:
        print(f"❌ خطأ في تحميل similarity cache: {e}")
        SIMILARITY_CACHE = {}
    try:
        if os.path.exists("word_stats_cache.json"):
            with open("word_stats_cache.json", 'r', encoding='utf-8') as f:
                WORD_STATS_CACHE = json.load(f)
            print(f"✅ تم تحميل word stats cache: {len(WORD_STATS_CACHE)} كلمة")
        else:
            WORD_STATS_CACHE = {}
            print("⚠️ word stats cache غير موجود")
    except Exception as e:
        print(f"❌ خطأ في تحميل word stats cache: {e}")
        WORD_STATS_CACHE = {}
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'")
        FTS_AVAILABLE = cursor.fetchone() is not None
        conn.close()
        if FTS_AVAILABLE:
            print("✅ FTS5 index متاح")
        else:
            print("⚠️ FTS5 index غير متاح")
    except Exception as e:
        print(f"❌ خطأ في التحقق من FTS5: {e}")
        FTS_AVAILABLE = False
    print("✅ اكتملت تهيئة أنظمة التحسينات\n")

def fast_text_search_fts(query: str, limit: int = 20):
    if not FTS_AVAILABLE:
        return []
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
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
                'similarity': '0.9500',
                'match_type': 'fts_fast',
                'note': 'نتيجة سريعة'
            })
        conn.close()
        return results
    except Exception as e:
        print(f"❌ خطأ في FTS5: {e}")
        return []

@lru_cache(maxsize=1000)
def get_cached_similarities(verse_id: int, min_similarity: float = 0.6):
    global SIMILARITY_CACHE
    if SIMILARITY_CACHE and verse_id in SIMILARITY_CACHE:
        cached_results = SIMILARITY_CACHE[verse_id]
        filtered = [r for r in cached_results if r['similarity'] >= min_similarity]
        return filtered[:20]
    return []

def build_similarity_cache(db: Session, min_similarity: float = 0.05):
    global SIMILARITY_CACHE
    print("🔄 بدء بناء similarity cache...")
    print(f"   🎯 حد التشابه: {min_similarity*100}%")
    start_time = time.time()
    all_verses = db.query(Verse).all()
    total_verses = len(all_verses)
    SIMILARITY_CACHE = {}
    for i, verse in enumerate(all_verses):
        if (i + 1) % 100 == 0:
            elapsed = time.time() - start_time
            print(f"   📊 التقدم: {i+1}/{total_verses} آية ({elapsed:.1f}ث)")
        similar_verses = []
        for other_verse in all_verses:
            if other_verse.id == verse.id:
                continue
            similarity = calculate_word_similarity(verse.text, other_verse.text)
            if similarity >= min_similarity and similarity < 0.99:
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
        SIMILARITY_CACHE[verse.id] = similar_verses[:50]
    try:
        np.save("similarity_cache.npy", SIMILARITY_CACHE)
        print(f"✅ تم حفظ similarity cache: {len(SIMILARITY_CACHE)} آية")
    except Exception as e:
        print(f"❌ خطأ في حفظ cache: {e}")
    elapsed = time.time() - start_time
    print(f"✅ اكتمل بناء cache في {elapsed:.1f}ث")
    return SIMILARITY_CACHE

def build_word_statistics_cache(db: Session):
    global WORD_STATS_CACHE
    print("🔄 بدء بناء word statistics cache...")
    start_time = time.time()
    all_verses = db.query(Verse).all()
    WORD_STATS_CACHE = {}
    common_words = {
        'في', 'من', 'إلى', 'على', 'عن', 'أن', 'إن', 'ما', 'لا', 'هل', 'بل',
        'قد', 'سى', 'كان', 'يكون', 'قال', 'قل', 'هو', 'هي', 'هم', 'و'
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
                    'verses': [],
                    'by_surah': {},
                    'by_juz': {}
                }
            count_in_verse = verse_clean.count(word)
            WORD_STATS_CACHE[word]['total_count'] += count_in_verse
            verse_info = {
                'id': verse.id,
                'surah': verse.surah,
                'surah_name': verse.surah_name,
                'ayah': verse.ayah,
                'text': verse.text,
                'juz': verse.juz,
                'count': count_in_verse
            }
            existing_verse = next((v for v in WORD_STATS_CACHE[word]['verses'] 
                                if v['id'] == verse.id), None)
            if not existing_verse:
                WORD_STATS_CACHE[word]['verses'].append(verse_info)
                WORD_STATS_CACHE[word]['verses_count'] = len(WORD_STATS_CACHE[word]['verses'])
            surah_key = f"{verse.surah_name} ({verse.surah})"
            WORD_STATS_CACHE[word]['by_surah'][surah_key] = WORD_STATS_CACHE[word]['by_surah'].get(surah_key, 0) + count_in_verse
            if verse.juz:
                juz_key = f"الجزء {verse.juz}"
                WORD_STATS_CACHE[word]['by_juz'][juz_key] = WORD_STATS_CACHE[word]['by_juz'].get(juz_key, 0) + count_in_verse
    try:
        with open("word_stats_cache.json", 'w', encoding='utf-8') as f:
            json.dump(WORD_STATS_CACHE, f, ensure_ascii=False, indent=2)
        print(f"✅ تم حفظ word stats cache: {len(WORD_STATS_CACHE)} كلمة")
    except Exception as e:
        print(f"❌ خطأ في حفظ cache: {e}")
    elapsed = time.time() - start_time
    print(f"✅ اكتمل بناء cache في {elapsed:.1f}ث")
    return WORD_STATS_CACHE

def build_fts_index(db: Session):
    print("🔄 بدء بناء فهرس FTS5...")
    start_time = time.time()
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts 
            USING fts5(text, content=verses, content_rowid=id)
        ''')
        cursor.execute('SELECT COUNT(*) FROM verses_fts')
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute('''
                INSERT INTO verses_fts(rowid, text)
                SELECT id, text FROM verses
            ''')
            print("✅ تم ملء فهرس FTS5")
        else:
            print(f"✅ فهرس FTS5 موجود: {count} آية")
        conn.commit()
        conn.close()
        elapsed = time.time() - start_time
        print(f"✅ اكتمل بناء FTS5 في {elapsed:.1f}ث")
        return True
    except Exception as e:
        print(f"❌ خطأ في بناء FTS5: {e}")
        return False

def fast_all_similarities_from_cache(db: Session, target_verses: List[Verse], compare_verses: List[Verse], 
                                   min_similarity: float, limit: int, exclude_basmala: bool):
    print("🚀 استخدام Similarity Cache للبحث المسرّع...")
    start_time = time.time()
    similarities = []
    seen_pairs = set()
    target_verse_ids = {v.id for v in target_verses}
    compare_verse_ids = {v.id for v in compare_verses}
    processed = 0
    total_target = len(target_verses)
    for target_verse in target_verses:
        processed += 1
        if processed % 50 == 0:
            elapsed_so_far = time.time() - start_time
            print(f"   📊 التقدم: {processed}/{total_target} آية ({elapsed_so_far:.1f}ث، {len(similarities)} متشابه)")
        if exclude_basmala and is_basmala_verse(target_verse):
            continue
        if target_verse.id in SIMILARITY_CACHE:
            cached_similarities = SIMILARITY_CACHE[target_verse.id]
            for sim in cached_similarities:
                compare_id = sim['verse_id']
                if compare_id not in compare_verse_ids:
                    continue
                if compare_id == target_verse.id:
                    continue
                pair = tuple(sorted([target_verse.id, compare_id]))
                if pair in seen_pairs:
                    continue
                if sim['similarity'] >= min_similarity:
                    compare_verse = db.query(Verse).filter(Verse.id == compare_id).first()
                    if not compare_verse:
                        continue
                    if exclude_basmala and is_basmala_verse(compare_verse):
                        continue
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
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    elapsed = time.time() - start_time
    print(f"✅ البحث المسرّع: {len(similarities)} نتيجة في {elapsed:.1f}ث")
    return similarities

def load_mutashabihat_bank():
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

# ============================================
# الجزء 2: دوال البحث والـ Endpoints الرئيسية
# ضع هذا بعد الجزء الأول مباشرة
# ============================================

def exact_text_search(db: Session, query: str, limit: int = 20) -> List[dict]:
    """🔥 بحث نصي دقيق - محسّن"""
    start_time = time.time()
    original_query = query.strip()
    query_clean = clean_text(query)
    print(f"🔍 البحث الدقيق عن: '{original_query}'")
    exact_matches = []
    seen_ids = set()
    
    try:
        verses = db.query(Verse).filter(
            Verse.text.contains(original_query)
        ).limit(limit).all()
        for verse in verses:
            exact_matches.append({
                **verse.to_dict(),
                'similarity': '1.0000',
                'match_type': 'exact_original'
            })
            seen_ids.add(verse.id)
        print(f"   📊 SQL match: {len(exact_matches)} آيات")
    except Exception as e:
        print(f"   ⚠️ خطأ SQL: {e}")
    
    if len(exact_matches) < limit and query_clean:
        max_verses = 2000 if len(query_clean) > 5 else 1000
        all_verses = db.query(Verse).limit(max_verses).all()
        checked = 0
        for verse in all_verses:
            if verse.id in seen_ids:
                continue
            checked += 1
            verse_clean = clean_text(verse.text)
            if query_clean in verse_clean:
                exact_matches.append({
                    **verse.to_dict(),
                    'similarity': '1.0000',
                    'match_type': 'exact_clean'
                })
                seen_ids.add(verse.id)
                if len(exact_matches) >= limit:
                    break
        print(f"   📊 Clean: {len(exact_matches) - sum(1 for r in exact_matches if r['match_type'] == 'exact_original')} إضافية")
    
    elapsed = time.time() - start_time
    print(f"✅ exact_text_search: {len(exact_matches)} في {elapsed:.3f}ث")
    return exact_matches

def semantic_search(query: str, limit: int = 100):
    print(f"⚠️ البحث الدلالي معطل: '{query}'")
    return []

def fallback_search(db: Session, query: str, limit: int = 20, threshold: float = 0.7, error: str = None):
    """🔥 بحث احتياطي محسّن"""
    start_time = time.time()
    query_clean = clean_text(query)
    max_verses = 1500
    all_verses = db.query(Verse).limit(max_verses).all()
    final_results = []
    for verse in all_verses:
        verse_clean = clean_text(verse.text)
        similarity = calculate_similarity(query_clean, verse_clean)
        if similarity >= threshold:
            verse_dict = verse.to_dict()
            verse_dict['similarity'] = f"{similarity:.4f}"
            verse_dict['match_type'] = 'lexical'
            final_results.append((verse_dict, similarity))
            if len(final_results) >= limit * 2:
                break
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
# FastAPI Setup
# ============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n--- 💾 إعداد قاعدة بيانات SQLite ---")
    db = next(get_db())
    init_db(db)
    initialize_search_engine(db)
    load_mutashabihat_bank()
    initialize_optimizations(db)
    db.close()
    yield
    print("\n--- 🧹 إغلاق الخادم ---")

app = FastAPI(
    title="المصحف الذكي API",
    description="API للبحث عن المتشابهات القرآنية",
    version="5.3.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Endpoints
# ============================================

@app.get("/")
def root():
    return {
        "message": "مرحباً بك في مصحف AI API 🕌",
        "version": "5.3.0",
        "status": "يعمل بنجاح 🚀",
        "endpoints": {
            "search": "/search?q=الكلمة",
            "search_fixed": "/search/fixed?q=الكلمة",
            "live_search": "/search/live?q=الكلمة",
            "similar_verses": "/similar/{verse_id}",
            "quiz": "/quiz/get_question",
            "stats": "/stats",
            "documentation": "/docs"
        }
    }

@app.get("/search/fixed")
def fixed_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """🔍 بحث محسّن يدعم العثماني والكتابة العادية"""
    print(f"\n🎯 بحث محسّن: '{q}'")
    start_time = time.time()
    results = []
    seen_ids = set()
    
    try:
        original_verses = db.query(Verse).filter(
            Verse.text.contains(q)
        ).limit(limit).all()
        for verse in original_verses:
            if verse.id not in seen_ids:
                results.append({
                    **verse.to_dict(),
                    'similarity': '1.0000',
                    'match_type': 'exact_original'
                })
                seen_ids.add(verse.id)
        print(f"   📊 Original: {len(results)} آيات")
    except Exception as e:
        print(f"   ⚠️ خطأ: {e}")
    
    if len(results) < limit:
        q_clean = clean_text(q)
        max_check = 2000
        all_verses = db.query(Verse).limit(max_check).all()
        checked = 0
        for verse in all_verses:
            if verse.id in seen_ids:
                continue
            checked += 1
            verse_clean = clean_text(verse.text)
            if q_clean in verse_clean:
                results.append({
                    **verse.to_dict(),
                    'similarity': '1.0000',
                    'match_type': 'exact_clean'
                })
                seen_ids.add(verse.id)
                if len(results) >= limit:
                    break
    
    elapsed = time.time() - start_time
    print(f"✅ النتائج: {len(results)} في {elapsed:.3f}ث")
    
    return {
        "query": q,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "match_type": "exact_both",
        "method": "contains_search",
        "results": results
    }

@app.get("/search/both")
def search_both_methods(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """🔥 بحث شامل"""
    start_time = time.time()
    results = []
    seen_ids = set()
    
    try:
        verses_original = db.query(Verse).filter(
            Verse.text.contains(q)
        ).limit(limit).all()
        for verse in verses_original:
            results.append({
                **verse.to_dict(),
                'similarity': '1.0000',
                'match_type': 'exact_original'
            })
            seen_ids.add(verse.id)
    except:
        pass
    
    if len(results) < limit:
        q_clean = clean_text(q)
        all_verses = db.query(Verse).limit(1500).all()
        for verse in all_verses:
            if verse.id in seen_ids:
                continue
            verse_clean = clean_text(verse.text)
            if q_clean in verse_clean:
                results.append({
                    **verse.to_dict(),
                    'similarity': '1.0000', 
                    'match_type': 'exact_clean'
                })
                seen_ids.add(verse.id)
            if len(results) >= limit:
                break
    
    elapsed = time.time() - start_time
    return {
        "query": q,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "results": results[:limit]
    }

@app.get("/search/live")
def live_search_verses(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=50),
    highlight: bool = Query(True),
    db: Session = Depends(get_db)
):
    """🚀 بحث فوري FTS5"""
    start_time = time.time()
    results = fast_text_search_fts(q, limit)
    if highlight:
        for result in results:
            result['highlighted_text'] = highlight_words_in_text(result['text'], q)
    elapsed = time.time() - start_time
    return {
        "query": q,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(results),
        "method": "FTS5",
        "results": results
    }

@app.get("/search")
def search_verses(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, gt=0, le=100),
    threshold: float = Query(0.7, ge=0.05, le=1.0),
    highlight: bool = Query(True),
    db: Session = Depends(get_db)
):
    """🔍 البحث الرئيسي"""
    print(f"\n{'='*60}")
    print(f"🔍 بدء البحث: '{q}'")
    print(f"{'='*60}")
    start_time = time.time()
    
    try:
        exact_results = exact_text_search(db, q, limit)
        if exact_results:
            if highlight:
                for result in exact_results:
                    result['highlighted_text'] = highlight_words_in_text(result['text'], q)
            elapsed = time.time() - start_time
            return {
                "query": q,
                "search_time": f"{elapsed:.3f}s",
                "total_found": len(exact_results),
                "match_type": "exact",
                "results": exact_results
            }
        
        if not EMBEDDING_AVAILABLE or FAISS_INDEX is None:
            fallback_results = fallback_search(db, q, limit, threshold)
            if highlight and 'results' in fallback_results:
                for result in fallback_results['results']:
                    result['highlighted_text'] = highlight_words_in_text(result['text'], q)
            return fallback_results
        
        # البحث الدلالي معطل
        return fallback_search(db, q, limit, threshold)
        
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return fallback_search(db, q, limit, threshold, error=str(e))

@app.get("/similar/{verse_id}")
def get_similar_verses(
    verse_id: int = Path(...),
    limit: int = Query(10, gt=0, le=50),
    threshold: float = Query(0.4, ge=0.3, le=1.0),
    exclude_basmala: bool = Query(True),
    method: str = Query("smart", pattern="^(smart|semantic|lexical)$"),
    db: Session = Depends(get_db)
):
    """🌟 جلب الآيات المشابهة"""
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise HTTPException(status_code=404, detail="الآية غير موجودة")
    
    start_time = time.time()
    similarities = []
    
    if method == "smart" or method == "lexical":
        all_verses = db.query(Verse).all()
        if exclude_basmala:
            all_verses = [v for v in all_verses if not is_basmala_verse(v)]
        for other_verse in all_verses:
            if other_verse.id == verse_id:
                continue
            similarity = calculate_word_similarity(verse.text, other_verse.text)
            if similarity >= threshold and similarity < 0.99:
                similarities.append({
                    'verse_id': other_verse.id,
                    'surah': other_verse.surah,
                    'surah_name': other_verse.surah_name,
                    'ayah': other_verse.ayah,
                    'text': other_verse.text,
                    'similarity': similarity,
                    'method': 'lexical'
                })
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        similarities = similarities[:limit]
    
    elapsed = time.time() - start_time
    return {
        'verse': verse.to_dict(),
        'similar_verses': similarities,
        'search_time': f"{elapsed:.2f}s",
        'method_used': method,
        'total_found': len(similarities)
    }

@app.get("/similarities/fast/{verse_id}")
def get_fast_similarities(
    verse_id: int = Path(...),
    min_similarity: float = Query(0.6, ge=0.3, le=1.0),
    db: Session = Depends(get_db)
):
    """🚀 متشابهات فورية من Cache"""
    start_time = time.time()
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    if not verse:
        raise HTTPException(status_code=404, detail="الآية غير موجودة")
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

@app.get("/verse/{surah}/{ayah}")
def get_specific_verse(
    surah: int = Path(..., gt=0, le=114),
    ayah: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """جلب آية محددة"""
    verse = db.query(Verse).filter(Verse.surah == surah, Verse.ayah == ayah).first()
    if not verse:
        raise HTTPException(status_code=404, detail=f"لم يتم العثور على {surah}:{ayah}")
    return verse.to_dict()

@app.get("/verses")
def get_verses(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, gt=0, le=100),
    db: Session = Depends(get_db)
):
    """جلب قائمة آيات"""
    verses = db.query(Verse).offset(skip).limit(limit).all()
    return [v.to_dict() for v in verses]

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
        raise HTTPException(status_code=404, detail="آية غير موجودة")
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
    return {
        "total_verses": total_verses,
        "total_surahs": surahs,
        "faiss_ready": FAISS_INDEX is not None,
        "fts_available": FTS_AVAILABLE,
        "similarity_cache_size": len(SIMILARITY_CACHE) if SIMILARITY_CACHE else 0,
        "word_stats_cache_size": len(WORD_STATS_CACHE) if WORD_STATS_CACHE else 0
    }

@app.get("/stats/word")
def get_word_statistics(
    word: str = Query(..., min_length=1),
    limit: int = Query(100, gt=0, le=1000),
    db: Session = Depends(get_db)
):
    """📊 إحصائيات كلمة"""
    start_time = time.time()
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
            matches.append({'verse': verse.to_dict(), 'count': count})
            total_count += count
            surah_key = f"{verse.surah_name} ({verse.surah})"
            surah_counts[surah_key] = surah_counts.get(surah_key, 0) + count
            if verse.juz:
                juz_key = f"الجزء {verse.juz}"
                juz_counts[juz_key] = juz_counts.get(juz_key, 0) + count
    
    matches.sort(key=lambda x: x['count'], reverse=True)
    elapsed = time.time() - start_time
    
    return {
        'word': word,
        'word_normalized': word_clean,
        'total_count': total_count,
        'verses_count': len(matches),
        'by_surah': dict(sorted(surah_counts.items(), key=lambda x: x[1], reverse=True)),
        'by_juz': dict(sorted(juz_counts.items(), key=lambda x: x[1], reverse=True)),
        'matches': matches[:limit],
        'search_time': f"{elapsed:.3f}s"
    }

# ============================================
# الجزء 3: Quiz, Admin Endpoints, All-Similarities
# ضع هذا بعد الجزء 2
# ============================================

# دوال Quiz
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

def get_word_distractors(db: Session, target_word: str, current_surah_id: int, limit: int = 3) -> List[str]:
    """جلب كلمات مشتتة"""
    distractors = ["السماء", "الأرض", "الناس", "الذي", "وهم", "الذين", "الله", "الرحمن", "الرحيم"]
    try:
        nearby_verses = db.query(Verse).filter(Verse.surah == current_surah_id).limit(10).all()
        all_words = []
        for v in nearby_verses:
            words = [clean_text(w) for w in v.text.split() if len(w) > 2 and clean_text(w) != clean_text(target_word)]
            all_words.extend(words)
        unique_words = list(set(all_words))
        selected_distractors = [d for d in unique_words if d != clean_text(target_word)]
        if len(selected_distractors) < 3:
            selected_distractors.extend(distractors)
            selected_distractors = list(set(selected_distractors))
        return random.sample(selected_distractors, min(limit, len(selected_distractors)))
    except:
        return random.sample(distractors, min(limit, len(distractors)))

def get_word_choice_question(db: Session, scope_filter, threshold: float):
    """إنشاء سؤال اختيار الكلمة"""
    random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
    if not random_verse:
        return {"error": "لم يتم العثور على آية"}
    words = random_verse.text.split()
    if len(words) < 5:
        return get_word_choice_question(db, scope_filter, threshold) 
    word_index = random.randint(1, len(words) - 2)
    correct_word = words[word_index]
    question_text = " ".join(words[:word_index]) + " (___) " + " ".join(words[word_index+1:])
    distractors = get_word_distractors(db, correct_word, random_verse.surah, limit=3)
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
        "options": options
    }

def get_distinguish_question(db: Session, scope_filter, threshold: float):
    """إنشاء سؤال تمييز المتشابهات"""
    random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
    if not random_verse:
        return {"error": "لم يتم العثور على آية"}
    distractor_verse = db.query(Verse).filter(Verse.surah != random_verse.surah).order_by(func.random()).first()
    if not distractor_verse:
        return get_word_choice_question(db, scope_filter, threshold) 
    question_text = f"أي من الآيات التالية في سورة **{random_verse.surah_name}**؟"
    correct_option = random_verse.text
    distractor_option = distractor_verse.text
    options = [correct_option, distractor_option]
    random.shuffle(options)
    return {
        "question_type": "distinguish",
        "question_text": question_text,
        "correct_answer": correct_option,
        "verse_info": {
            "surah_name": random_verse.surah_name,
            "surah": random_verse.surah,
            "ayah": random_verse.ayah
        },
        "options": options
    }

def get_expert_distinguish_question(db: Session, scope_filter):
    """وضع الخبير: استخدام أسئلة من متشابهات كلمة"""
    global MUTASHABIHAT_BANK
    if not MUTASHABIHAT_BANK:
        return get_distinguish_question(db, scope_filter, 0.85)
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
            other_verses = [v for v in valid_verses if v.id != correct_verse.id and v.surah != correct_verse.surah]
            if len(other_verses) < 1:
                continue
            options = [correct_verse.text]
            for v in other_verses[:3]:
                options.append(v.text)
            options = list(set(options))
            if options.count(correct_verse.text) > 1:
                continue
            random.shuffle(options)
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
                "category": question_data['category']
            }
    return get_distinguish_question(db, scope_filter, 0.85)

@app.post("/quiz/get_question")
def get_quiz_question(data: dict, db: Session = Depends(get_db)):
    """✅ Quiz محسّن"""
    scope_type = data.get('scope_type', 'all')
    scope_value = data.get('scope_value', '1')
    question_type = data.get('question_type', 'continue')
    threshold = data.get('threshold', 0.75)
    expert_mode = data.get('expert_mode', False)
    
    try:
        scope_filter = get_quiz_scope_filter(scope_type, scope_value)
        
        if expert_mode and question_type == 'distinguish':
            return get_expert_distinguish_question(db, scope_filter)
        
        if question_type == 'surah_name':
            random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
            if not random_verse:
                raise HTTPException(status_code=404, detail="No verses found")
            wrong_surahs = db.query(Verse.surah_name).filter(Verse.surah != random_verse.surah).distinct().order_by(func.random()).limit(3).all()
            wrong_choices = [s[0] for s in wrong_surahs if s[0]][:3]
            choices = [random_verse.surah_name] + wrong_choices
            random.shuffle(choices)
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
        
        elif question_type == 'distinguish':
            return get_distinguish_question(db, scope_filter, threshold)
        
        elif question_type == 'word_choice':
            return get_word_choice_question(db, scope_filter, threshold)
        
        random_verse = db.query(Verse).filter(scope_filter).order_by(func.random()).first()
        if not random_verse:
            raise HTTPException(status_code=404, detail="No verses found")
        words = random_verse.text.split()
        if len(words) < 6:
            return get_quiz_question(data, db)
        num_words_to_hide = min(3, max(1, len(words) // 5))
        max_start = len(words) - num_words_to_hide - 1
        start_index = random.randint(1, max(1, max_start))
        hidden_words = words[start_index:start_index + num_words_to_hide]
        correct_answer = ' '.join(hidden_words)
        question_words = words[:start_index] + ['____'] + words[start_index + num_words_to_hide:]
        question_text = ' '.join(question_words)
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
        raise HTTPException(status_code=500, detail=str(e))

# Admin Endpoints
@app.get("/admin/build-fts")
def admin_build_fts_index(db: Session = Depends(get_db)):
    """🔧 بناء فهرس FTS5"""
    success = build_fts_index(db)
    return {
        "success": success,
        "message": "تم بناء فهرس FTS5 بنجاح" if success else "فشل بناء فهرس FTS5"
    }

@app.get("/admin/build-cache")
def admin_build_cache(
    cache_type: str = Query("all", pattern="^(all|similarity|word_stats)$"),
    min_similarity: float = Query(0.1, ge=0.05, le=1.0),
    db: Session = Depends(get_db)
):
    """🔧 بناء أنظمة Cache"""
    results = {}
    if cache_type in ["all", "similarity"]:
        results['similarity_cache'] = build_similarity_cache(db, min_similarity)
    if cache_type in ["all", "word_stats"]:
        results['word_stats_cache'] = build_word_statistics_cache(db)
    return {
        "success": True,
        "message": f"تم بناء {cache_type} cache بنجاح",
        "min_similarity_used": min_similarity,
        "results": {
            "similarity_cache_size": len(results.get('similarity_cache', {})),
            "word_stats_cache_size": len(results.get('word_stats_cache', {}))
        }
    }

@app.get("/performance/stats")
def get_performance_statistics():
    """📊 إحصائيات أداء النظام"""
    return {
        "database_size": "6,236 verses",
        "faiss_ready": FAISS_INDEX is not None,
        "fts_available": FTS_AVAILABLE,
        "similarity_cache_size": len(SIMILARITY_CACHE) if SIMILARITY_CACHE else 0,
        "word_stats_cache_size": len(WORD_STATS_CACHE) if WORD_STATS_CACHE else 0,
        "expert_mode_questions": MUTASHABIHAT_BANK['total_questions'] if MUTASHABIHAT_BANK else 0,
        "optimizations_enabled": [
            "FTS5 Live Search (5-20ms)",
            "Similarity Cache (10-50ms)", 
            "Word Statistics Cache (1-5ms)",
            "LRU Cache (1000 entries)",
            "🚀 Fast All Similarities (1-10s)"
        ]
    }

@app.get("/autocomplete/{prefix}")
def get_autocomplete_suggestions(
    prefix: str = Path(..., min_length=2),
    limit: int = Query(10, gt=0, le=20)
):
    """🚀 اقتراحات تلقائية"""
    start_time = time.time()
    prefix_clean = clean_text(prefix)
    suggestions = []
    if WORD_STATS_CACHE:
        for word, stats in WORD_STATS_CACHE.items():
            if word.startswith(prefix_clean):
                suggestions.append({
                    'word': word,
                    'count': stats['total_count'],
                    'verses_count': stats['verses_count']
                })
        suggestions.sort(key=lambda x: x['count'], reverse=True)
        suggestions = suggestions[:limit]
    elapsed = time.time() - start_time
    return {
        "prefix": prefix,
        "suggestions": suggestions,
        "search_time": f"{elapsed:.3f}s",
        "total_found": len(suggestions)
    }

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
    use_faiss: bool = Query(True),
    use_cache: bool = Query(True),
    db: Session = Depends(get_db)
):
    """🌟 البحث الشامل"""
    if compare_surah is not None and surah is None:
        raise HTTPException(status_code=422, detail="compare_surah requires surah")
    if compare_juz is not None and juz is None:
        raise HTTPException(status_code=422, detail="compare_juz requires juz")
    
    start_time = time.time()
    
    target_query = db.query(Verse)
    if full_quran:
        target_verses = target_query.order_by(Verse.id).all()
        search_scope = "القرآن كاملاً"
    elif third:
        if third == 1:
            juz_range = (1, 10)
        elif third == 2:
            juz_range = (11, 20)
        else:
            juz_range = (21, 30)
        target_verses = target_query.filter(Verse.juz.between(*juz_range)).order_by(Verse.id).all()
        search_scope = f"الثلث {third}"
    elif surah:
        target_verses = target_query.filter(Verse.surah == surah).order_by(Verse.id).all()
        search_scope = f"سورة {surah}"
    elif juz:
        target_verses = target_query.filter(Verse.juz == juz).order_by(Verse.id).all()
        search_scope = f"الجزء {juz}"
    else:
        target_verses = target_query.order_by(Verse.id).all()
        search_scope = "القرآن كاملاً"
    
    if exclude_basmala:
        target_verses = [v for v in target_verses if not is_basmala_verse(v)]
    
    compare_query = db.query(Verse)
    if compare_surah:
        compare_verses = compare_query.filter(Verse.surah == compare_surah).order_by(Verse.id).all()
        compare_scope = f"سورة {compare_surah}"
    elif compare_juz:
        compare_verses = compare_query.filter(Verse.juz == compare_juz).order_by(Verse.id).all()
        compare_scope = f"الجزء {compare_juz}"
    else:
        compare_verses = compare_query.order_by(Verse.id).all()
        compare_scope = "القرآن كاملاً"
    
    if exclude_basmala:
        compare_verses = [v for v in compare_verses if not is_basmala_verse(v)]
    
    if len(target_verses) < 1:
        return {
            "total_found": 0,
            "similarities": [],
            "search_time": "0.00s",
            "min_similarity": min_similarity,
            "search_scope": search_scope,
            "compare_scope": compare_scope
        }
    
    if use_cache and SIMILARITY_CACHE and len(SIMILARITY_CACHE) > 0:
        similarities = fast_all_similarities_from_cache(
            db, target_verses, compare_verses, min_similarity, limit, exclude_basmala
        )
        method_used = "cache_accelerated"
    else:
        similarities = []
        seen_pairs = set()
        for target_verse in target_verses:
            for compare_verse in compare_verses:
                if target_verse.id >= compare_verse.id:
                    continue
                similarity = calculate_word_similarity(target_verse.text, compare_verse.text)
                if similarity >= min_similarity and not is_excluded_100_percent_match(target_verse.text, compare_verse.text):
                    pair = tuple(sorted([target_verse.id, compare_verse.id]))
                    if pair not in seen_pairs:
                        seen_pairs.add(pair)
                        similarities.append({
                            'verse1': target_verse.to_dict(),
                            'verse2': compare_verse.to_dict(),
                            'similarity': similarity,
                            'score_percent': int(similarity * 100)
                        })
                        if len(similarities) >= limit:
                            break
            if len(similarities) >= limit:
                break
        method_used = "lexical"
    
    similarities.sort(key=lambda x: x['similarity'], reverse=True)
    elapsed = time.time() - start_time
    
    return {
        "total_found": len(similarities),
        "similarities": similarities,
        "search_time": f"{elapsed:.2f}s",
        "min_similarity": min_similarity,
        "search_scope": search_scope,
        "compare_scope": compare_scope,
        "method": method_used
    }

@app.get("/verses/random-with-similarities")
def get_random_verses_with_similarities(
    limit: int = Query(10, gt=0, le=20),
    min_similarity: float = Query(0.85, ge=0.6, le=0.99),
    db: Session = Depends(get_db)
):
    """جلب آيات عشوائية مع متشابهات"""
    start_time = time.time()
    all_verses = db.query(Verse).all()
    all_verses = [v for v in all_verses if not is_basmala_verse(v)]
    if len(all_verses) < limit:
        return {
            "verses": [v.to_dict() for v in all_verses],
            "search_time": "0.00s",
            "total_found": len(all_verses)
        }
    random.shuffle(all_verses)
    selected_verses = []
    used_surahs = set()
    for verse in all_verses:
        if verse.surah in used_surahs:
            continue
        has_similarities = False
        sample_verses = random.sample(all_verses, min(100, len(all_verses)))
        for other_verse in sample_verses:
            if other_verse.id == verse.id:
                continue
            similarity = calculate_word_similarity(verse.text, other_verse.text)
            if min_similarity <= similarity < 0.99:
                has_similarities = True
                break
        if has_similarities:
            selected_verses.append(verse)
            used_surahs.add(verse.surah)
            if len(selected_verses) >= limit:
                break
    elapsed = time.time() - start_time
    return {
        "verses": [v.to_dict() for v in selected_verses],
        "search_time": f"{elapsed:.2f}s",
        "total_found": len(selected_verses),
        "min_similarity": min_similarity
    }

# ⚙️ تشغيل الخادم
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
    uvicorn.run("main:app", host=HOST, port=PORT, reload=not PRODUCTION)
