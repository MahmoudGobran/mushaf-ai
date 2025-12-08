"""
سكريبت تحميل بيانات القرآن الكريم من Tanzil.net
ضع هذا الملف في: mushaf-ai/backend/download_quran.py
ثم شغّله: python download_quran.py
"""

import requests
import csv
import re

def download_quran():
    """تحميل النص القرآني من Tanzil"""
    
    print("📥 جاري تحميل بيانات القرآن من Tanzil.net...")
    
    # رابط النص القرآني (نسخة simple-clean بدون تشكيل كامل)
    url = "https://tanzil.net/trans/?transID=ar.jalalayn&type=txt"
    
    # لكن الأفضل استخدام API مباشر:
    url = "http://api.alquran.cloud/v1/quran/ar.alafasy"
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        verses = []
        
        # استخراج البيانات
        for surah in data['data']['surahs']:
            surah_number = surah['number']
            surah_name = surah['englishName']
            
            for ayah in surah['ayahs']:
                ayah_number = ayah['numberInSurah']
                ayah_text = ayah['text']
                
                verses.append({
                    'id': len(verses) + 1,
                    'surah': surah_number,
                    'surah_name': surah_name,
                    'ayah': ayah_number,
                    'text': ayah_text
                })
        
        # حفظ في ملف CSV
        with open('quran_data.csv', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'surah', 'surah_name', 'ayah', 'text'])
            writer.writeheader()
            writer.writerows(verses)
        
        print(f"✅ تم! تم تحميل {len(verses)} آية")
        print(f"📄 الملف محفوظ في: quran_data.csv")
        
        # عرض عينة
        print("\n📖 عينة من البيانات:")
        for i in range(5):
            v = verses[i]
            print(f"{v['surah']}:{v['ayah']} - {v['text'][:50]}...")
        
        return verses
        
    except Exception as e:
        print(f"❌ خطأ في التحميل: {e}")
        print("💡 سنستخدم طريقة بديلة...")
        return download_quran_alternative()


def download_quran_alternative():
    """طريقة بديلة باستخدام Tanzil مباشرة"""
    
    print("📥 جاري التحميل من المصدر البديل...")
    
    # تحميل من Tanzil (نسخة simple)
    url = "https://tanzil.net/pub/download/tanzil.net/translations/ar.jalalayn.txt"
    
    try:
        response = requests.get(url, timeout=30)
        response.encoding = 'utf-8'
        lines = response.text.split('\n')
        
        verses = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            # الصيغة: رقم_السورة|رقم_الآية|النص
            parts = line.split('|')
            if len(parts) >= 3:
                surah = int(parts[0])
                ayah = int(parts[1])
                text = '|'.join(parts[2:])  # في حال كان هناك | في النص
                
                verses.append({
                    'id': len(verses) + 1,
                    'surah': surah,
                    'surah_name': get_surah_name(surah),
                    'ayah': ayah,
                    'text': text
                })
        
        # حفظ في CSV
        with open('quran_data.csv', 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'surah', 'surah_name', 'ayah', 'text'])
            writer.writeheader()
            writer.writerows(verses)
        
        print(f"✅ تم! تم تحميل {len(verses)} آية")
        return verses
        
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return None


def get_surah_name(surah_number):
    """إرجاع اسم السورة"""
    surah_names = [
        "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", 
        "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", 
        "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون",
        "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", 
        "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", 
        "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف",
        "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر",
        "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف",
        "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم",
        "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان",
        "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الانفطار", "المطففين",
        "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
        "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة",
        "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل",
        "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص",
        "الفلق", "الناس"
    ]
    
    if 1 <= surah_number <= 114:
        return surah_names[surah_number - 1]
    return f"سورة {surah_number}"


if __name__ == "__main__":
    print("=" * 50)
    print("🌙 المصحف الذكي - تحميل البيانات")
    print("=" * 50)
    
    verses = download_quran()
    
    if verses:
        print("\n✅ العملية نجحت!")
        print("📁 يمكنك الآن المتابعة لإنشاء قاعدة البيانات")
    else:
        print("\n❌ فشل التحميل. جرّب مرة أخرى أو اسألني للمساعدة")