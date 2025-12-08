// frontend/src/components/RatingModal.jsx
import { useState } from 'react'
import { Star, X, Send } from 'lucide-react'
import axios from 'axios'
import { Analytics } from '../utils/analytics'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

function RatingModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert('يرجى اختيار تقييم')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post(`${API_URL}/api/feedback/rating`, {
        rating,
        comment: comment.trim() || null,
        user_email: email.trim() || null,
        page: window.location.pathname
      })

      console.log('✅ تم إرسال التقييم:', response.data)
      
      // 📊 تتبع التقييم في GA
      // Analytics.submitFeedback('rating', rating) // تم التعليق لتجنب الخطأ: TypeError: Analytics.submitFeedback is not a function
      
      setSubmitted(true)
      
      setTimeout(() => {
        onClose()
        // إعادة تعيين النموذج
        setTimeout(() => {
          setRating(0)
          setComment('')
          setEmail('')
          setSubmitted(false)
        }, 300)
      }, 2000)

    } catch (error) {
      console.error('❌ خطأ في إرسال التقييم:', error)
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
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* زر الإغلاق */}
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
            {/* العنوان */}
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#1f2937',
              textAlign: 'center'
            }}>
              ⭐ قيّم تجربتك
            </h2>
            
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              marginBottom: '30px'
            }}>
              رأيك يهمنا لتحسين التطبيق
            </p>

            <form onSubmit={handleSubmit}>
              {/* النجوم */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '30px'
              }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '5px',
                      transition: 'transform 0.2s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  >
                    <Star
                      size={48}
                      fill={star <= (hoverRating || rating) ? '#fbbf24' : 'none'}
                      color={star <= (hoverRating || rating) ? '#fbbf24' : '#d1d5db'}
                      style={{ transition: 'all 0.2s' }}
                    />
                  </button>
                ))}
              </div>

              {/* عرض التقييم */}
              {rating > 0 && (
                <p style={{
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#667eea',
                  marginBottom: '20px'
                }}>
                  {rating === 5 && '🌟 ممتاز جداً!'}
                  {rating === 4 && '😊 جيد جداً'}
                  {rating === 3 && '👍 جيد'}
                  {rating === 2 && '😐 مقبول'}
                  {rating === 1 && '☹️ يحتاج تحسين'}
                </p>
              )}

              {/* التعليق */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="أخبرنا برأيك (اختياري)..."
                maxLength={500}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '100px',
                  marginBottom: '20px'
                }}
              />

              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني (اختياري)"
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  marginBottom: '25px'
                }}
              />

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: rating === 0 ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: rating === 0 ? 'not-allowed' : 'pointer',
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
                    إرسال التقييم
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          // رسالة النجاح
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '10px' }}>
              شكراً لتقييمك!
            </h3>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              رأيك يساعدنا على التحسين المستمر
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RatingModal