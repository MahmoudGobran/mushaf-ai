"""
سكريبت التنظيف الآمن - لحذف ملفات التحسينات فقط
يُستخدم قبل تعديل build_indexes.py أو main.py
"""

import os
import sqlite3

def safe_cleanup():
    """تنظيف آمن لملفات التحسينات فقط"""
    
    print("🧹 بدء التنظيف الآمن...")
    print("=" * 50)
    
    # 1. حذف ملفات الـ Cache الجديدة
    cache_files = ['word_stats_cache.json', 'similarity_cache.npy']
    
    for file in cache_files:
        if os.path.exists(file):
            os.remove(file)
            print(f"✅ تم حذف: {file}")
        else:
            print(f"ℹ️  غير موجود: {file}")
    
    # 2. حذف فهرس FTS5 من قاعدة البيانات
    try:
        conn = sqlite3.connect('quran.db')
        cursor = conn.cursor()
        
        # التحقق من وجود الجدول أولاً
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'")
        if cursor.fetchone():
            cursor.execute('DROP TABLE verses_fts')
            print("✅ تم حذف فهرس FTS5 من قاعدة البيانات")
        else:
            print("ℹ️  فهرس FTS5 غير موجود في قاعدة البيانات")
            
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"⚠️ خطأ في حذف FTS5: {e}")
    
    print("=" * 50)
    print("🎉 اكتمل التنظيف الآمن!")
    print("\n📝 الآن يمكنك:")
    print("   1. تعديل build_indexes.py أو main.py")
    print("   2. تشغيل: python build_indexes.py")
    print("   3. تشغيل: python main.py")

def check_protected_files():
    """التحقق من أن الملفات المحمية موجودة"""
    print("\n🔍 التحقق من الملفات المحمية...")
    
    protected_files = [
        'quran.db',
        'quran_embeddings.npy', 
        'quran_faiss_index.bin',
        'quran_ids.npy',
        'database.py',
        'similarity.py',
        'embedding_processor.py'
    ]
    
    all_exist = True
    for file in protected_files:
        if os.path.exists(file):
            print(f"✅ محفوظ: {file}")
        else:
            print(f"⚠️  مفقود: {file}")
            all_exist = False
    
    return all_exist

if __name__ == "__main__":
    print("🚀 سكريبت التنظيف الآمن لملفات التحسينات")
    print("=" * 50)
    
    # التحقق من الملفات المحمية أولاً
    if check_protected_files():
        response = input("\nهل تريد متابعة التنظيف؟ (y/n): ")
        if response.lower() == 'y':
            safe_cleanup()
        else:
            print("❌ تم إلغاء العملية")
    else:
        print("\n❌ بعض الملفات الأساسية مفقودة! لا تتابع التنظيف.")