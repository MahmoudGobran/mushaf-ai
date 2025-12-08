"""
سكريبت بناء الفهارس والـ Cache
⚡ يُشغّل مرة واحدة لبناء جميع الفهارس المطلوبة للتحسينات

الفهارس المبنية:
1. FTS5 Index - للبحث الفوري (5-20ms)
2. Similarity Cache - للمتشابهات الفورية (10-50ms)
3. Word Statistics Cache - للإحصائيات الفورية (1-5ms)

الاستخدام:
    python build_indexes.py --all
    python build_indexes.py --fts
    python build_indexes.py --similarity
    python build_indexes.py --stats
"""

import sqlite3
import json  # ⬅️ تغيير من pickle
import time
import argparse
from pathlib import Path
import numpy as np
import sys
import os

# إضافة المسار الحالي
sys.path.append(os.path.dirname(__file__))

from database import get_db, Verse, init_db
from similarity import normalize_arabic_text as clean_text, calculate_similarity

# محاولة استيراد FAISS
try:
    import faiss
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("⚠️ FAISS غير متاح - سيتم تخطي Similarity Cache")

# ============================================
# 1️⃣ بناء FTS5 Index للبحث الفوري
# ============================================

def build_fts5_index():
    """
    ⚡ بناء FTS5 index للبحث الفوري
    السرعة المتوقعة: 5-20ms لكل بحث
    """
    print("\n" + "="*60)
    print("⚡ بناء FTS5 Index للبحث الفوري")
    print("="*60 + "\n")
    
    start_time = time.time()
    
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        
        # التحقق إذا كان الجدول موجوداً
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'")
        if cursor.fetchone():
            print("📝 فهرس FTS5 موجود بالفعل - إعادة البناء...")
            cursor.execute("DROP TABLE IF EXISTS verses_fts")
        
        # إنشاء جدول FTS5
        print("📝 إنشاء جدول FTS5...")
        cursor.execute('''
            CREATE VIRTUAL TABLE verses_fts 
            USING fts5(text, content=verses, content_rowid=id)
        ''')
        
        # ملء الفهرس بالبيانات
        print("📥 ملء الفهرس بالآيات...")
        cursor.execute('''
            INSERT INTO verses_fts(rowid, text)
            SELECT id, text FROM verses
        ''')
        
        conn.commit()
        
        # التحقق من عدد الآيات
        cursor.execute("SELECT COUNT(*) FROM verses_fts")
        count = cursor.fetchone()[0]
        
        conn.close()
        
        elapsed = time.time() - start_time
        
        print(f"\n✅ تم بناء FTS5 index بنجاح!")
        print(f"   📊 عدد الآيات المفهرسة: {count}")
        print(f"   ⏰ الوقت المستغرق: {elapsed:.2f} ثانية")
        print(f"   🚀 السرعة المتوقعة: 5-20ms لكل بحث")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في بناء FTS5: {e}")
        import traceback
        traceback.print_exc()
        return False

# ============================================
# 2️⃣ بناء Similarity Cache للمتشابهات الفورية
# ============================================

def build_similarity_cache(threshold: float = 0.6, top_k: int = 20):
    """
    ⚡ بناء similarity cache للمتشابهات الفورية
    """
    if not FAISS_AVAILABLE:
        print("❌ لا يمكن بناء Similarity Cache - FAISS غير متاح")
        return False
    
    print("\n" + "="*60)
    print("⚡ بناء Similarity Cache للمتشابهات الفورية")
    print("="*60 + "\n")
    
    start_time = time.time()
    
    try:
        # تحميل FAISS والمتجهات
        print("📂 تحميل FAISS والمتجهات...")
        
        faiss_files = ["quran_faiss_index.bin", "quran_embeddings.npy", "quran_ids.npy"]
        for file in faiss_files:
            if not Path(file).exists():
                print(f"❌ ملف {file} غير موجود. قم ببناء FAISS أولاً.")
                return False
        
        faiss_index = faiss.read_index("quran_faiss_index.bin")  # ⬅️ تصحيح اسم الملف
        verse_ids = np.load("quran_ids.npy")
        embeddings = np.load("quran_embeddings.npy")
        
        print(f"✅ تم تحميل {faiss_index.ntotal} متجه")
        
        # جلب الآيات من قاعدة البيانات
        print("📥 جلب الآيات من قاعدة البيانات...")
        db = next(get_db())
        all_verses = db.query(Verse).all()
        verse_dict = {v.id: v for v in all_verses}
        
        # بناء الـ cache
        print(f"🔄 بناء cache للمتشابهات (threshold: {threshold*100}%, top_k: {top_k})...")
        similarity_cache = {}
        
        total_verses = len(verse_ids)
        
        for idx, verse_id in enumerate(verse_ids):
            if (idx + 1) % 100 == 0:
                elapsed_so_far = time.time() - start_time
                progress = (idx + 1) / total_verses * 100
                print(f"   التقدم: {idx + 1}/{total_verses} ({progress:.1f}%) - {elapsed_so_far:.1f}ث")
            
            verse_id = int(verse_id)
            
            # الحصول على المتجه
            target_embedding = embeddings[idx:idx+1].astype('float32')
            
            # البحث في FAISS
            k = min(top_k + 1, faiss_index.ntotal)
            distances, indices = faiss_index.search(target_embedding, k)
            
            # حساب التشابه اللفظي
            similarities = []
            
            for i, dist_idx in enumerate(indices[0]):
                compare_id = int(verse_ids[dist_idx])
                
                if compare_id == verse_id:
                    continue
                
                if compare_id not in verse_dict:
                    continue
                
                target_verse = verse_dict[verse_id]
                compare_verse = verse_dict[compare_id]
                
                lexical_sim = calculate_similarity(
                    clean_text(target_verse.text),
                    clean_text(compare_verse.text),
                    use_words=True
                )
                
                if lexical_sim >= threshold and lexical_sim < 0.99:
                    similarities.append({
                        'verse_id': compare_id,
                        'surah': compare_verse.surah,
                        'surah_name': compare_verse.surah_name,
                        'ayah': compare_verse.ayah,
                        'text': compare_verse.text,
                        'similarity': lexical_sim
                    })
            
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            if similarities:
                similarity_cache[verse_id] = similarities[:top_k]
        
        # حفظ الـ cache في ملف .npy ⬅️ تصحيح
        print("\n💾 حفظ الـ cache في ملف...")
        np.save('similarity_cache.npy', similarity_cache)  # ⬅️ تصحيح
        
        elapsed = time.time() - start_time
        cache_size = len(similarity_cache)
        
        print(f"\n✅ تم بناء similarity cache بنجاح!")
        print(f"   📊 عدد الآيات في الـ cache: {cache_size}")
        print(f"   ⏰ الوقت المستغرق: {elapsed:.2f} ثانية")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ خطأ في بناء similarity cache: {e}")
        import traceback
        traceback.print_exc()
        return False

# ============================================
# 3️⃣ بناء Word Statistics Cache للإحصائيات الفورية
# ============================================

def build_word_stats_cache(min_occurrences: int = 2):  # ⬅️ تخفيض إلى 2
    """
    ⚡ بناء word statistics cache للإحصائيات الفورية
    """
    print("\n" + "="*60)
    print("⚡ بناء Word Statistics Cache للإحصائيات الفورية")
    print("="*60 + "\n")
    
    start_time = time.time()
    
    try:
        # جلب الآيات
        print("📥 جلب الآيات من قاعدة البيانات...")
        db = next(get_db())
        all_verses = db.query(Verse).all()
        
        print(f"✅ تم جلب {len(all_verses)} آية")
        
        # بناء الـ cache
        print(f"🔄 بناء cache للكلمات (min_occurrences: {min_occurrences})...")
        word_stats_cache = {}
        
        # كلمات شائعة يجب استبعادها
        common_words = {
            'في', 'من', 'إلى', 'على', 'عن', 'أن', 'إن', 'ما', 'لا', 'هل', 'بل',
            'قد', 'سى', 'كان', 'يكون', 'قال', 'قل', 'إن', 'أن', 'هو', 'هي', 'هم',
            'كذلك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللائي', 'ذلك', 'هذه',
            'هذا', 'هؤلاء', 'تلك', 'أولئك', 'بعض', 'كل', 'جميع', 'أي', 'أين'
        }
        
        for i, verse in enumerate(all_verses):
            if (i + 1) % 500 == 0:
                print(f"   📊 معالجة الآية {i + 1}/{len(all_verses)}")
            
            text_clean = clean_text(verse.text)
            words = text_clean.split()
            
            for word in words:
                if len(word) < 2 or word in common_words:
                    continue
                
                if word not in word_stats_cache:
                    word_stats_cache[word] = {
                        'total_count': 0,
                        'verses_count': 0,
                        'verses': [],
                        'by_surah': {},
                        'by_juz': {}
                    }
                
                word_stats_cache[word]['total_count'] += 1
                
                # إضافة الآية إذا لم تكن موجودة
                verse_info = {
                    'surah': verse.surah,
                    'surah_name': verse.surah_name,
                    'ayah': verse.ayah,
                    'text': verse.text
                }
                
                if verse_info not in word_stats_cache[word]['verses']:
                    word_stats_cache[word]['verses'].append(verse_info)
                    word_stats_cache[word]['verses_count'] = len(word_stats_cache[word]['verses'])
                
                # إحصائيات حسب السورة
                surah_key = f"{verse.surah_name} ({verse.surah})"
                word_stats_cache[word]['by_surah'][surah_key] = \
                    word_stats_cache[word]['by_surah'].get(surah_key, 0) + 1
                
                # إحصائيات حسب الجزء
                if verse.juz:
                    juz_key = f"الجزء {verse.juz}"
                    word_stats_cache[word]['by_juz'][juz_key] = \
                        word_stats_cache[word]['by_juz'].get(juz_key, 0) + 1
        
        # تصفية حسب min_occurrences
        filtered_cache = {}
        for word, stats in word_stats_cache.items():
            if stats['total_count'] >= min_occurrences:
                # ترتيب الإحصائيات
                stats['by_surah'] = dict(sorted(
                    stats['by_surah'].items(),
                    key=lambda x: x[1],
                    reverse=True
                ))
                
                stats['by_juz'] = dict(sorted(
                    stats['by_juz'].items(),
                    key=lambda x: x[1],
                    reverse=True
                ))
                
                filtered_cache[word] = stats
        
        # حفظ الـ cache في ملف .json ⬅️ تصحيح
        print("\n💾 حفظ الـ cache في ملف...")
        with open('word_stats_cache.json', 'w', encoding='utf-8') as f:
            json.dump(filtered_cache, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        cache_size = len(filtered_cache)
        
        print(f"\n✅ تم بناء word stats cache بنجاح!")
        print(f"   📊 عدد الكلمات في الـ cache: {cache_size}")
        print(f"   ⏰ الوقت المستغرق: {elapsed:.2f} ثانية")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ خطأ في بناء word stats cache: {e}")
        import traceback
        traceback.print_exc()
        return False

# ============================================
# 🎯 الدالة الرئيسية
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="بناء الفهارس والـ Cache للتحسينات الفورية"
    )
    
    parser.add_argument('--all', action='store_true', help='بناء جميع الفهارس')
    parser.add_argument('--fts', action='store_true', help='بناء FTS5 index فقط')
    parser.add_argument('--similarity', action='store_true', help='بناء similarity cache فقط')
    parser.add_argument('--stats', action='store_true', help='بناء word statistics cache فقط')
    
    args = parser.parse_args()
    
    # إذا لم يتم اختيار أي خيار، نبني الكل
    if not (args.all or args.fts or args.similarity or args.stats):
        args.all = True
    
    print("\n" + "="*60)
    print("🚀 سكريبت بناء الفهارس والـ Cache")
    print("="*60)
    
    results = {}
    
    # بناء FTS5
    if args.all or args.fts:
        results['fts5'] = build_fts5_index()
    
    # بناء Similarity Cache (فقط إذا كان FAISS متاحاً)
    if args.all or args.similarity:
        if FAISS_AVAILABLE:
            results['similarity'] = build_similarity_cache()
        else:
            print("\n⚠️ تخطي Similarity Cache - FAISS غير متاح")
            results['similarity'] = None
    
    # بناء Word Statistics Cache
    if args.all or args.stats:
        results['stats'] = build_word_stats_cache()
    
    # ملخص النتائج
    print("\n" + "="*60)
    print("📊 ملخص النتائج")
    print("="*60)
    
    for key, result in results.items():
        if result is not None:
            status = "✅ نجح" if result else "❌ فشل"
            print(f"   {key}: {status}")
    
    print("="*60)

if __name__ == "__main__":
    main()