# check_database.py
import sqlite3
import pandas as pd

def check_database():
    print("🔍 فحص قاعدة البيانات القرآنية")
    print("=" * 60)
    
    conn = sqlite3.connect('quran.db')
    cursor = conn.cursor()
    
    # 1. التحقق من هيكل الجدول
    print("📊 هيكل جدول verses:")
    cursor.execute("PRAGMA table_info(verses)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"   {col[1]} ({col[2]})")
    
    print()
    
    # 2. عد الآيات
    cursor.execute("SELECT COUNT(*) FROM verses")
    total_verses = cursor.fetchone()[0]
    print(f"📈 إجمالي الآيات: {total_verses}")
    
    # 3. توزيع الأجزاء
    print("\n🎯 توزيع الآيات على الأجزاء:")
    cursor.execute("SELECT juz, COUNT(*) FROM verses GROUP BY juz ORDER BY juz")
    juz_distribution = cursor.fetchall()
    for juz, count in juz_distribution:
        print(f"   الجزء {juz}: {count} آية")
    
    # 4. عينة من الآيات
    print("\n🔍 عينة من الآيات (الأولى من كل جزء):")
    cursor.execute("""
        SELECT v1.surah, v1.ayah, v1.juz, substr(v1.text, 1, 30) as text_sample
        FROM verses v1
        WHERE v1.id IN (
            SELECT MIN(id) FROM verses WHERE juz = v1.juz
        )
        ORDER BY v1.juz
        LIMIT 5
    """)
    sample_verses = cursor.fetchall()
    for surah, ayah, juz, text in sample_verses:
        print(f"   الجزء {juz} - سورة {surah}:{ayah} - {text}...")
    
    # 5. التحقق من البسملات
    print("\n🚫 فحص البسملات:")
    cursor.execute("""
        SELECT surah, ayah, text 
        FROM verses 
        WHERE ayah = 1 AND surah != 9
        ORDER BY surah
        LIMIT 3
    """)
    basmala_verses = cursor.fetchall()
    for surah, ayah, text in basmala_verses:
        print(f"   سورة {surah}:{ayah} - {text[:40]}...")
    
    # 6. فحص بعض الآيات المتشابهة المعروفة
    print("\n🎯 فحص آيات متشابهة معروفة:")
    
    # آيات معروفة بتشابهها
    similar_verse_pairs = [
        (2, 285, 3, 199),  # "آمن الرسول..." متشابهة
        (1, 2, 37, 182),   # "الحمد لله رب العالمين"
        (23, 1, 70, 29)    # "قد أفلح المؤمنون"
    ]
    
    for surah1, ayah1, surah2, ayah2 in similar_verse_pairs:
        cursor.execute("SELECT text FROM verses WHERE surah = ? AND ayah = ?", (surah1, ayah1))
        verse1 = cursor.fetchone()
        cursor.execute("SELECT text FROM verses WHERE surah = ? AND ayah = ?", (surah2, ayah2))
        verse2 = cursor.fetchone()
        
        if verse1 and verse2:
            print(f"   {surah1}:{ayah1} vs {surah2}:{ayah2}")
            print(f"   النص 1: {verse1[0][:30]}...")
            print(f"   النص 2: {verse2[0][:30]}...")
            print()
    
    # 7. فحص البيانات الفعلية في CSV (إذا موجود)
    try:
        print("\n📁 فحص ملف CSV الأصلي:")
        df = pd.read_csv('quran_data.csv')
        print(f"   عدد الصفوف في CSV: {len(df)}")
        print(f"   الأعمدة: {list(df.columns)}")
        print("   عينة من البيانات:")
        print(df.head(3))
    except Exception as e:
        print(f"   ⚠️ لا يمكن قراءة CSV: {e}")
    
    conn.close()

if __name__ == "__main__":
    check_database()