"""
إعداد قاعدة البيانات - النسخة المبسطة (تعتمد على CSV فقط)
"""

from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Iterator
import pandas as pd
import os

# ============================================
# ⚙️ إعداد الاتصال بقاعدة البيانات
# ============================================
DATABASE_URL = "sqlite:///./quran.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================
# 📂 ملف CSV المستخدم
# ============================================
CSV_FILE = "quran_data_arabic_juz.csv"

# ============================================
# 📖 نموذج الآية
# ============================================
class Verse(Base):
    __tablename__ = "verses"
    
    id = Column(Integer, primary_key=True, index=True)
    surah = Column(Integer, index=True)
    surah_name = Column(String)
    ayah = Column(Integer)
    text = Column(Text)
    juz = Column(Integer, index=True)  # ✅ مهم للبحث السريع

    def to_dict(self):
        return {
            "id": self.id,
            "surah": self.surah,
            "surah_name": self.surah_name,
            "ayah": self.ayah,
            "text": self.text,
            "juz": self.juz
        }

# ============================================
# 💾 تحميل البيانات من ملف CSV
# ============================================
def load_data_from_csv(db: Session, csv_path: str = CSV_FILE) -> bool:
    """تحميل بيانات القرآن من ملف CSV"""
    
    if db.query(Verse).count() > 0:
        print("✅ قاعدة البيانات معبأة بالفعل. تخطي تحميل CSV.")
        return True

    if not os.path.exists(csv_path):
        print(f"❌ الملف غير موجود: {csv_path}")
        return False
    
    print(f"📂 جاري تحميل البيانات من {csv_path}...")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"📊 الأعمدة الموجودة: {df.columns.tolist()}")
        
        # ✅ التحقق من الأعمدة المطلوبة
        required_columns = ['id', 'surah', 'surah_name', 'ayah', 'text', 'juz']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"❌ أعمدة مفقودة في CSV: {missing_columns}")
            return False
        
        print(f"✅ جميع الأعمدة المطلوبة موجودة")
        
        # ✅ التحقق من صحة البيانات
        print("\n🔍 فحص صحة البيانات...")
        
        # تحقق من نطاق الأجزاء
        juz_min = df['juz'].min()
        juz_max = df['juz'].max()
        print(f"   📊 نطاق الأجزاء: {juz_min} - {juz_max}")
        
        if juz_min < 1 or juz_max > 30:
            print(f"   ⚠️ تحذير: نطاق الأجزاء غير طبيعي!")
        else:
            print(f"   ✅ نطاق الأجزاء صحيح (1-30)")
        
        # تحقق من القيم الفارغة
        null_juz = df['juz'].isnull().sum()
        if null_juz > 0:
            print(f"   ⚠️ تحذير: {null_juz} آية بدون رقم جزء!")
        else:
            print(f"   ✅ لا توجد قيم فارغة في عمود juz")
        
        # ✅ تحميل البيانات
        print(f"\n📥 جاري تحميل {len(df)} آية...")
        
        for idx, row in df.iterrows():
            # التحقق من صحة البيانات
            if pd.isna(row['juz']):
                print(f"   ⚠️ تخطي الآية {row['id']}: juz فارغ")
                continue
            
            verse = Verse(
                id=int(row['id']),
                surah=int(row['surah']),
                surah_name=str(row['surah_name']).strip(),  # ✅ إزالة مسافات زائدة
                ayah=int(row['ayah']),
                text=str(row['text']).strip(),
                juz=int(row['juz'])
            )
            db.merge(verse)
            
            # عرض التقدم
            if (idx + 1) % 1000 == 0:
                print(f"   📊 تم تحميل {idx + 1}/{len(df)} آية...")
        
        db.commit()
        
        # ✅ التحقق النهائي
        total_loaded = db.query(Verse).count()
        print(f"\n✅ تم تحميل {total_loaded} آية بنجاح")
        
        # عرض إحصائيات
        print(f"\n📊 إحصائيات:")
        print(f"   عدد السور: {db.query(Verse.surah).distinct().count()}")
        print(f"   عدد الأجزاء: {db.query(Verse.juz).distinct().count()}")
        
        # عرض توزيع الآيات على الأجزاء
        print(f"\n📋 توزيع الآيات على الأجزاء:")
        juz_counts = db.query(Verse.juz, func.count(Verse.id)).group_by(Verse.juz).order_by(Verse.juz).all()
        
        from sqlalchemy import func
        for juz_num, count in juz_counts:
            print(f"   الجزء {juz_num}: {count} آية")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في تحميل البيانات: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

# ============================================
# 🏗️ تهيئة قاعدة البيانات
# ============================================
def init_db(db: Session):
    """إنشاء الجداول وتحميل البيانات"""
    print("📝 جاري إنشاء الجداول في قاعدة البيانات...")
    Base.metadata.create_all(bind=engine)
    load_data_from_csv(db)

# ============================================
# 🔄 جلسة قاعدة البيانات
# ============================================
def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()