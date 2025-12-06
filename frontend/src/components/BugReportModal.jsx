// frontend/src/components/BugReportModal.jsx
import { useState, useEffect } from 'react'
import { X, Send, Bug, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { Analytics } from '../utils/analytics'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function BugReportModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [browser, setBrowser] = useState('')
  const [device, setDevice] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // كشف المتصفح والجهاز تلقائياً
  useEffect(() => {
    if (isOpen && !browser && !device) {
      const userAgent = navigator.userAgent
      
      // كشف المتصفح
      let detectedBrowser = 'Unknown'
      if (userAgent.includes('Firefox')) detectedBrowser = 'Firefox'
      else if (userAgent.includes('Chrome')) detectedBrowser = 'Chrome'
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) detectedBrowser = 'Safari'
      else if (userAgent.includes('Edge')) detectedBrowser = 'Edge'
      else if (userAgent.includes('OPR') || userAgent.includes('Opera')) detectedBrowser = 'Opera'
      
      // كشف الجهاز
      let detectedDevice = 'Desktop'
      if (/(tablet|ipad|android|mobile|touch)/i.test(userAgent)) {
          detectedDevice = 'Mobile'
      } else if (userAgent.includes('Mac OS')) {
          detectedDevice = 'macOS'
      } else if (userAgent.includes('Windows')) {
          detectedDevice = 'Windows'
      } else if (userAgent.includes('Linux')) {
          detectedDevice = 'Linux'
      }

      setBrowser(detectedBrowser)
      setDevice(detectedDevice)
    }
  }, [isOpen, browser, device])


  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim() || !description.trim()) {
      alert('يرجى ملء العنوان والوصف')
      return
    }
    
    if (title.length < 5 || description.length < 10) {
      alert('العنوان يجب أن يكون 5 أحرف والوصف 10 أحرف على الأقل')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post(`${API_URL}/api/feedback/bug`, {
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: steps.trim() || null,
        browser: browser.trim() || null,
        device: device.trim() || null,
        user_email: email.trim() || null,
        page: window.location.pathname
      })

      console.log('✅ تم إرسال بلاغ الخطأ:', response.data)

      // 📊 تتبع البلاغ في GA - ✅ تم التفعيل مع معاملات GA4
      Analytics.submitFeedback('bug', {
        title: title.trim().substring(0, 50), // قص العنوان ليكون مناسب كمعامل GA4
        browser: browser.trim(),
        device: device.trim(),
        has_steps: steps.trim().length > 0 ? 'Yes' : 'No'
      });
      
      setSubmitted(true)
      
      setTimeout(() => {
        onClose()
        // إعادة تعيين النموذج
        setTimeout(() => {
          setTitle('')
          setDescription('')
          setSteps('')
          // نترك المتصفح والجهاز تلقائيين
          setEmail('')
          setSubmitted(false)
        }, 300)
      }, 2000)

    } catch (error) {
      console.error('❌ خطأ في إرسال البلاغ:', error)
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
              <Bug size={48} color="#ef4444" style={{ marginBottom: '10px' }} />
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                marginBottom: '10px',
                color: '#1f2937'
              }}>
                🐛 الإبلاغ عن خطأ
              </h2>
              <p style={{ color: '#6b7280' }}>
                ساعدنا في العثور على المشاكل وإصلاحها
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* العنوان */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  عنوان المشكلة *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الواجهة لا تظهر على الهاتف"
                  maxLength={100}
                  required
                  style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px' }}
                />
                <small style={{ color: '#6b7280' }}>
                  {title.length}/100 حرف (لا يقل عن 5 أحرف)
                </small>
              </div>

              {/* الوصف */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  وصف المشكلة *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح المشكلة بالتفصيل وكيف حدثت..."
                  maxLength={1000}
                  required
                  style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical', minHeight: '100px' }}
                />
                <small style={{ color: '#6b7280' }}>
                  {description.length}/1000 حرف (لا يقل عن 10 أحرف)
                </small>
              </div>

              {/* خطوات إعادة الإنتاج */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>
                  خطوات إعادة إنتاج المشكلة (اختياري)
                </label>
                <textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="1. اضغط على كذا 2. حدث كذا"
                  maxLength={1000}
                  style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {/* المتصفح والجهاز */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>المتصفح</label>
                  <input
                    type="text"
                    value={browser}
                    onChange={(e) => setBrowser(e.target.value)}
                    placeholder="Chrome, Safari, Firefox..."
                    maxLength={50}
                    style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>الجهاز</label>
                  <input
                    type="text"
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    placeholder="iOS, Android, Windows..."
                    maxLength={50}
                    style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151' }}>بريدك الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="للتواصل معك حول الإصلاح"
                  style={{ width: '100%', padding: '15px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px' }}
                />
              </div>

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim() || title.length < 5 || description.length < 10}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (!title.trim() || !description.trim() || title.length < 5 || description.length < 10) ? '#d1d5db' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
                    إرسال البلاغ
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          // رسالة النجاح
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔧</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444', marginBottom: '10px' }}>
              شكراً لإبلاغك!
            </h3>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              سنعمل على إصلاح هذا الخطأ في أقرب وقت
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BugReportModal