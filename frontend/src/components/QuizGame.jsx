import { useState } from 'react'

const API_URL = 'http://localhost:8000'

export default function QuizGame({ onClose }) {
  const [quizState, setQuizState] = useState('scope_selection')
  const [scope, setScope] = useState({ type: 'all', value: '1' })
  const [questionType, setQuestionType] = useState('continue')
  const [lastQuestionType, setLastQuestionType] = useState(null)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.75)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  
  // 🎙️ حالة جديدة لتتبع حالة الميكروفون
  const [listening, setListening] = useState(false) 

  // 🏆 حالة جديدة لوضع الخبير
  const [expertMode, setExpertMode] = useState(false)


  const getQuestionTypeTitle = (type) => {
    const titles = {
      'continue': 'إكمال الآية',
      'word_choice': 'اختيار الكلمة',
      'distinguish': 'ميز بين المتشابهات',
      'surah_name': 'ما اسم السورة؟'
    }
    return titles[type] || 'اختبار'
  }

  const getScopeTitle = (scopeType, scopeValue) => {
    if (scopeType === 'all') return 'القرآن كاملاً'
    if (scopeType === 'thulth') {
      const names = { '1': 'الثلث الأول', '2': 'الثلث الثاني', '3': 'الثلث الثالث' }
      return names[scopeValue] || 'ثلث'
    }
    if (scopeType === 'juz') return `الجزء ${scopeValue}`
    if (scopeType === 'surah') return `السورة ${scopeValue}`
    return 'نطاق'
  }

  // ✅ دالة تنظيف النص - تم تحديثها لمعالجة الرسم العثماني وعلامات الترقيم
  const normalizeText = (text) => {
    if (!text) return ''
    
    // 💡 إزالة علامات الترقيم (الإنجليزية والعربية الشائعة)
    let cleanedText = text.replace(/[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u060C\u061B\u061F\u066B\u066C\uFD3E\uFD3F]/g, ''); 

    // 💡 معالجة الرسم العثماني الشائع: إزالة الألف الزائدة لتوحيد الكتابة الحديثة
    cleanedText = cleanedText
        .replace(/معاجزين/g, 'معجزين') // معاجزين -> معجزين (لتوحيد الرسم الحديث)
        .replace(/أولائك/g, 'اولئك')   // أولائك (بالألف الزائدة) -> اولئك (للتوحيد مع قاعدة الهمزات التالية)
        
    // استبدال الهمزة الممدودة 'آ' بـ 'ا' لتوحيدها مع قاعدة الهمزات أدناه
    cleanedText = cleanedText.replace(/آ/g, 'ا')
    
    // ... بقية قواعد التنظيف: توحيد الحركات، والهمزات، والتاء المربوطة، والمسافات
    cleanedText = cleanedText
      .replace(/[\u064B-\u065F]/g, '') // إزالة الحركات
      .replace(/[\u0617-\u061A]/g, '') // إزالة الحركات الإضافية
      .replace(/[\u06D6-\u06ED]/g, '') // إزالة علامات الوقف
      .replace(/[ًٌٍَُِّْ]/g, '') // إزالة التنوين والتشديد والسكون
      .replace(/[أإآٱ]/g, 'ا') // توحيد الهمزات
      .replace(/[ىئ]/g, 'ي') // توحيد الياءات
      .replace(/ة/g, 'ه') // توحيد التاء المربوطة والهاء
      .replace(/\s+/g, ' ') // توحيد المسافات
      .trim()
      
    return cleanedText
  }

  const handleScopeSubmit = () => {
    if (scope.type !== 'all' && !scope.value) {
      alert('يرجى إدخال رقم السورة أو الجزء')
      return
    }
    setQuizState('question_type')
    setError(null)
  }

  const startQuiz = async (type) => {
    setQuestionType(type)
    setLastQuestionType(type)
    await fetchQuestion(type)
  }

  const fetchQuestion = async (type = questionType) => {
    setLoading(true)
    setError(null)
    setUserAnswer('')
    // ✅ الإصلاح: إعادة تعيين isCorrect فوراً لمنع وميض النتيجة القديمة
    setIsCorrect(null) 

    try {
      console.log('🔄 Fetching question:', { 
        type, 
        scope, 
        threshold: similarityThreshold,
        expertMode  // 🏆 جديد
      })
      
      const response = await fetch(`${API_URL}/quiz/get_question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope_type: scope.type,
          scope_value: scope.value,
          question_type: type,
          threshold: similarityThreshold,
          expert_mode: expertMode  // 🏆 جديد
        })
      })

      const data = await response.json()
      console.log('📥 Response:', data)

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      if (!data.question_text || !data.correct_answer) {
        setError('السؤال غير مكتمل. يرجى المحاولة مرة أخرى.')
        setLoading(false)
        return
      }

      setCurrentQuestion(data)
      // ✅ الإصلاح: ضمان أن questionType يحمل النوع الذي تم جلبه
      setQuestionType(data.question_type) 
      setQuizState('question')
    } catch (err) {
      console.error('❌ خطأ في جلب السؤال:', err)
      setError('حدث خطأ في تحميل السؤال. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = () => {
    if (!userAnswer.trim()) {
      alert('يرجى إدخال الإجابة')
      return
    }

    const correct = currentQuestion.correct_answer
    let isAnswerCorrect = false
    
    // ✅ تطبيق normalizeText على إجابة المستخدم والإجابة الصحيحة
    const cleanAnswer = normalizeText(userAnswer)
    const cleanCorrect = normalizeText(correct)

    // ✅ معالجة حسب نوع السؤال
    if (currentQuestion.question_type === 'distinguish' || currentQuestion.question_type === 'word_choice') {
        // للخيارات: المقارنة الصارمة (لأن الإدخال هو نص الخيار)
        isAnswerCorrect = cleanAnswer === cleanCorrect
    } else if (currentQuestion.question_type === 'surah_name' || 
               currentQuestion.question_type === 'continue') {

      if (currentQuestion.question_type === 'continue') {
        // ✅ مقارنة مرنة جداً
        isAnswerCorrect = 
          cleanAnswer === cleanCorrect || 
          cleanAnswer.includes(cleanCorrect) ||
          cleanCorrect.includes(cleanAnswer) ||
          // تحقق: هل الكلمات الرئيسية موجودة؟
          cleanCorrect.split(' ').every(word => cleanAnswer.includes(word))
      }
        else {
        // الأنواع الأخرى: مقارنة صارمة
        isAnswerCorrect = cleanAnswer === cleanCorrect
      }
    }
    
    console.log('🔍 Check:', { userAnswer, correct, cleanAnswer, cleanCorrect, isAnswerCorrect })
    
    setIsCorrect(isAnswerCorrect)
    if (isAnswerCorrect) {
      setScore(score + 10)
    }
    setQuestionsAnswered(questionsAnswered + 1)
    setQuizState('result')
  }

  // 🎙️ دالة بدء الإملاء الصوتي
  const startSpeechRecognition = () => {
    // التحقق من توافر API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم الإملاء الصوتي. يرجى استخدام متصفح يدعمه (مثل Chrome).')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ar-SA' // تعيين اللغة إلى العربية
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      console.log('🎙️ بدأ الاستماع...')
      setError(null) // مسح أي أخطاء سابقة
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setUserAnswer(transcript) // تعيين الإجابة المنطوقة
      setListening(false)
      console.log('✅ تم التعرف على النص:', transcript)
    }

    recognition.onerror = (event) => {
      console.error('❌ خطأ في الإملاء الصوتي:', event.error)
      setError('حدث خطأ في الميكروفون: ' + event.error)
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      console.log('🛑 انتهى الاستماع.')
    }
    
    try {
      recognition.start()
    } catch (e) {
      console.error('❌ فشل بدء recognition:', e)
      setError('فشل بدء خدمة الميكروفون.')
      setListening(false)
    }
  }


  // ===================================
  // 🖼️  Scope Selection
  // ===================================
  if (quizState === 'scope_selection') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '600px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎮 اختبار الحفظ
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#6b7280',
            marginBottom: '30px',
            fontSize: '16px'
          }}>
            اختر نطاق الاختبار
          </p>

          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px',
              textAlign: 'right',
              color: '#374151'
            }}>
              النطاق
            </label>
            <select
              value={scope.type}
              onChange={(e) => setScope({ type: e.target.value, value: '1' })}
              style={{
                width: '100%',
                padding: '15px',
                border: '2px solid #d1d5db',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '500',
                direction: 'rtl',
                cursor: 'pointer'
              }}
            >
              <option value="all">📖 القرآن كاملاً</option>
              <option value="thulth">📚 ثلث القرآن</option>
              <option value="juz">🔗 جزء محدد</option>
              <option value="surah">📄 سورة محددة</option>
            </select>
          </div>

          {scope.type === 'thulth' && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '10px',
                textAlign: 'right',
                color: '#374151'
              }}>
                اختر الثلث
              </label>
              <select
                value={scope.value}
                onChange={(e) => setScope({ ...scope, value: e.target.value })}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  direction: 'rtl',
                  backgroundColor: '#dbeafe'
                }}
              >
                <option value="1">الثلث الأول (أجزاء 1-10)</option>
                <option value="2">الثلث الثاني (أجزاء 11-20)</option>
                <option value="3">الثلث الثالث (أجزاء 21-30)</option>
              </select>
            </div>
          )}

          {(scope.type === 'juz' || scope.type === 'surah') && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '10px',
                textAlign: 'right',
                color: '#374151'
              }}>
                {scope.type === 'juz' ? 'رقم الجزء (1-30)' : 'رقم السورة (1-114)'}
              </label>
              <input
                type="number"
                value={scope.value}
                onChange={(e) => setScope({ ...scope, value: e.target.value })}
                min={scope.type === 'juz' ? 1 : 1}
                max={scope.type === 'juz' ? 30 : 114}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '18px',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              />
            </div>
          )}

          <div style={{
            marginBottom: '25px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
          }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px',
              textAlign: 'right',
              color: '#374151'
            }}>
              🎯 مستوى الصعوبة (نسبة التشابه)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '10px'
            }}>
              <span style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#667eea',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {Math.round(similarityThreshold * 100)}%
              </span>
              <input
                type="range"
                min="60"
                max="95"
                value={similarityThreshold * 100}
                onChange={(e) => setSimilarityThreshold(e.target.value / 100)}
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#6b7280',
              direction: 'rtl'
            }}>
              <span>سهل (60%)</span>
              <span>متوسط (75%)</span>
              <span>صعب (95%)</span>
            </div>
          </div>

          {/* 🏆 وضع الخبير */}
          <div style={{
            marginBottom: '25px',
            padding: '20px',
            backgroundColor: expertMode ? '#fff7ed' : '#f9fafb',
            borderRadius: '12px',
            border: expertMode ? '2px solid #f59e0b' : '2px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onClick={() => setExpertMode(!expertMode)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <input
                type="checkbox"
                checked={expertMode}
                onChange={(e) => setExpertMode(e.target.checked)}
                style={{
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: expertMode ? '#f59e0b' : '#374151',
                  cursor: 'pointer',
                  marginBottom: '5px'
                }}>
                  🏆 وضع الخبير (متشابهات كلمة)
                </label>
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  أسئلة معتمدة من كتاب "متشابهات كلمة" للدكتور رمضان الروبي - للحفظة المتقنين فقط
                </p>
              </div>
            </div>
            
            {expertMode && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#92400e'
              }}>
                <strong>ملاحظة:</strong> وضع الخبير يعمل فقط مع نوع "ميز بين المتشابهات" 🔍
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '15px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>
            <button
              onClick={handleScopeSubmit}
              style={{
                flex: 2,
                padding: '15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              التالي ←
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================================
  // 🖼️  Question Type Selection
  // ===================================
  if (quizState === 'question_type') {
    const quizTypes = [
      { id: 'continue', title: 'إكمال الآية', icon: '📝', description: 'أكمل الكلمات الناقصة', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { id: 'word_choice', title: 'اختيار الكلمة', icon: '🎯', description: 'أدخل الكلمة/العبارة الناقصة', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      { id: 'distinguish', title: 'ميز بين المتشابهات', icon: '🔍', description: 'أدخل نص الآية الصحيحة', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
      { id: 'surah_name', title: 'ما اسم السورة؟', icon: '📖', description: 'أدخل اسم السورة', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }
    ]

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '700px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎮 اختبار الحفظ
          </h2>

          <p style={{
            textAlign: 'center',
            color: '#667eea',
            marginBottom: '5px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            النقاط: {score} | الأسئلة: {questionsAnswered}
          </p>

          <p style={{
            textAlign: 'center',
            color: '#6b7280',
            marginBottom: '5px',
            fontSize: '14px'
          }}>
            النطاق: {getScopeTitle(scope.type, scope.value)}
          </p>

          <p style={{
            textAlign: 'center',
            color: '#6b7280',
            marginBottom: '30px',
            fontSize: '14px'
          }}>
            مستوى الصعوبة: {Math.round(similarityThreshold * 100)}%
          </p>

          {expertMode && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#fff7ed',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#f59e0b'
              }}>
                🏆 وضع الخبير مفعل
              </span>
              <span style={{
                fontSize: '13px',
                color: '#92400e',
                marginLeft: '10px'
              }}>
                • متشابهات كلمة
              </span>
            </div>
          )}

          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '25px',
            color: '#374151'
          }}>
            اختر نوع الاختبار
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '15px',
            marginBottom: '25px'
          }}>
            {quizTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => startQuiz(type.id)}
                disabled={loading}
                style={{
                  padding: '25px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.5 : 1,
                  position: 'relative'  // 🏆 جديد
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = type.color
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.border = 'none'
                    e.currentTarget.style.transform = 'scale(1.03)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.color = '#1f2937'
                  e.currentTarget.style.border = '2px solid #e5e7eb'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {/* 🏆 badge وضع الخبير */}
                {expertMode && type.id === 'distinguish' && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    🏆 خبير
                  </div>
                )}
                
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                  {type.icon}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginBottom: '5px'
                }}>
                  {type.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.9
                }}>
                  {type.description}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              color: '#991b1b',
              textAlign: 'right',
              marginBottom: '20px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#6b7280'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }}></div>
              جاري تحميل السؤال...
            </div>
          )}

          <button
            onClick={() => setQuizState('scope_selection')}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            ← العودة
          </button>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // ===================================
  // 🖼️  Question Display
  // ===================================
  if (quizState === 'question' && currentQuestion) {
    const qType = currentQuestion.question_type
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '800px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '5px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎮 اختبار الحفظ
          </h2>

          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '20px',
            color: '#667eea'
          }}>
            {getQuestionTypeTitle(lastQuestionType || qType)}
          </h3>

          {/* 🏆 indicator وضع الخبير */}
          {currentQuestion?.expert_mode && (
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#fff7ed',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#f59e0b'
              }}>
                🏆 وضع الخبير
              </span>
              <span style={{
                fontSize: '13px',
                color: '#92400e',
                marginLeft: '10px'
              }}>
                {currentQuestion.category && `• ${currentQuestion.category}`}
              </span>
            </div>
          )}

          {/* ✅ التعديل: إظهار معلومات الآية فقط إذا كان نوع السؤال ليس "ما اسم السورة؟" */}
          {currentQuestion.verse_info && qType !== 'surah_name' && (
            <p style={{
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '14px',
              marginBottom: '30px'
            }}>
              {currentQuestion.verse_info.surah_name} ({currentQuestion.verse_info.surah}:{currentQuestion.verse_info.ayah})
            </p>
          )}

          <div style={{
            padding: '30px',
            backgroundColor: '#f9fafb',
            borderRadius: '16px',
            marginBottom: '30px',
            border: '2px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '24px',
              lineHeight: '2',
              textAlign: 'right',
              fontFamily: 'Amiri, serif',
              color: '#1f2937',
              margin: 0
            }}>
              {currentQuestion.question_text}
            </p>
          </div>

          {/* 💡 الكود الموحد للإدخال الكتابي والصوتي */}
          {qType === 'distinguish' || qType === 'word_choice' ? (
            // --- عرض أزرار الخيارات ---
            <div style={{ marginBottom: '30px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: '10px' 
              }}>
                {/* هنا يجب التأكد من أن الخادم أرسل حقل options 
                  والضغط على الزر يحدد الإجابة (setUserAnswer) 
                */}
                {currentQuestion.options && currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setUserAnswer(option)}
                    style={{
                      padding: '15px',
                      border: `2px solid ${userAnswer === option ? '#667eea' : '#d1d5db'}`,
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontFamily: 'Amiri, serif',
                      textAlign: 'right',
                      backgroundColor: userAnswer === option ? '#eef2ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      lineHeight: '1.8' // لتحسين قراءة الآيات الطويلة
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // --- عرض الإدخال النصي (لإكمال الآية واسم السورة) ---
            <div style={{ marginBottom: '30px' }}>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="اكتب الإجابة هنا، أو استخدم الميكروفون..."
                  disabled={listening}
                  style={{
                    width: '100%',
                    minHeight: '150px',
                    padding: '20px',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '20px',
                    fontFamily: 'Amiri, serif',
                    textAlign: 'right',
                    resize: 'vertical',
                    opacity: listening ? 0.7 : 1,
                    backgroundColor: listening ? '#f5f5f5' : 'white'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      checkAnswer()
                    }
                  }}
                />

                <button
                  onClick={startSpeechRecognition}
                  disabled={listening}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '15px',
                    backgroundColor: listening ? '#fca5a5' : '#4ade80',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: listening ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'background-color 0.3s'
                  }}
                >
                  {listening ? 'جاري الاستماع... 🔴' : '🎤 انقر للإملاء الصوتي'}
                </button>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '15px'
          }}>
            <button
              onClick={() => setQuizState('question_type')}
              style={{
                flex: 1,
                padding: '15px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>
            <button
              onClick={checkAnswer}
              disabled={!userAnswer.trim() || listening}
              style={{
                flex: 2,
                padding: '15px',
                background: (!userAnswer.trim() || listening) ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: (!userAnswer.trim() || listening) ? 'not-allowed' : 'pointer',
                opacity: (!userAnswer.trim() || listening) ? 0.5 : 1
              }}
            >
              تحقق من الإجابة ✓
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===================================
  // 🖼️  Result Display
  // ===================================
  if (quizState === 'result') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '600px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '20px'
          }}>
            {isCorrect ? '🎉' : '😕'}
          </div>

          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: isCorrect ? '#10b981' : '#ef4444'
          }}>
            {isCorrect ? 'إجابة صحيحة! +10 نقاط' : 'إجابة خاطئة'}
          </h2>

          {!isCorrect && (
            <div style={{
              padding: '20px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              marginBottom: '30px',
              textAlign: 'right'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '10px'
              }}>
                الإجابة الصحيحة:
              </p>
              <p style={{
                fontSize: '20px',
                fontFamily: 'Amiri, serif',
                color: '#1f2937',
                lineHeight: '2'
              }}>
                {currentQuestion.correct_answer}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <button
              onClick={() => fetchQuestion(questionType)}
              style={{
                padding: '15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              سؤال جديد
            </button>
            
            {lastQuestionType && (
              <button
                onClick={() => setQuizState('question_type')}
                style={{
                  padding: '15px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                عودة إلى {getQuestionTypeTitle(lastQuestionType)}
              </button>
            )}
            
            <button
              onClick={() => {
                setQuizState('scope_selection')
                setScore(0)
                setQuestionsAnswered(0)
              }}
              style={{
                padding: '15px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              البداية
            </button>
            
            <button
              onClick={onClose}
              style={{
                padding: '15px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              إنهاء الاختبار
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}