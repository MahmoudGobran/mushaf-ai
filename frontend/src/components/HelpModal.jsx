import React, { useState } from 'react';
import { X, BookOpen, Search, Brain, BarChart3, Shuffle, Download, Sparkles } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('search');

  if (!isOpen) return null;

  const tabs = [
    { id: 'search', name: 'البحث النصي', icon: Search },
    { id: 'quiz', name: 'اختبر حفظك', icon: Brain },
    { id: 'explorer', name: 'مستكشف المتشابهات', icon: Sparkles },
    { id: 'stats', name: 'الإحصائيات', icon: BarChart3 },
    { id: 'random', name: 'الآيات العشوائية', icon: Shuffle }
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'search':
        return (
          <div>
            <h3 style={styles.sectionTitle}>🔍 البحث النصي الذكي</h3>
            
            <div style={styles.infoBox}>
              <h4 style={styles.subTitle}>✨ ما هو؟</h4>
              <p style={styles.text}>
                محرك بحث قوي يتيح لك البحث عن أي كلمة أو عبارة في القرآن الكريم بسرعة ودقة عالية.
              </p>
            </div>

            <div style={styles.featureBox}>
              <h4 style={styles.subTitle}>🎯 الميزات الرئيسية</h4>
              <ul style={styles.list}>
                <li><strong>بحث ذكي:</strong> يدعم الكتابة العادية والرسم العثماني (مثال: "الصلاة" تجد "ٱلصَّلَوٰةِ")</li>
                <li><strong>بحث صوتي:</strong> انطق الكلمة وسيبحث تلقائياً 🎤</li>
                <li><strong>تظليل النتائج:</strong> الكلمات المطابقة تظهر بلون أصفر مميز</li>
                <li><strong>نتائج سريعة:</strong> يعرض حتى 100 نتيجة في أقل من ثانية</li>
              </ul>
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>📝 كيفية الاستخدام</h4>
              <ol style={styles.numberedList}>
                <li>اكتب الكلمة أو العبارة في مربع البحث</li>
                <li>أو اضغط على أيقونة 🎤 للبحث الصوتي</li>
                <li>اضغط "بحث" أو Enter</li>
                <li>تصفح النتائج مع التظليل</li>
                <li>اضغط "🔎 عرض المتشابهات" لأي آية لرؤية الآيات المشابهة لها</li>
              </ol>
            </div>

            <div style={styles.tipBox}>
              <strong>💡 نصيحة:</strong> يمكنك تحميل النتائج كملف PDF أو Excel باستخدام زر التحميل!
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div>
            <h3 style={styles.sectionTitle}>🎮 اختبر حفظك</h3>
            
            <div style={styles.infoBox}>
              <h4 style={styles.subTitle}>✨ ما هو؟</h4>
              <p style={styles.text}>
                اختبارات تفاعلية مصممة لمساعدتك على تثبيت حفظك وتمييز الآيات المتشابهة بطريقة ممتعة.
              </p>
            </div>

            <div style={styles.featureBox}>
              <h4 style={styles.subTitle}>🎯 أنواع الأسئلة (4 أنواع)</h4>
              <div style={styles.quizTypes}>
                <div style={styles.quizType}>
                  <span style={styles.quizIcon}>✍️</span>
                  <div>
                    <strong>إكمال الآية</strong>
                    <p style={styles.smallText}>املأ الفراغ بالكلمة أو الكلمات المحذوفة</p>
                  </div>
                </div>
                
                <div style={styles.quizType}>
                  <span style={styles.quizIcon}>🔤</span>
                  <div>
                    <strong>اختيار الكلمة</strong>
                    <p style={styles.smallText}>اختر الكلمة الصحيحة من 4 خيارات</p>
                  </div>
                </div>
                
                <div style={styles.quizType}>
                  <span style={styles.quizIcon}>🔍</span>
                  <div>
                    <strong>تمييز المتشابهات</strong>
                    <p style={styles.smallText}>حدد الآية الصحيحة من بين آيات متشابهة</p>
                  </div>
                </div>
                
                <div style={styles.quizType}>
                  <span style={styles.quizIcon}>📖</span>
                  <div>
                    <strong>اسم السورة</strong>
                    <p style={styles.smallText}>حدد السورة التي تنتمي إليها الآية</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>⚙️ خيارات التخصيص</h4>
              <ul style={styles.list}>
                <li><strong>نطاق الاختبار:</strong>
                  <ul style={styles.subList}>
                    <li>القرآن كاملاً (6,236 آية)</li>
                    <li>ثلث القرآن (الأول/الثاني/الثالث)</li>
                    <li>جزء محدد (1-30)</li>
                    <li>سورة محددة (1-114)</li>
                  </ul>
                </li>
                <li><strong>مستوى الصعوبة:</strong> اضبط نسبة التشابه من 60% (سهل) إلى 95% (صعب جداً)</li>
                <li><strong>عدد الأسئلة:</strong> غير محدود - توقف متى تشاء!</li>
              </ul>
            </div>

            <div style={styles.tipBox}>
              <strong>💡 نصيحة:</strong> ابدأ بثلث القرآن ونسبة تشابه 70% لأفضل تجربة تعليمية!
            </div>
          </div>
        );

      case 'explorer':
        return (
          <div>
            <h3 style={styles.sectionTitle}>🔬 مستكشف المتشابهات</h3>
            
            <div style={styles.infoBox}>
              <h4 style={styles.subTitle}>✨ ما هو؟</h4>
              <p style={styles.text}>
                أداة قوية للبحث المتقدم عن الآيات المتشابهة لفظياً في نطاقات مخصصة، مع إمكانية مقارنة الفروقات بدقة.
              </p>
            </div>

            <div style={styles.featureBox}>
              <h4 style={styles.subTitle}>🎯 الميزات المتقدمة</h4>
              <ul style={styles.list}>
                <li><strong>بحث هجين ذكي:</strong> يجمع بين البحث الدلالي (FAISS) والمقارنة اللفظية</li>
                <li><strong>نطاقات مرنة:</strong> حدد نطاق البحث ونطاق المقارنة بشكل منفصل</li>
                <li><strong>مقارنة الفروقات:</strong> عرض ملون للكلمات المختلفة بين الآيات</li>
                <li><strong>نتائج كبيرة:</strong> يدعم حتى 5,000 نتيجة</li>
                <li><strong>إلغاء البحث:</strong> أوقف البحث في أي وقت إذا استغرق وقتاً طويلاً</li>
              </ul>
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>📝 خيارات النطاق</h4>
              
              <div style={styles.scopeSection}>
                <p style={styles.boldText}>1️⃣ نطاق البحث (أين تبحث؟)</p>
                <ul style={styles.subList}>
                  <li>📖 القرآن كاملاً</li>
                  <li>📚 ثلث القرآن (الأول/الثاني/الثالث)</li>
                  <li>📗 جزء محدد (1-30)</li>
                  <li>📄 سورة محددة (114 سورة متاحة)</li>
                </ul>
              </div>

              <div style={styles.scopeSection}>
                <p style={styles.boldText}>2️⃣ نطاق المقارنة (بماذا تقارن؟)</p>
                <ul style={styles.subList}>
                  <li>القرآن كاملاً (للبحث الشامل)</li>
                  <li>نفس النطاق (للبحث داخل نطاق محدد)</li>
                  <li>نطاق آخر (مثال: جزء 1 vs جزء 30)</li>
                </ul>
              </div>
            </div>

            <div style={styles.exampleBox}>
              <h4 style={styles.subTitle}>💡 مثال عملي</h4>
              <p style={styles.text}>
                <strong>السيناريو:</strong> أريد إيجاد الآيات المتشابهة في جزء عم (الجزء 30)
              </p>
              <ol style={styles.numberedList}>
                <li>نطاق البحث: جزء 30</li>
                <li>نطاق المقارنة: جزء 30</li>
                <li>حد التشابه: 70%</li>
                <li>اضغط "ابدأ البحث"</li>
                <li>النتائج: جميع الآيات المتشابهة في جزء عم فقط ✅</li>
              </ol>
            </div>

            <div style={styles.tipBox}>
              <strong>💡 نصيحة:</strong> استخدم "عرض الفروقات" لرؤية الكلمات المختلفة بالألوان (أصفر/أخضر)!
            </div>
          </div>
        );

      case 'stats':
        return (
          <div>
            <h3 style={styles.sectionTitle}>📊 إحصائيات القرآن</h3>
            
            <div style={styles.infoBox}>
              <h4 style={styles.subTitle}>✨ ما هو؟</h4>
              <p style={styles.text}>
                أداة قوية لاستكشاف تكرار الكلمات في القرآن الكريم مع إحصائيات تفصيلية وأمثلة من الآيات.
              </p>
            </div>

            <div style={styles.featureBox}>
              <h4 style={styles.subTitle}>🎯 ما يمكنك معرفته</h4>
              <ul style={styles.list}>
                <li><strong>تكرار الكلمة:</strong> كم مرة وردت الكلمة في القرآن (مثال: "الله" = 2,699 مرة)</li>
                <li><strong>عدد الآيات:</strong> كم آية تحتوي على هذه الكلمة</li>
                <li><strong>التوزيع بحسب السور:</strong> أي السور تحتوي على أكثر تكرار</li>
                <li><strong>التوزيع بحسب الأجزاء:</strong> توزيع الكلمة عبر الـ 30 جزء</li>
                <li><strong>أمثلة من الآيات:</strong> عرض آيات تحتوي على الكلمة</li>
              </ul>
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>📝 كيفية الاستخدام</h4>
              <ol style={styles.numberedList}>
                <li>اكتب الكلمة التي تريد إحصائياتها (مثال: "الصلاة"، "الجنة"، "الصبر")</li>
                <li>اضغط "بحث"</li>
                <li>تصفح النتائج:
                  <ul style={styles.subList}>
                    <li>العدد الإجمالي للتكرار</li>
                    <li>عدد الآيات</li>
                    <li>رسم بياني للتوزيع</li>
                    <li>أمثلة من الآيات</li>
                  </ul>
                </li>
                <li>حمّل النتائج كـ PDF أو Excel</li>
              </ol>
            </div>

            <div style={styles.exampleBox}>
              <h4 style={styles.subTitle}>💡 أمثلة شائعة</h4>
              <div style={styles.examplesGrid}>
                <div style={styles.exampleCard}>
                  <strong>الله</strong>
                  <p style={styles.smallText}>2,699 تكرار</p>
                </div>
                <div style={styles.exampleCard}>
                  <strong>الصلاة</strong>
                  <p style={styles.smallText}>83 تكرار</p>
                </div>
                <div style={styles.exampleCard}>
                  <strong>الزكاة</strong>
                  <p style={styles.smallText}>30 تكرار</p>
                </div>
                <div style={styles.exampleCard}>
                  <strong>الجنة</strong>
                  <p style={styles.smallText}>147 تكرار</p>
                </div>
              </div>
            </div>

            <div style={styles.tipBox}>
              <strong>💡 نصيحة:</strong> النظام يدعم حتى 10,000 آية في النتائج!
            </div>
          </div>
        );

      case 'random':
        return (
          <div>
            <h3 style={styles.sectionTitle}>🎲 الآيات العشوائية</h3>
            
            <div style={styles.infoBox}>
              <h4 style={styles.subTitle}>✨ ما هو؟</h4>
              <p style={styles.text}>
                عرض آيات عشوائية من القرآن الكريم مع إمكانية استكشاف المتشابهات لكل آية والاستماع إليها.
              </p>
            </div>

            <div style={styles.featureBox}>
              <h4 style={styles.subTitle}>🎯 الميزات</h4>
              <ul style={styles.list}>
                <li><strong>آيات متنوعة:</strong> يتم اختيار 10 آيات عشوائية من جميع أنحاء القرآن</li>
                <li><strong>ذكية:</strong> الآيات المعروضة لها متشابهات لفظية (نسبة تشابه 85%+)</li>
                <li><strong>تحديث سريع:</strong> اضغط "تحديث" للحصول على آيات جديدة</li>
                <li><strong>استكشاف فوري:</strong> اضغط "عرض المتشابهات" لأي آية</li>
                <li><strong>استماع:</strong> استمع لكل آية مع اختيار القارئ المفضل</li>
              </ul>
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>🎧 اختيار القارئ</h4>
              <p style={styles.text}>القراء المتاحون:</p>
              <ul style={styles.list}>
                <li>🎙️ مشاري العفاسي</li>
                <li>🎙️ محمود خليل الحصري</li>
                <li>🎙️ محمد صديق المنشاوي</li>
                <li>🎙️ عبد الرحمن السديس</li>
              </ul>
              <p style={styles.smallText}>* اضغط على أيقونة 🔊 بجانب كل آية للاستماع</p>
            </div>

            <div style={styles.tipBox}>
              <strong>💡 نصيحة:</strong> يمكنك تحميل الآيات المعروضة كملف PDF للمراجعة لاحقاً!
            </div>

            <div style={styles.howToBox}>
              <h4 style={styles.subTitle}>📝 كيفية الاستخدام</h4>
              <ol style={styles.numberedList}>
                <li>انتقل إلى الصفحة الرئيسية</li>
                <li>تصفح الآيات العشوائية المعروضة</li>
                <li>اضغط "🔊" للاستماع لأي آية</li>
                <li>اضغط "🔎 عرض المتشابهات" لاستكشاف الآيات المشابهة</li>
                <li>اضغط "تحديث" للحصول على آيات جديدة</li>
              </ol>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      style={styles.overlay}
      onClick={onClose}
    >
      <div 
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <BookOpen style={{ width: '32px', height: '32px' }} />
            <h2 style={styles.headerTitle}>
              📘 دليل المستخدم الشامل
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.tabActive : {})
                }}
              >
                <Icon size={18} />
                <span style={styles.tabText}>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {renderContent()}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            <strong>المصحف الذكي للمتشابهات</strong> - أداة مجانية لخدمة كتاب الله
          </p>
          <button onClick={onClose} style={styles.footerButton}>
            فهمت، شكراً!
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '25px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: 'bold',
    margin: 0
  },
  closeButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '28px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s'
  },
  tabsContainer: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    padding: '10px 20px',
    gap: '8px',
    overflowX: 'auto',
    flexWrap: 'wrap'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    backgroundColor: '#667eea',
    color: 'white',
    fontWeight: 'bold'
  },
  tabText: {
    fontSize: '14px'
  },
  content: {
    padding: '30px',
    overflowY: 'auto',
    flex: 1,
    lineHeight: '1.8'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#1f2937',
    textAlign: 'right',
    borderBottom: '3px solid #667eea',
    paddingBottom: '10px'
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  },
  featureBox: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  },
  howToBox: {
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  },
  exampleBox: {
    backgroundColor: '#fce7f3',
    border: '2px solid #ec4899',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  },
  tipBox: {
    backgroundColor: '#dbeafe',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '20px',
    textAlign: 'right',
    fontSize: '15px',
    color: '#1e40af'
  },
  subTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#1f2937',
    textAlign: 'right'
  },
  text: {
    margin: '10px 0',
    fontSize: '16px',
    textAlign: 'right',
    color: '#374151'
  },
  smallText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '5px 0'
  },
  boldText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  },
  list: {
    textAlign: 'right',
    paddingRight: '20px',
    margin: '10px 0',
    fontSize: '15px',
    color: '#374151',
    lineHeight: '2'
  },
  subList: {
    paddingRight: '25px',
    marginTop: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },
  numberedList: {
    textAlign: 'right',
    paddingRight: '20px',
    margin: '10px 0',
    fontSize: '15px',
    color: '#374151',
    lineHeight: '2',
    direction: 'rtl'
  },
  quizTypes: {
    display: 'grid',
    gap: '15px',
    marginTop: '15px'
  },
  quizType: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '10px',
    border: '1px solid #d1fae5'
  },
  quizIcon: {
    fontSize: '32px',
    flexShrink: 0
  },
  scopeSection: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #fbbf24'
  },
  examplesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  exampleCard: {
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px solid #ec4899',
    textAlign: 'center'
  },
  footer: {
    backgroundColor: '#f9fafb',
    padding: '20px 30px',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center'
  },
  footerText: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px'
  },
  footerButton: {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '12px 40px',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s'
  }
};

export default HelpModal;