"""
استخراج بيانات الضوابط من ملفات PDF - نسخة محسّنة للنصوص العربية
قم بتشغيل هذا السكريبت في نفس مجلد ملفات PDF

المكتبات المطلوبة:
pip install pdfplumber pymupdf
"""

import json
import os
import re

# محاولة استيراد المكتبات المختلفة
try:
    import pdfplumber
    PDF_LIBRARY = 'pdfplumber'
    print("✅ استخدام مكتبة: pdfplumber")
except ImportError:
    try:
        import fitz  # PyMuPDF
        PDF_LIBRARY = 'pymupdf'
        print("✅ استخدام مكتبة: PyMuPDF")
    except ImportError:
        import PyPDF2
        PDF_LIBRARY = 'pypdf2'
        print("⚠️ استخدام مكتبة: PyPDF2 (قد لا تعمل جيداً مع العربية)")
        print("💡 نصيحة: ثبت مكتبة أفضل: pip install pdfplumber")

def extract_text_from_pdf(pdf_path):
    """استخراج النص الكامل من ملف PDF"""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"خطأ في قراءة {pdf_path}: {e}")
        return ""

def parse_rules_structure(text, surah_name):
    """
    تحليل النص واستخراج الضوابط
    يمكن تعديل هذه الدالة حسب هيكل الكتاب
    """
    rules = []
    
    # نمط 1: البحث عن أرقام الآيات (مثل: الآية 5، آية 10)
    verse_pattern = r'(?:الآية|آية)\s*(\d+)'
    
    # نمط 2: البحث عن الفوائد والضوابط
    rule_pattern = r'(?:الفائدة|الضابط|القاعدة)[\s:]*(.+?)(?=\n|الفائدة|الضابط|القاعدة|$)'
    
    lines = text.split('\n')
    current_rule = {}
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # البحث عن رقم الآية
        verse_match = re.search(verse_pattern, line)
        if verse_match:
            if current_rule:
                rules.append(current_rule)
            
            current_rule = {
                'surah': surah_name,
                'verse_number': int(verse_match.group(1)),
                'rule': '',
                'description': '',
                'examples': [],
                'raw_text': line
            }
        
        # البحث عن الضابط/القاعدة
        rule_match = re.search(rule_pattern, line, re.DOTALL)
        if rule_match and current_rule:
            current_rule['rule'] = rule_match.group(1).strip()
        
        # إضافة السطور التالية كوصف
        elif current_rule and line and not verse_match:
            if len(current_rule['description']) < 500:  # حد أقصى للوصف
                current_rule['description'] += ' ' + line
    
    if current_rule:
        rules.append(current_rule)
    
    return rules

def process_all_pdfs():
    """معالجة جميع ملفات PDF"""
    
    pdf_files = {
        'آية وفوائد من سورة البقرة 1443.pdf': 'البقرة',
        'آية وفوائد من سورة التوبة 1443.pdf': 'التوبة',
        'آية وفوائد من سورة الروم 1443.pdf': 'الروم'
    }
    
    all_rules = []
    
    for pdf_file, surah_name in pdf_files.items():
        if not os.path.exists(pdf_file):
            print(f"⚠️ الملف غير موجود: {pdf_file}")
            continue
        
        print(f"📖 معالجة: {pdf_file}...")
        
        # استخراج النص
        text = extract_text_from_pdf(pdf_file)
        
        if text:
            # حفظ النص الخام للمراجعة
            with open(f'{surah_name}_raw.txt', 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"✅ تم حفظ النص الخام في: {surah_name}_raw.txt")
            
            # استخراج الضوابط
            rules = parse_rules_structure(text, surah_name)
            all_rules.extend(rules)
            print(f"✅ تم استخراج {len(rules)} ضابط")
        else:
            print(f"❌ فشل استخراج النص من {pdf_file}")
    
    # حفظ جميع الضوابط في ملف JSON
    output_file = 'quran_rules.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_rules, f, ensure_ascii=False, indent=2)
    
    print(f"\n🎉 تم الانتهاء! إجمالي الضوابط: {len(all_rules)}")
    print(f"📄 الملف المحفوظ: {output_file}")
    
    return all_rules

def create_sql_insert(rules):
    """إنشاء جمل SQL للإدراج في قاعدة البيانات"""
    
    sql_statements = []
    sql_statements.append("""
CREATE TABLE IF NOT EXISTS quran_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surah TEXT NOT NULL,
    verse_number INTEGER NOT NULL,
    rule TEXT,
    description TEXT,
    examples TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
    
    for rule in rules:
        examples_json = json.dumps(rule.get('examples', []), ensure_ascii=False)
        sql = f"""
INSERT INTO quran_rules (surah, verse_number, rule, description, examples, category)
VALUES ('{rule['surah']}', {rule['verse_number']}, 
        '{rule['rule'].replace("'", "''")}', 
        '{rule['description'].replace("'", "''")}',
        '{examples_json}', NULL);
"""
        sql_statements.append(sql)
    
    # حفظ في ملف SQL
    with open('insert_rules.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print("✅ تم إنشاء ملف SQL: insert_rules.sql")

if __name__ == "__main__":
    print("=" * 50)
    print("🌙 استخراج بيانات الضوابط من PDF")
    print("=" * 50)
    print()
    
    # التحقق من المكتبات المطلوبة
    try:
        import PyPDF2
    except ImportError:
        print("⚠️ المكتبة PyPDF2 غير مثبتة!")
        print("قم بتثبيتها: pip install PyPDF2")
        exit(1)
    
    # معالجة الملفات
    rules = process_all_pdfs()
    
    # إنشاء ملف SQL
    if rules:
        create_sql_insert(rules)
        
        # عرض مثال من النتائج
        print("\n" + "=" * 50)
        print("📋 مثال من الضوابط المستخرجة:")
        print("=" * 50)
        for i, rule in enumerate(rules[:3], 1):
            print(f"\n{i}. سورة {rule['surah']} - آية {rule['verse_number']}")
            print(f"   الضابط: {rule['rule'][:100]}...")
            print(f"   الوصف: {rule['description'][:100]}...")
    else:
        print("\n❌ لم يتم استخراج أي ضوابط!")
        print("💡 نصيحة: تحقق من:")
        print("   1. وجود ملفات PDF في نفس المجلد")
        print("   2. صحة أسماء الملفات")
        print("   3. إمكانية قراءة الملفات")