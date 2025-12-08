# verify_juz.py
import sqlite3

def verify_juz():
    print("🔍 التحقق من بيانات الأجزاء في قاعدة البيانات")
    print("=" * 60)
    
    conn = sqlite3.connect('quran.db')
    cursor = conn.cursor()
    
    # التحقق من وجود بيانات الأجزاء
    cursor.execute("SELECT COUNT(*) FROM verses WHERE juz IS NULL")
    null_juz = cursor.fetchone()[0]
    print(f"📊 الآيات بدون جزء: {null_juz}")
    
    # عينة من الآيات مع أجزائها
    print("\n🎯 عينة من الآيات مع أجزائها:")
    cursor.execute("""
        SELECT surah, ayah, juz, substr(text, 1, 30) 
        FROM verses 
        WHERE juz IS NOT NULL
        ORDER BY RANDOM() 
        LIMIT 10
    """)
    sample = cursor.fetchall()
    for surah, ayah, juz, text in sample:
        print(f"   سورة {surah}:{ayah} → الجزء {juz} - {text}...")
    
    # التحقق من حدود الأجزاء المعروفة
    print("\n🔍 التحقق من حدود الأجزاء:")
    known_boundaries = [
        (2, 142, 2),   # البقرة:142 → جزء 2
        (2, 253, 3),   # البقرة:253 → جزء 3  
        (3, 93, 4),    # آل عمران:93 → جزء 4
        (15, 1, 14),   # الحجر:1 → جزء 14
    ]
    
    for surah, ayah, expected_juz in known_boundaries:
        cursor.execute("SELECT juz FROM verses WHERE surah = ? AND ayah = ?", (surah, ayah))
        result = cursor.fetchone()
        actual_juz = result[0] if result else None
        status = "✅" if actual_juz == expected_juz else "❌"
        print(f"   {status} سورة {surah}:{ayah} → جزء {actual_juz} (متوقع: {expected_juz})")
    
    conn.close()

if __name__ == "__main__":
    verify_juz()