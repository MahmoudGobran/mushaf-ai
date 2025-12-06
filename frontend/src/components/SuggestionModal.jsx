// frontend/src/components/SuggestionModal.jsx
import { useState } from 'react'
import { X, Send, Lightbulb } from 'lucide-react'
import axios from 'axios'
import { Analytics } from '../utils/analytics'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function SuggestionModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const categories = [
    { value: 'feature', label: '✨ ميزة جديدة' },
    { value: 'ui', label: '🎨 تحسين الواجهة' },
    { value: 'performance', label: '⚡ تحسين الأداء' },
    { value: 'content', label: '📚 المحتوى' },
    { value: 'other', label: '📝 أخرى' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // التحقق من الحقول الإلزامية
    if (!title.trim() || !description.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    // التحقق من الحد الأدنى لطول العنوان (يجب أن يكون 5 أحرف أو أكثر)
    if (title.length < 5) {
      alert('عنوان الاقتراح يجب أن يكون 5 أحرف على الأقل')
      return
    }
    
    // ✅ التصحيح الذي يحل مشكلة 422: التحقق من الحد الأدنى لطول الوصف (10 أحرف)
    if (description.length < 10) {
      alert('وصف الاقتراح يجب أن يكون 10 أحرف على الأقل')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post(`${API_URL}/api/feedback/suggestion`, {
        title: title.trim(),
        description: description.trim(),
        category,
        user_email: email.trim() || null,
        page: window.location.pathname
      })

      console.log('✅ تم إرسال الاقتراح:', response.data)
      
      // 📊 تتبع الاقتراح في GA - يعمل الآن بفضل تصحيح analytics.js
      Analytics.submitFeedback('suggestion', {
        category: category,
        title: title.trim().substring(0, 50),
        description_length: description.length
      });
      
      setSubmitted(true)
      
      setTimeout(() => {
        onClose()
        // إعادة تعيين النموذج
        setTimeout(() => {
          setTitle('')
          setDescription('')
          setCategory('other')
          setEmail('')
          setSubmitted(false)
        }, 300)
      }, 2000)

    } catch (error) {
      console.error('❌ خطأ في إرسال الاقتراح:', error)
      // قد يظهر هذا إذا كان هناك خطأ في الاتصال بالخادم أو مشكلة غير متوقعة
      alert('حدث خطأ. يرجى المحاولة لاحقاً')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
        margin: '20px 0'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '5px'
          }}
        >
          <X size={24} />
        </button>

        {!submitted ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Lightbulb size={48} color="#f59e0b" style={{ marginBottom: '10px' }} />
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                marginBottom: '10px',
                color: '#1f2937'
              }}>
                💡 اقتراح تحسين
              </h2>
              <p style={{ color: '#6b7280' }}>
                شاركنا بأفكارك لتطوير التطبيق
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* العنوان */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  عنوان الاقتراح *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: إضافة خاصية البحث الصوتي"
                  maxLength={100}
                  required
                  style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px' }}
                />
                <small style={{ color: '#6b7280' }}>
                  {title.length}/100 حرف (الحد الأدنى 5)
                </small>
              </div>

              {/* الفئة */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  فئة الاقتراح
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20d%3D%22M9.293%2012.95l.707.707L15.657%208l-1.414-1.414L10%2010.828%205.757%206.586%204.343%208z%22%20fill%3D%22%236b7280%22/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'left 15px top 50%',
                    backgroundSize: '12px',
                    paddingRight: '40px'
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* الوصف */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  الوصف التفصيلي *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح اقتراحك بالتفصيل..."
                  maxLength={1000}
                  required
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '150px',
                  }}
                />
                <small style={{ color: '#6b7280' }}>
                  {description.length}/1000 حرف (الحد الأدنى 10)
                </small>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  بريدك الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="لتلقي رد حول اقتراحك"
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                  }}
                />
              </div>

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim() || title.length < 5 || description.length < 10}
                style={{
                  width: '100%',
                  padding: '16px',
                  // تحديث لتعطيل الزر إذا لم تتوفر الشروط (5 أحرف للعنوان و 10 للوصف)
                  background: (!title.trim() || !description.trim() || title.length < 5 || description.length < 10) ? '#d1d5db' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: (!title.trim() || !description.trim() || title.length < 5 || description.length < 10) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.3s'
                }}
              >
                {isSubmitting ? (
                  'جاري الإرسال...'
                ) : (
                  <>
                    <Send size={20} />
                    إرسال الاقتراح
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          // رسالة النجاح
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>💡</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
              شكراً لاقتراحك!
            </h3>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              نقدر اهتمامك بتطوير التطبيق
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuggestionModal