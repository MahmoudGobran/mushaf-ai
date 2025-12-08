import os
import sys

def check_imports_in_project(root_dir):
    """تحقق من استيراد المكتبات المحذوفة في المشروع"""
    
    imports_to_check = [
        "import pandas",
        "import sklearn",
        "import scikit_learn",
        "import scipy",
        "from pandas",
        "from sklearn",
        "from scikit_learn",
        "from scipy"
    ]
    
    print("🔍 البحث عن استيرادات المكتبات المحذوفة...\n")
    
    found_imports = []
    
    for root, dirs, files in os.walk(root_dir):
        # تجاهل مجلدات virtual environment و node_modules
        dirs[:] = [d for d in dirs if not any(
            ignore in root for ignore in [
                'venv', '.venv', 'env', '__pycache__', 
                'node_modules', '.git', 'dist', 'build'
            ]
        )]
        
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                
                # تجاهل ملف السكربت نفسه
                if file == "check_imports.py":
                    continue
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for line_num, line in enumerate(lines, 1):
                            for import_stmt in imports_to_check:
                                if import_stmt in line and not line.strip().startswith('#'):
                                    found_imports.append({
                                        'file': file_path,
                                        'import': import_stmt,
                                        'line': line_num,
                                        'code': line.strip()
                                    })
                except Exception as e:
                    print(f"⚠️  خطأ في قراءة {file_path}: {e}")
    
    # عرض النتائج
    if found_imports:
        print("❌ تم العثور على استيرادات للمكتبات المحذوفة:\n")
        for item in found_imports:
            print(f"📄 {item['file']}")
            print(f"   📍 السطر {item['line']}: {item['code']}")
            print(f"   📌 يحتوي على: {item['import']}")
            print(f"   🔗 الحل: تعليق السطر (#) أو استبداله\n")
        
        print(f"\n📊 الإحصاء: {len(found_imports)} استيراد ممنوع في {len(set(i['file'] for i in found_imports))} ملف")
        return found_imports
    else:
        print("✅ لم يتم العثور على أي استيرادات للمكتبات المحذوفة!")
        print("🎉 يمكنك إزالة pandas, scikit-learn, scipy بأمان")
        return []

def show_solutions(found_imports):
    """عرض الحلول الممكنة"""
    if not found_imports:
        return
    
    print("\n" + "="*60)
    print("🔧 الحلول المقترحة:")
    print("="*60)
    
    files_to_fix = {}
    for item in found_imports:
        if item['file'] not in files_to_fix:
            files_to_fix[item['file']] = []
        files_to_fix[item['file']].append(item)
    
    for file_path, imports in files_to_fix.items():
        print(f"\n📁 الملف: {file_path}")
        print("-" * 40)
        
        for item in imports:
            print(f"  📍 السطر {item['line']}: {item['code']}")
            
            # تحليل الاستخدام
            if 'pandas' in item['import']:
                print("  💡 الحل: تحقق إذا كان الكود يستخدم:")
                print("     - pd.read_csv() → استبدل بـ csv.DictReader")
                print("     - pd.DataFrame() → استبدل بـ list of dicts")
                print("     - pd.to_excel() → احتفظ بـ pandas أو استخدم openpyxl")
            
            elif 'sklearn' in item['import'] or 'scikit' in item['import']:
                print("  💡 الحل: تحقق إذا كان الكود يستخدم:")
                print("     - TfidfVectorizer → تعطيل/إزالة إذا غير مستخدم")
                print("     - ML models → تعطيل/إزالة إذا غير مستخدم")
            
            elif 'scipy' in item['import']:
                print("  💡 الحل: تحقق إذا كان الكود يستخدم:")
                print("     - scipy.sparse → تعطيل/إزالة إذا غير مستخدم")
                print("     - إحصائيات → استبدل بـ numpy أو مكتبة أخف")

if __name__ == "__main__":
    # ابدأ من المجلد الحالي
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"📁 المجلد الحالي: {current_dir}")
    print("-" * 50)
    
    found_imports = check_imports_in_project(current_dir)
    
    if found_imports:
        show_solutions(found_imports)
        sys.exit(1)  # خروج مع خطأ