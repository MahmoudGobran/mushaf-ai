// frontend/src/components/FeedbackButton.jsx
import { useState } from 'react'
import { Star, MessageSquare, Bug, X } from 'lucide-react'

// ✅ 1. استقبال الخصائص الجديدة: customLabel, isHeaderButton, و style
function FeedbackButton({ 
  onOpenRating, 
  onOpenSuggestion, 
  onOpenBugReport, 
  customLabel = 'تقييم', 
  isHeaderButton = false,
  style = {} // لاستقبال الستايل الممرر من App.jsx
}) {
  const [isOpen, setIsOpen] = useState(false)

  // 2. دالة مساعدة لفتح المودال وإغلاق القائمة
  const handleOpenModal = (openFunc) => {
    openFunc()
    setIsOpen(false)
  }

  // 3. دمج وتعديل ستايل الزر الرئيسي
  const mainButtonStyle = {
    // الخصائص المشتركة
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    zIndex: 1000,
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    
    // الخصائص الافتراضية للزر العائم (Floating Button)
    position: 'fixed',
    bottom: '30px',
    left: '30px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    fontSize: '24px',
    padding: '0',
    gap: '0',

    // ✅ التجاوز (Override) لخصائص زر شريط العنوان (Header Button)
    ...(isHeaderButton ? {
      //Overrides: إلغاء خصائص الزر العائم
      position: 'relative', // ✅ التعديل الرئيسي: لتحديد موقع القائمة المنبثقة
      bottom: 'auto',
      left: 'auto',
      width: 'auto',
      height: 'auto',
      borderRadius: '12px', // لإبقاء التنسيق الموحد في الهيدر
      // دمج ستايل الـ App.jsx الذي حددناه سابقاً
      ...style, 
      // التأكد من تطبيق التنسيق المطلوب للنص والأيقونة
      fontSize: style.fontSize || '18px',
      fontWeight: style.fontWeight || 'bold',
      padding: style.padding || '14px 28px',
      gap: '10px',
    } : {}),
  }

  // 4. تحديد ستايل قائمة الخيارات
  const listStyle = {
    position: 'absolute', // ✅ التعديل الرئيسي: لجعل القائمة تتبع الأب (position: relative)
    top: '100%',         // سيظهر تحت الزر مباشرة
    right: 0,           // ✅ محاذاة القائمة إلى يمين زر "تقييم / ملاحظات"
    bottom: 'auto',
    left: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 999,
    minWidth: '200px',
    paddingTop: '10px' // مسافة بين الزر والقائمة
  }

  // 5. تعديل سلوك الـ Hover ليتناسب مع مكانه
  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = isHeaderButton ? 'scale(1.05)' : 'scale(1.1)'
    // استخدام نفس الـ Shadow الذي تم تمريره من App.jsx أو افتراضي للهيدر
    e.currentTarget.style.boxShadow = isHeaderButton ? (style.boxShadow || '0 4px 12px rgba(139, 92, 246, 0.4)') : '0 6px 20px rgba(102, 126, 234, 0.6)'
  }

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'scale(1)'
    // استخدام نفس الـ Shadow الذي تم تمريره من App.jsx أو افتراضي للهيدر
    e.currentTarget.style.boxShadow = isHeaderButton ? (style.boxShadow || '0 4px 12px rgba(139, 92, 246, 0.4)') : '0 4px 12px rgba(102, 126, 234, 0.4)'
  }

  // 6. إضافة div الأب للعزل وتحديد position: relative للزر في الهيدر
  if (isHeaderButton) {
      return (
          <div style={{ position: 'relative' }}>
              <button
                  onClick={() => setIsOpen(!isOpen)}
                  style={mainButtonStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
              >
                  <Star size={20} />
                  {customLabel}
              </button>

              {/* قائمة الخيارات (المودالات) */}
              {isOpen && (
                  <div style={listStyle}>
                      {/* تقييم بالنجوم */}
                      <button
                          onClick={() => handleOpenModal(onOpenRating)}
                          style={{
                              padding: '12px 20px',
                              background: 'white',
                              border: '2px solid #667eea',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#667eea',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                              textAlign: 'right'
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#667eea'
                              e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white'
                              e.currentTarget.style.color = '#667eea'
                          }}
                      >
                          <Star size={20} />
                          تقييم التطبيق
                      </button>

                      {/* اقتراح */}
                      <button
                          onClick={() => handleOpenModal(onOpenSuggestion)}
                          style={{
                              padding: '12px 20px',
                              background: 'white',
                              border: '2px solid #10b981',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#10b981',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                              textAlign: 'right'
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#10b981'
                              e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white'
                              e.currentTarget.style.color = '#10b981'
                          }}
                      >
                          <MessageSquare size={20} />
                          اقتراح تحسين
                      </button>

                      {/* بلاغ خطأ */}
                      <button
                          onClick={() => handleOpenModal(onOpenBugReport)}
                          style={{
                              padding: '12px 20px',
                              background: 'white',
                              border: '2px solid #ef4444',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#ef4444',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                              textAlign: 'right'
                          }}
                          onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#ef4444'
                              e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white'
                              e.currentTarget.style.color = '#ef4444'
                          }}
                      >
                          <Bug size={20} />
                          الإبلاغ عن خطأ
                      </button>
                  </div>
              )}
          </div>
      )
  }

  // ✅ الزر العائم (الافتراضي) - يبقى كما هو ولكن مع التحديثات المذكورة
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={mainButtonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isOpen ? <X size={28} /> : '💬'}
      </button>

      {isOpen && (
        <div style={{ ...listStyle, position: 'fixed', bottom: '100px', left: '30px', right: 'auto', top: 'auto' }}>
            {/*... الأزرار المنبثقة للزر العائم ...*/}
             <button onClick={() => handleOpenModal(onOpenRating)} style={{/*...*/}}>
               <Star size={20} /> تقييم التطبيق
             </button>
             <button onClick={() => handleOpenModal(onOpenSuggestion)} style={{/*...*/}}>
               <MessageSquare size={20} /> اقتراح تحسين
             </button>
             <button onClick={() => handleOpenModal(onOpenBugReport)} style={{/*...*/}}>
               <Bug size={20} /> الإبلاغ عن خطأ
             </button>
        </div>
      )}
    </>
  )
}

export default FeedbackButton