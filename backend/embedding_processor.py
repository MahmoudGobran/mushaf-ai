"""
معالج تضمين الآيات (Vectors) - نسخة Production
===========================================
يحتوي على الدوال المسؤولة عن توليد وحفظ وتحميل متجهات الآيات (Embeddings)

🔴 تم تعطيل SentenceTransformer لتوفير الذاكرة (2.1 GB)
✅ نستخدم فقط المتجهات الجاهزة (24 MB) + FAISS Index (24 MB)

التغييرات الرئيسية:
1. ❌ تعطيل model.encode() → لن نحتاج SentenceTransformer
2. ✅ تحميل embeddings جاهزة فقط من quran_embeddings.npy
3. ✅ تحميل FAISS index من quran_faiss_index.bin
4. ⚠️ البحث الدلالي معطّل مؤقتاً (يحتاج model.encode)
"""

import numpy as np
import faiss
import time
import os
import io
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
# 🔴 تم إزالة: from sentence_transformers import SentenceTransformer

# ملفات البيانات (موجودة ومبنية مسبقاً)
EMBEDDINGS_FILE = "quran_embeddings.npy"       # 24 MB - متجهات جاهزة
FAISS_INDEX_FILE = "quran_faiss_index.bin"    # 24 MB - فهرس FAISS
QURAN_IDS_FILE = "quran_ids.npy"              # صغير جداً

# 🔴 النموذج معطّل في Production
# EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-large"  # 2.1 GB
PRODUCTION_MODE = True  # وضع Production - بدون Model

# ===========================================
# استيراد متأخر لتجنب الاعتماد الدوري
# ===========================================
def get_verse_model(db: Session):
    """جلب نموذج الآية من database.py"""
    from database import Verse 
    return Verse

# ===========================================
# 🔴 تم تعطيل: توليد المتجهات (لن نحتاجها في Production)
# ===========================================

def generate_embeddings(db: Session, model=None) -> Tuple[np.ndarray, np.ndarray]:
    """
    ❌ معطّل في Production Mode
    
    السبب: يحتاج SentenceTransformer (2.1 GB)
    البديل: نستخدم المتجهات الجاهزة في quran_embeddings.npy
    """
    if PRODUCTION_MODE:
        print("⚠️ توليد المتجهات معطّل في Production Mode")
        print("✅ سنستخدم المتجهات الجاهزة من quran_embeddings.npy")
        return np.array([]), np.array([])
    
    # الكود القديم (لن يعمل في Production)
    # ...

# ===========================================
# ✅ تحميل البيانات الجاهزة فقط (بدون Model)
# ===========================================

def load_or_generate_embeddings(db: Session) -> Tuple[np.ndarray, np.ndarray, faiss.IndexFlatL2, None]:
    """
    تحميل الفهرس والمتجهات الجاهزة من الملفات
    
    🔴 التغيير: لن نحمّل SentenceTransformer (توفير 2.1 GB)
    ✅ النتيجة: startup سريع (2-3 ثواني) بدلاً من (30-45 ثانية)
    
    Returns:
        embeddings: np.ndarray - المتجهات الجاهزة (24 MB)
        verse_ids: np.ndarray - معرفات الآيات
        faiss_index: faiss.IndexFlatL2 - الفهرس الجاهز (24 MB)
        model: None - ❌ معطّل في Production
    """
    embeddings = None
    verse_ids = None
    faiss_index = None
    
    Verse = get_verse_model(db)
    
    # 🔴 تم إزالة: تحميل SentenceTransformer
    print("🚀 Production Mode: تحميل البيانات الجاهزة فقط (بدون Model)")
    model = None  # لن نحمّل Model في Production
    
    # ✅ تحميل الملفات الجاهزة
    if os.path.exists(FAISS_INDEX_FILE) and os.path.exists(QURAN_IDS_FILE) and os.path.exists(EMBEDDINGS_FILE):
        try:
            print(f"🔄 جاري تحميل المتجهات من {EMBEDDINGS_FILE}...")
            embeddings = np.load(EMBEDDINGS_FILE)
            print(f"✅ تم تحميل المتجهات. الشكل: {embeddings.shape}")
            
            print(f"🔄 جاري تحميل الفهرس من {FAISS_INDEX_FILE}...")
            faiss_index = faiss.read_index(FAISS_INDEX_FILE)
            print(f"✅ تم تحميل الفهرس بنجاح. عدد العناصر: {faiss_index.ntotal}")
            
            verse_ids = np.load(QURAN_IDS_FILE)
            print(f"✅ تم تحميل المعرفات. العدد: {len(verse_ids)}")
            
            print("=" * 50)
            print("✅ النظام جاهز! (بدون Model - توفير 2.1 GB)")
            print("=" * 50)
            
            return embeddings, verse_ids, faiss_index, model
            
        except Exception as e:
            print(f"❌ خطأ في تحميل ملفات الفهرس: {e}")
            print("⚠️ تأكد من وجود الملفات التالية:")
            print(f"   - {EMBEDDINGS_FILE}")
            print(f"   - {FAISS_INDEX_FILE}")
            print(f"   - {QURAN_IDS_FILE}")
            return np.array([]).astype('float32'), np.array([]), None, model
    else:
        print("❌ الملفات الجاهزة غير موجودة!")
        print("⚠️ يجب توفير الملفات التالية:")
        print(f"   - {EMBEDDINGS_FILE} (المتجهات)")
        print(f"   - {FAISS_INDEX_FILE} (الفهرس)")
        print(f"   - {QURAN_IDS_FILE} (المعرفات)")
        return np.array([]).astype('float32'), np.array([]), None, model

# ===========================================
# ⚠️ البحث الدلالي - معطّل مؤقتاً
# ===========================================

def search_similar_verses_faiss(
    query_text: str,
    limit: int,
    faiss_index: faiss.IndexFlatL2,
    embedding_model,  # 🔴 سيكون None في Production
    verse_ids: np.ndarray,
    db: Session,
    threshold: float = 0.4
) -> List[dict]:
    """
    البحث في الفهرس عن آيات متشابهة دلالياً
    
    ⚠️ معطّل في Production Mode لأنه يحتاج model.encode()
    
    البديل المتاح:
    - ✅ البحث النصي العادي (يعمل 100%)
    - ✅ البحث بالكلمات المفتاحية (يعمل 100%)
    - ✅ الإحصائيات والأسئلة (تعمل 100%)
    
    ملاحظة: يمكن تفعيل هذه الميزة لاحقاً عند استخدام خدمة أكبر
    """
    Verse = get_verse_model(db)
    
    # 🔴 التحقق من وجود Model (لن يكون موجوداً)
    if embedding_model is None:
        print("⚠️ البحث الدلالي معطّل في Production Mode")
        print("✅ استخدم البحث النصي العادي بدلاً منه")
        return []
    
    # 🔴 التحقق من الفهرس
    if faiss_index is None or verse_ids.size == 0:
        print("❌ محرك البحث غير مهيأ.")
        return []
        
    # 🔴 الكود التالي لن يعمل بدون Model
    # لأن model.encode() تحتاج SentenceTransformer
    
    """
    # الكود القديم (معطّل):
    start_time = time.time()
    
    # 1. توليد متجه النص المُدخل (يحتاج Model!)
    query_embedding = embedding_model.encode(
        [query_text], 
        convert_to_numpy=True, 
        normalize_embeddings=True
    )[0]
    query_embedding = np.expand_dims(query_embedding, axis=0).astype('float32')
    
    # 2. البحث في الفهرس
    k = limit + 1
    D, I = faiss_index.search(query_embedding, k)
    
    # ... باقي الكود
    """
    
    print("⚠️ البحث الدلالي يحتاج SentenceTransformer (معطّل في Production)")
    return []


# ===========================================
# ✅ دالة مساعدة: الحصول على embedding جاهز حسب index
# ===========================================

def get_embedding_by_verse_id(
    verse_id: int,
    embeddings: np.ndarray,
    verse_ids: np.ndarray
) -> Optional[np.ndarray]:
    """
    الحصول على متجه جاهز لآية معينة
    
    ✅ يعمل بدون Model (نستخدم المتجهات الجاهزة)
    
    مفيد لـ:
    - مقارنة الآيات
    - حساب التشابه
    - العمليات الإحصائية
    """
    try:
        # إيجاد موقع الآية في المصفوفة
        index = np.where(verse_ids == verse_id)[0]
        
        if len(index) > 0:
            return embeddings[index[0]]
        else:
            print(f"⚠️ لم يتم العثور على الآية {verse_id}")
            return None
            
    except Exception as e:
        print(f"❌ خطأ في get_embedding_by_verse_id: {e}")
        return None


# ===========================================
# ✅ معلومات النظام
# ===========================================

def get_system_info(
    embeddings: np.ndarray,
    faiss_index: faiss.IndexFlatL2,
    model
) -> dict:
    """
    معلومات حالة النظام
    
    مفيد لـ:
    - التأكد من تحميل الملفات
    - معرفة استهلاك الذاكرة
    - Debugging
    """
    return {
        'production_mode': PRODUCTION_MODE,
        'model_loaded': model is not None,
        'embeddings_loaded': embeddings is not None and embeddings.size > 0,
        'faiss_index_loaded': faiss_index is not None,
        'total_verses': len(embeddings) if embeddings is not None else 0,
        'embedding_dimension': embeddings.shape[1] if embeddings is not None and len(embeddings.shape) > 1 else 0,
        'memory_saved_gb': 2.1,  # تم توفير 2.1 GB
        'features_available': {
            'text_search': True,          # ✅ يعمل
            'semantic_search': False,     # ❌ معطّل
            'statistics': True,           # ✅ يعمل
            'approved_questions': True,   # ✅ يعمل
            'verse_retrieval': True,      # ✅ يعمل
        }
    }