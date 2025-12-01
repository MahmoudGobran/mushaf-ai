import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// دالة مساعدة لعرض نص الآية مع تلوين
const renderHighlightedText = (highlightedText, verseIndex, comparison) => {
  if (!highlightedText || !comparison) return null;

  // اللون الأصفر للكلمات الموجودة في الآية الأولى فقط
  const color1 = '#fef08a'; 
  // اللون الأخضر للكلمات الموجودة في الآية الثانية فقط
  const color2 = '#86efac'; 

  return (
    <p style={{ 
      fontFamily: 'Amiri, serif', 
      fontSize: '20px', 
      margin: '10px 0', 
      textAlign: 'right',
      lineHeight: '2.5'
    }} dir="rtl">
      {highlightedText.map((item, index) => (
        <span 
          key={index} 
          style={{
            // item.type = 'diff' (unique) or 'common'
            backgroundColor: item.type === 'diff' 
              ? (verseIndex === 1 ? color1 : color2)
              : 'transparent',
            padding: '2px 0'
          }}
        >
          {item.text}{' '}
        </span>
      ))}
    </p>
  );
};


export default function SimilarVersesModal({ verse, onClose }) {
  const [similarVerses, setSimilarVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState(null)

  // Use verse?.id as dependency to handle undefined verse
  useEffect(() => {
    setComparison(null)
    setError(null)
  
    if (verse && verse.id) {
      loadSimilarVerses()
    } else {
      setLoading(false)
      setError('لم يتم تحديد آية للمقارنة')
    }
  }, [verse?.id])
  
  const loadSimilarVerses = async () => {
    setLoading(true)
    setError(null)
    setSimilarVerses([])
  
    console.log('🔍 جاري تحميل المتشابهات للآية:', verse)
  
    if (!verse || !verse.id) {
      setError('لم يتم تحديد آية صحيحة')
      setLoading(false)
      return
    }
  
    try {
      console.log(`📤 طلب المتشابهات للآية ID: ${verse.id}`)
    
      const response = await axios.get(`${API_URL}/similar/${verse.id}`, {
        params: {
          limit: 10,
          threshold: 0.4,
          exclude_basmala: true
        },
        timeout: 30000
      })
    
      console.log('📥 استجابة الخادم:', response.data)
    
      if (response.data && response.data.similar_verses) {
        const verses = response.data.similar_verses
        console.log(`✅ تم تحميل ${verses.length} آية مشابهة`)
        setSimilarVerses(verses)
      
        if (verses.length === 0) {
          setError('لا توجد آيات مشابهة دلالياً لهذه الآية')
        }
      } else {
        console.log('⚠️ لا توجد بيانات في الاستجابة')
        setSimilarVerses([])
        setError('لم يتم العثور على متشابهات')
      }
    } catch (err) {
      console.error('❌ خطأ في تحميل المتشابهات:', err)
    
      let errorMessage = 'حدث خطأ في تحميل المتشابهات'
    
      if (err.response) {
        // الخادم أرجع خطأ
        console.error('📛 خطأ من الخادم:', err.response.status, err.response.data)
      
        if (err.response.status === 503) {
          errorMessage = 'محرك البحث الدلالي غير جاهز. يرجى الانتظار دقيقة وإعادة المحاولة.'
        } else if (err.response.status === 404) {
          errorMessage = 'الآية غير موجودة في قاعدة البيانات'
        } else if (err.response.status === 500) {
          errorMessage = `خطأ في الخادم: ${err.response.data.detail || 'خطأ غير معروف'}`
        } else {
          errorMessage = `خطأ من الخادم: ${err.response.status}`
        }
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الانتظار. الخادم قد يكون بطيئاً. حاول مرة أخرى.'
      } else if (err.request) {
        errorMessage = 'لا يمكن الاتصال بالخادم. تأكد من تشغيل Backend على http://localhost:8000'
      }
    
      setError(errorMessage)
      setSimilarVerses([])
    } finally {
      setLoading(false)
    }
  }

  const compareVerses = async (verse2Id) => {
    setComparing(true)
    setComparison(null)
    setError(null)
    try {
      const response = await axios.get(`${API_URL}/compare/${verse.id}/${verse2Id}`)
      setComparison(response.data)
    } catch (err) {
      console.error('خطأ في المقارنة:', err)
      setError('حدث خطأ في المقارنة. تأكد من أن الـ Backend يعمل.')
    } finally {
      setComparing(false)
    }
  }
  
  // لتبسيط العرض: تحويل مسافة L2 (الأقل هو الأفضل) إلى نسبة مئوية وهمية (الأكبر هو الأفضل)
  const normalizeDistanceToSimilarity = useMemo(() => {
    if (similarVerses.length === 0) return (distance) => 0;

    // أكبر مسافة L2 في النتائج (أسوأ تشابه)
    const maxDistance = Math.max(...similarVerses.map(v => v.distance));
    // أصغر مسافة L2 في النتائج (أفضل تشابه)
    const minDistance = Math.min(...similarVerses.map(v => v.distance));
    
    // دالة تحويل L2 إلى [0, 1] حيث 1 هو التشابه الأفضل
    const range = maxDistance - minDistance;
    
    return (distance) => {
        if (range === 0) return 100;
        // 1. عكس المسافة: (maxDistance - distance) -> تصبح القيمة الأفضل هي الأكبر
        // 2. تطبيع: قسمة على Range
        // 3. تحويل إلى نسبة مئوية (0-100)
        return Math.round(((maxDistance - distance) / range) * 100);
    }
  }, [similarVerses]);

  // Early return if verse is undefined
  if (!verse) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col"
          dir="rtl"
        >
          <div className="bg-fuchsia-600 text-white p-5 flex justify-between items-center flex-shrink-0">
            <h2 className="text-2xl font-bold">خطأ</h2>
            <button onClick={onClose} className="text-xl font-bold hover:text-gray-200 transition-colors">
              &times;
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-grow flex items-center justify-center">
            <p className="text-xl text-gray-600">لم يتم تحديد آية للمقارنة</p>
          </div>
        </div>
      </div>
    );
  }


return (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      overflow: 'auto'
    }}
    onClick={onClose}
  >
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '95%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #d946ef 0%, #9333ea 100%)',
        color: 'white',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, direction: 'rtl' }}>
          🔍 المتشابهات الدلالية للآية
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ 
        padding: '25px', 
        overflowY: 'auto', 
        flex: 1,
        direction: 'rtl'
      }}>
        {/* Debug Info */}
        {verse && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '15px',
            backgroundColor: '#fef3c7', 
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            direction: 'ltr',
            textAlign: 'left'
          }}>
            <strong>Debug:</strong> ID: {verse.id} | Results: {similarVerses.length} | Error: {error || 'None'}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#fee2e2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            color: '#991b1b',
            textAlign: 'right'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* الآية المستهدفة */}
        <div style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#faf5ff',
          borderRadius: '12px',
          border: '2px solid #d946ef',
          textAlign: 'right'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9333ea', marginBottom: '10px' }}>
            {verse.surah_name} ({verse.surah}:{verse.ayah})
          </h3>
          <p style={{ 
            fontSize: '20px', 
            color: '#1f2937', 
            fontFamily: 'Amiri, serif',
            lineHeight: '2',
            margin: 0
          }}>
            {verse.text}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #d946ef',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>جاري البحث...</p>
          </div>
        )}

        {/* Results */}
        {!loading && similarVerses.length > 0 && (
          <div>
            <h4 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '15px',
              textAlign: 'right',
              color: '#374151'
            }}>
              النتائج ({similarVerses.length})
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {similarVerses.map((sv) => (
                <div 
                  key={sv.verse_id}
                  style={{
                    padding: '15px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    textAlign: 'right'
                  }}>
                    <p style={{ 
                      fontSize: '15px', 
                      fontWeight: 'bold',
                      color: '#6366f1',
                      margin: 0
                    }}>
                      {sv.surah_name} ({sv.surah}:{sv.ayah})
                    </p>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#059669',
                      backgroundColor: '#d1fae5',
                      padding: '4px 12px',
                      borderRadius: '6px'
                    }}>
                      {normalizeDistanceToSimilarity(sv.distance)}%
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '17px',
                    color: '#374151',
                    fontFamily: 'Amiri, serif',
                    lineHeight: '1.8',
                    margin: '0 0 10px 0',
                    textAlign: 'right'
                  }}>
                    {sv.text}
                  </p>
                  
                  <button
                    onClick={() => compareVerses(sv.verse_id)}
                    disabled={comparing}
                    style={{
                      backgroundColor: '#6366f1',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: comparing ? 'not-allowed' : 'pointer',
                      opacity: comparing ? 0.5 : 1
                    }}
                  >
                    {comparing && comparison?.verse2.id === sv.verse_id ? 'جاري...' : 'قارن'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && similarVerses.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px' }}>
              لا توجد متشابهات
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              جرّب خفض حد التشابه في الإعدادات
            </p>
          </div>
        )}

        {/* Comparison */}
        {comparison && (
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              marginBottom: '15px',
              textAlign: 'right',
              color: '#374151'
            }}>
              مقارنة الفروقات
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'right' }}>
                {comparison.verse1.surah_name} ({comparison.verse1.surah}:{comparison.verse1.ayah})
              </h5>
              {renderHighlightedText(comparison.highlighted1, 1, comparison)}
            </div>
            
            <div>
              <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'right' }}>
                {comparison.verse2.surah_name} ({comparison.verse2.surah}:{comparison.verse2.ayah})
              </h5>
              {renderHighlightedText(comparison.highlighted2, 2, comparison)}
            </div>
            
            {/* مفتاح المقارنة */}
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#fff7ed', 
              borderRadius: '8px', 
              border: '1px dashed #fdba74',
              textAlign: 'center'
            }}>
              <p style={{ 
                fontWeight: 'bold',
                marginBottom: '10px',
                fontSize: '14px',
                color: '#b45309'
              }}>
                💡 مفتاح المقارنة:
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '20px',
                fontSize: '14px'
              }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    backgroundColor: '#fef08a',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    marginLeft: '5px'
                  }}>أصفر</span> في الأولى فقط
                </p>
                <p style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    backgroundColor: '#86efac',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    marginLeft: '5px'
                  }}>أخضر</span> في الثانية فقط
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)
}