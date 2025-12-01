import { useState, useEffect } from 'react'
import axios from 'axios'
import QuranAudioPlayer from './QuranAudioPlayer'
import DownloadResults from './DownloadResults'
import SurahSelector, { SURAHS } from './SurahSelector'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const VerseComparison = ({ verse1, verse2 }) => {
  const [highlightedData, setHighlightedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const compareAndHighlight = async () => {
    if (highlightedData) {
      setIsVisible(!isVisible)
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/compare/${verse1.id}/${verse2.id}`)
      setHighlightedData(response.data)
      setIsVisible(true)
    } catch (err) {
      console.error('Error:', err)
      alert('فشل في تحميل المقارنة')
    } finally {
      setLoading(false)
    }
  }

  const renderHighlightedText = (highlightedText, verseIndex) => {
    if (!highlightedText) return null
    const color1 = '#fef08a'
    const color2 = '#86efac'

    return (
      <p style={{ 
        fontFamily: 'Amiri, serif', 
        fontSize: '18px', 
        margin: 0, 
        textAlign: 'right',
        lineHeight: '2'
      }}>
        {highlightedText.map((item, index) => (
          <span 
            key={index} 
            style={{
              backgroundColor: item.type === 'diff' ? (verseIndex === 1 ? color1 : color2) : 'transparent',
              padding: '2px 0'
            }}
          >
            {item.text}{' '}
          </span>
        ))}
      </p>
    )
  }

  return (
    <div style={{ marginTop: '15px' }}>
      <button 
        onClick={compareAndHighlight} 
        disabled={loading}
        style={{
          width: '100%',
          backgroundColor: '#374151',
          color: 'white',
          fontWeight: '600',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          fontSize: '15px'
        }}
      >
        {loading ? 'جاري المقارنة...' : isVisible ? 'إخفاء الفروقات' : 'عرض الفروقات'}
      </button>

      {isVisible && highlightedData && (
        <div style={{ 
          marginTop: '15px', 
          padding: '20px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '12px',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h5 style={{ 
              fontSize: '15px', 
              fontWeight: 'bold', 
              marginBottom: '10px', 
              color: '#92400e',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                backgroundColor: '#fef08a', 
                width: '20px', 
                height: '20px', 
                borderRadius: '4px',
                display: 'inline-block'
              }}></span>
              الآية الأولى ({highlightedData.verse1.surah_name}:{highlightedData.verse1.ayah}):
            </h5>
            {renderHighlightedText(highlightedData.highlighted1, 1)}
          </div>
          
          <div>
            <h5 style={{ 
              fontSize: '15px', 
              fontWeight: 'bold', 
              marginBottom: '10px', 
              color: '#065f46',
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                backgroundColor: '#86efac', 
                width: '20px', 
                height: '20px', 
                borderRadius: '4px',
                display: 'inline-block'
              }}></span>
              الآية الثانية ({highlightedData.verse2.surah_name}:{highlightedData.verse2.ayah}):
            </h5>
            {renderHighlightedText(highlightedData.highlighted2, 2)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SimilaritiesExplorer({ onClose, selectedReciter, initialVerse = null }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [searchType, setSearchType] = useState('all')
  const [searchValue, setSearchValue] = useState('')
  const [selectedThird, setSelectedThird] = useState(1)
  const [compareType, setCompareType] = useState('all')
  const [compareValue, setCompareValue] = useState('')
  const [excludeBasmala, setExcludeBasmala] = useState(true)
  const [minSimilarity, setMinSimilarity] = useState(70)
  const [resultLimit, setResultLimit] = useState(500) // ✅ حالة جديدة لعدد النتائج
  const [error, setError] = useState(null)
  const [cancelToken, setCancelToken] = useState(null) // ✅ حالة جديدة لإلغاء البحث

  // ✅ دالة إلغاء البحث
  const cancelSearch = () => {
    if (cancelToken) {
      cancelToken.cancel('تم إلغاء البحث من قبل المستخدم')
      setLoading(false)
      setError('تم إلغاء البحث')
    }
  }

  // ✅ البحث التلقائي عند تمرير آية محددة
  useEffect(() => {
    if (initialVerse) {
      searchSimilaritiesForVerse(initialVerse)
    }
  }, [initialVerse])

  const searchSimilaritiesForVerse = async (verse) => {
    setLoading(true)
    setResults(null)
    setError(null)
  
    try {
      // 🌟 استخدام البحث الهجين الذكي - سريع + لفظي!
      const params = {
        threshold: 0.5,        // حد التشابه
        limit: 20,             // عدد النتائج
        exclude_basmala: true, // استبعاد البسملة
        method: 'smart'        // البحث الهجين الذكي (FAISS + لفظي)
      }
    
      console.log(`🔍 البحث الهجين عن متشابهات الآية ${verse.id}...`)
    
      const response = await axios.get(`${API_URL}/similar/${verse.id}`, { params })
    
      console.log(`✅ تم العثور على ${response.data.similar_verses.length} متشابه في ${response.data.search_time}`)
    
      // تحويل الصيغة لتتطابق مع البنية المتوقعة
      const similarities = response.data.similar_verses.map(sim => ({
        verse1: verse,        // الآية المستهدفة
        verse2: {             // الآية المتشابهة
          id: sim.verse_id,
          surah: sim.surah,
          surah_name: sim.surah_name,
          ayah: sim.ayah,
          text: sim.text
        },
        similarity: sim.similarity,
        score_percent: Math.round(sim.similarity * 100)
      }))
    
      setResults({
        total_found: similarities.length,
        similarities: similarities,
        search_time: response.data.search_time,
        search_scope: `متشابهات الآية ${verse.surah_name} (${verse.surah}:${verse.ayah})`,
        method: response.data.method_used
      })
    
    } catch (err) {
      console.error('❌ خطأ في البحث:', err)
      setError('حدث خطأ في تحميل المتشابهات. تأكد من أن الخادم يعمل.')
    } finally {
      setLoading(false)
    }
  }

  const canSearch = () => {
    if (searchType === 'all' || searchType === 'third') return true
    return true
  }

  const exploreSimilarities = async () => {
    if (!canSearch()) return
    
    setLoading(true)
    setResults(null)
    setError(null)
    
    // ✅ إنشاء رمز إلغاء جديد
    const source = axios.CancelToken.source()
    setCancelToken(source)

    const similarityValue = minSimilarity / 100.0

    try {
      const params = {
        min_similarity: similarityValue,
        limit: resultLimit,  // ✅ يستخدم القيمة من input
        exclude_basmala: excludeBasmala,
        use_faiss: true  // ✅ تفعيل FAISS للتسريع!
      }
      
      let searchScopeName = ''

      if (searchType === 'all') {
        params.full_quran = true
        searchScopeName = 'القرآن_الكامل'
      } else if (searchType === 'third') {
        params.third = selectedThird
        const thirdNames = {
          1: 'الثلث_الأول',
          2: 'الثلث_الثاني', 
          3: 'الثلث_الثالث'
        }
        searchScopeName = thirdNames[selectedThird]
      } else if (searchType === 'surah' && searchValue) {
        const surah = parseInt(searchValue)
        if (isNaN(surah) || surah < 1 || surah > 114) {
          setError("يرجى اختيار سورة صحيحة")
          setLoading(false)
          return
        }
        params.surah = surah
        const surahName = SURAHS.find(s => s.number === surah)?.name || `سورة_${surah}`
        searchScopeName = `سورة_${surahName}`
      } else if (searchType === 'juz' && searchValue) {
        const juz = parseInt(searchValue)
        if (isNaN(juz) || juz < 1 || juz > 30) {
          setError("يرجى إدخال رقم جزء صحيح بين 1 و 30")
          setLoading(false)
          return
        }
        params.juz = juz
        searchScopeName = `جزء_${juz}`
      }

      if ((searchType === 'surah' || searchType === 'juz')) {
        if (compareType === 'surah' && compareValue) {
          const compareSurah = parseInt(compareValue)
          if (isNaN(compareSurah) || compareSurah < 1 || compareSurah > 114) {
            setError("يرجى اختيار سورة صحيحة للمقارنة")
            setLoading(false)
            return
          }
          params.compare_surah = compareSurah
          const compareSurahName = SURAHS.find(s => s.number === compareSurah)?.name || `سورة_${compareSurah}`
          searchScopeName += `_مع_${compareSurahName}`
        } else if (compareType === 'juz' && compareValue) {
          const compareJuz = parseInt(compareValue)
          if (isNaN(compareJuz) || compareJuz < 1 || compareJuz > 30) {
            setError("يرجى إدخال رقم جزء صحيح للمقارنة")
            setLoading(false)
            return
          }
          params.compare_juz = compareJuz
          searchScopeName += `_مع_جزء_${compareJuz}`
        } else if (compareType === 'all') {
          searchScopeName += '_مع_القرآن_الكامل'
        }
      }

      console.log('🔍 بدء البحث مع FAISS المسرّع...')

      const response = await axios.get(`${API_URL}/all-similarities`, { 
        params,
        cancelToken: source.token // ✅ تمرير رمز الإلغاء
      })

      // ✅ إضافة اسم النطاق بالعربية للنتائج
      const resultsWithScope = {
        ...response.data,
        search_scope_arabic: searchScopeName
      }

      setResults(resultsWithScope)
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('✋ تم إلغاء البحث:', err.message)
        setError('تم إلغاء البحث')
      } else {
        console.error('❌ خطأ:', err)
        setError('حدث خطأ في تحميل المتشابهات. تأكد من أن الخادم يعمل.')
      }
    } finally {
      setLoading(false)
      setCancelToken(null)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9999,
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
          borderRadius: '24px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '25px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            🔍 مستكشف المتشابهات اللفظية
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              color: '#991b1b',
              textAlign: 'right'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* ✅ إظهار رسالة عند البحث عن آية محددة */}
          {initialVerse && (
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: '#dbeafe',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              textAlign: 'right'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', marginBottom: '10px' }}>
                🔍 المتشابهات مع الآية المحددة:
              </h3>
              <p style={{ fontSize: '16px', color: '#1e3a8a', fontFamily: 'Amiri, serif', lineHeight: '1.8', margin: 0 }}>
                <strong>{initialVerse.surah_name} ({initialVerse.surah}:{initialVerse.ayah})</strong>: {initialVerse.text}
              </p>
            </div>
          )}

          {/* إعدادات البحث - تخفى عند البحث عن آية محددة */}
          {!initialVerse && (
            <div style={{
              marginBottom: '25px',
              padding: '25px',
              backgroundColor: '#f3f4f6',
              borderRadius: '16px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'right', color: '#374151' }}>
                🎯 نطاق البحث
              </h4>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <select
                    value={searchType}
                    onChange={(e) => { setSearchType(e.target.value); setSearchValue(''); setError(null) }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      direction: 'rtl',
                      fontWeight: '500'
                    }}
                  >
                    <option value="all">📖 القرآن كاملاً</option>
                    <option value="third">📚 ثلث القرآن</option>
                    <option value="juz">📗 جزء محدد</option>
                    <option value="surah">📄 سورة محددة</option>
                  </select>
                </div>

                {searchType === 'third' && (
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <select
                      value={selectedThird}
                      onChange={(e) => setSelectedThird(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '14px',
                        direction: 'rtl',
                        fontWeight: 'bold',
                        backgroundColor: '#dbeafe'
                      }}
                    >
                      <option value={1}>الثلث الأول (أجزاء 1-10)</option>
                      <option value={2}>الثلث الثاني (أجزاء 11-20)</option>
                      <option value={3}>الثلث الثالث (أجزاء 21-30)</option>
                    </select>
                  </div>
                )}

                {(searchType === 'surah' || searchType === 'juz') && (
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    {searchType === 'surah' ? (
                      // ✅ قائمة السور المنسدلة للبحث
                      <SurahSelector
                        value={searchValue ? parseInt(searchValue) : null}
                        onChange={(num) => {
                          setSearchValue(num.toString())
                          setError(null)
                        }}
                        placeholder="اختر سورة أو اكتب رقمها"
                      />
                    ) : (
                      // حقل إدخال الجزء (يبقى كما هو)
                      <input
                        type="number"
                        value={searchValue}
                        onChange={(e) => {setSearchValue(e.target.value); setError(null)}}
                        min="1"
                        max="30"
                        placeholder="رقم الجزء"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          textAlign: 'center',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {(searchType === 'surah' || searchType === 'juz') && (
                <>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'right', color: '#374151' }}>
                    🔄 نطاق المقارنة
                  </h4>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <select
                        value={compareType}
                        onChange={(e) => { setCompareType(e.target.value); setCompareValue(''); setError(null) }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          direction: 'rtl',
                          fontWeight: '500'
                        }}
                      >
                        <option value="all">القرآن كاملاً</option>
                        <option value="surah">سورة محددة</option>
                        <option value="juz">جزء محدد</option>
                      </select>
                    </div>

                    {(compareType === 'surah' || compareType === 'juz') && (
                      <div style={{ flex: '1', minWidth: '200px' }}>
                        {compareType === 'surah' ? (
                          // ✅ قائمة السور المنسدلة للمقارنة
                          <SurahSelector
                            value={compareValue ? parseInt(compareValue) : null}
                            onChange={(num) => {
                              setCompareValue(num.toString())
                              setError(null)
                            }}
                            placeholder="اختر سورة للمقارنة"
                          />
                        ) : (
                          // حقل إدخال الجزء (يبقى كما هو)
                          <input
                            type="number"
                            value={compareValue}
                            onChange={(e) => {setCompareValue(e.target.value); setError(null)}}
                            min="1"
                            max="30"
                            placeholder="رقم الجزء"
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '2px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(searchType === 'all' || searchType === 'third') && (
                <div style={{
                  backgroundColor: '#dbeafe',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '15px',
                  marginBottom: '20px',
                  textAlign: 'right'
                }}>
                  <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', fontWeight: '500' }}>
                    ℹ️ سيتم البحث عن المتشابهات اللفظية داخل النطاق المحدد فقط.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '5px', textAlign: 'right' }}>
                    حد التشابه (%)
                  </label>
                  <input
                    type="number"
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(Math.min(100, Math.max(10, parseInt(e.target.value) || 10)))}
                    min="10"
                    max="100"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}
                  />
                </div>

                {/* ✅ إضافة حقل عدد النتائج الأقصى */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginBottom: '5px', 
                    textAlign: 'right' 
                  }}>
                    عدد النتائج الأقصى
                  </label>
                  <input
                    type="number"
                    value={resultLimit}
                    onChange={(e) => setResultLimit(Math.min(5000, Math.max(10, parseInt(e.target.value) || 100)))}
                    min="10"
                    max="5000"
                    placeholder="مثال: 500"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={excludeBasmala}
                    onChange={(e) => setExcludeBasmala(e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>استبعاد البسملة</span>
                </label>

                {/* ✅ زر إلغاء البحث مضاف هنا */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <button
                    onClick={exploreSimilarities}
                    disabled={loading || !canSearch()}
                    style={{
                      backgroundColor: '#667eea',
                      color: 'white',
                      fontWeight: 'bold',
                      padding: '12px 32px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: (loading || !canSearch()) ? 'not-allowed' : 'pointer',
                      opacity: (loading || !canSearch()) ? 0.5 : 1,
                      fontSize: '16px'
                    }}
                  >
                    {loading ? 'جاري البحث...' : 'ابدأ البحث'}
                  </button>

                  {loading && (
                    <button
                      onClick={cancelSearch}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: '12px 32px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      🛑 إيقاف البحث
                    </button>
                  )}
                </div>
              </div>

              {results && (
                <div style={{ marginTop: '15px', textAlign: 'right' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                    تم العثور على <span style={{ color: '#10b981', fontSize: '18px' }}>{results.total_found}</span> زوج متشابه
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '13px' }}>
                    النطاق: {results.search_scope} | الوقت: {results.search_time}
                  </p>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ fontSize: '18px', color: '#6b7280', fontWeight: 'bold' }}>جاري البحث عن المتشابهات اللفظية...</p>
            </div>
          )}

          {!loading && results && results.similarities && results.similarities.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <DownloadResults 
                data={results.similarities} 
                filename={`المتشابهات_اللفظية_${results.search_scope_arabic || results.search_scope?.replace(/\s+/g, '_') || 'نتائج'}`}
                type="similarities"
              />
            </div>
          )}

          {!loading && results && results.similarities && results.similarities.length > 0 && (
            <div>
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: 'bold', 
                marginBottom: '20px', 
                textAlign: 'right', 
                color: '#1f2937',
                paddingBottom: '10px',
                borderBottom: '2px solid #e5e7eb'
              }}>
                النتائج: {results.similarities.length} متشابهة
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {results.similarities.map((item, index) => (
                  <div 
                    key={`sim-${index}`}
                    style={{
                      padding: '20px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#667eea',
                        background: '#eef2ff',
                        padding: '8px 16px',
                        borderRadius: '8px'
                      }}>
                        التشابه: {item.score_percent}%
                      </span>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        #{index + 1}
                      </span>
                    </div>
                    
                    <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                      <div style={{ 
                        marginBottom: '15px',
                        padding: '15px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '12px',
                        border: '2px solid #fbbf24'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <p style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            color: '#92400e',
                            margin: 0
                          }}>
                            📖 {item.verse1.surah_name} ({item.verse1.surah}:{item.verse1.ayah})
                          </p>
                          <QuranAudioPlayer 
                            surah={item.verse1.surah} 
                            ayah={item.verse1.ayah}
                            reciter={selectedReciter}
                          />
                        </div>
                        <p style={{
                          fontSize: '18px',
                          lineHeight: '2',
                          fontFamily: 'Amiri, serif',
                          color: '#1f2937',
                          padding: '10px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          margin: 0
                        }}>
                          {item.verse1.text}
                        </p>
                      </div>
                      
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: '#d1fae5',
                        borderRadius: '12px',
                        border: '2px solid #10b981'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <p style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            color: '#065f46',
                            margin: 0
                          }}>
                            📗 {item.verse2.surah_name} ({item.verse2.surah}:{item.verse2.ayah})
                          </p>
                          <QuranAudioPlayer 
                            surah={item.verse2.surah} 
                            ayah={item.verse2.ayah}
                            reciter={selectedReciter}
                          />
                        </div>
                        <p style={{
                          fontSize: '18px',
                          lineHeight: '2',
                          fontFamily: 'Amiri, serif',
                          color: '#1f2937',
                          padding: '10px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          margin: 0
                        }}>
                          {item.verse2.text}
                        </p>
                      </div>
                    </div>
                    
                    <VerseComparison verse1={item.verse1} verse2={item.verse2} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && results && results.total_found === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280', marginBottom: '10px' }}>
                لم يتم العثور على متشابهات لفظية
              </h3>
              <p style={{ fontSize: '16px', color: '#9ca3af', marginBottom: '10px' }}>
                {initialVerse 
                  ? `لا توجد متشابهات لفظية مع الآية المحددة في نفس السورة`
                  : `النطاق: ${results.search_scope}`
                }
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                💡 جرب خفض حد التشابه إلى 50-60%
              </p>
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