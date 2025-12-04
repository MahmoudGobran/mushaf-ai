import { useState, useEffect, createContext } from 'react'
import axios from 'axios'
import { Search, RefreshCw, User, HelpCircle } from 'lucide-react'
import VoiceSearch from './components/VoiceSearch'
import QuranAudioPlayer from './components/QuranAudioPlayer'
import QuizGame from './components/QuizGame'
import SimilaritiesExplorer from './components/SimilaritiesExplorer'
import DownloadResults from './components/DownloadResults'
import HelpModal from './components/HelpModal'
import QuranStats from './components/QuranStats'
import { normalizeSearchQuery } from './utils/textNormalizer'
import { highlightWordsInText } from './utils/textNormalizer'
import './styles.css'
import { initGA, trackPageView, Analytics } from './utils/analytics' // ✅ إضافة GA4

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
export const ReciterContext = createContext()

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [randomVerses, setRandomVerses] = useState([])
  const [showQuiz, setShowQuiz] = useState(false)
  const [showExplorer, setShowExplorer] = useState(false)
  const [explorerVerse, setExplorerVerse] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [stats, setStats] = useState(null)
  const [selectedReciter, setSelectedReciter] = useState('afasy')
  const [activeView, setActiveView] = useState(null)

  // 1. إضافة حالة searchHistory في قسم الحالات (States)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem('searchHistory')
      // الاحتفاظ بآخر 10 كلمات
      return savedHistory ? JSON.parse(savedHistory).slice(0, 10) : []
    } catch {
      return []
    }
  })

  const RECITERS = [
    { id: 'afasy', name: 'مشاري العفاسي' },
    { id: 'husary', name: 'محمود خليل الحصري' },
    { id: 'minshawi', name: 'محمد صديق المنشاوي' },
    { id: 'sudais', name: 'عبد الرحمن السديس' }
  ]

  // ✅ تهيئة GA4 عند تحميل التطبيق - بتسلسل صحيح
  useEffect(() => {
    console.log('🚀 App mounted - Initializing GA...')
    
    // ✅ تهيئة GA أولاً
    initGA()
    
    // ✅ تتبع الصفحة الرئيسية مع تأخير بسيط
    const timer = setTimeout(() => {
      trackPageView(window.location.pathname)
      console.log('✅ GA initialization and page tracking complete')
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    loadRandomVerses()
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/stats`)
      setStats(res.data)
      
      // 📊 تتبع عرض الإحصائيات العامة
      Analytics.viewWordStats('general_stats')
    } catch (err) {
      console.error('Stats error:', err)
    }
  }

  // ----------------------------------------------------
  // 2. إضافة دالة تحديث سجل البحث (Add this function)
  const updateSearchHistory = (query) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setSearchHistory(prevHistory => {
      // إزالة الكلمة إذا كانت موجودة وإضافتها كأحدث كلمة
      const newHistory = prevHistory.filter(item => item !== trimmedQuery)
      const updatedHistory = [trimmedQuery, ...newHistory].slice(0, 10) // الاحتفاظ بأحدث 10 كلمات
      
      try {
        localStorage.setItem('searchHistory', JSON.stringify(updatedHistory))
      } catch (e) {
        console.error('خطأ في حفظ سجل البحث:', e)
      }
      return updatedHistory
    })
  }
  // ----------------------------------------------------

  // ----------------------------------------------------
  // 3. إضافة دالة تشغيل البحث الصوتي (Add this function)
  const startVoiceSearch = (query) => {
    // تنظيف query الصوتي (إزالة النقاط etc)
    const cleanedQuery = query.replace(/[.,]/g, '').trim();
    setSearchQuery(cleanedQuery) 
    
    // 📊 تتبع استخدام البحث الصوتي
    Analytics.useFeature('voice_search')
    
    handleSearch(cleanedQuery) // تشغل handleSearch التي بدورها تحفظ السجل
  }
  // ----------------------------------------------------

  // ✅ تحديث دالة loadRandomVerses لاستخدام endpoint الجديد
  const loadRandomVerses = async () => {
    try {
      // 📊 تتبع تحديث الآيات العشوائية
      Analytics.useFeature('refresh_random_verses')
      
      // ✅ استخدام endpoint الجديد للآيات المحسّنة
      const res = await axios.get(`${API_URL}/verses/random-with-similarities`, {
        params: {
          limit: 10,           // ✅ 10 آيات بدلاً من 5
          min_similarity: 0.85  // ✅ نسبة تشابه 85%+
        }
      })
    
      console.log('✅ تم جلب آيات عشوائية محسّنة:', res.data)
      setRandomVerses(res.data.verses || [])
    } catch (err) {
      console.error('❌ خطأ في جلب الآيات:', err)
    
      // Fallback: الطريقة القديمة
      try {
        const skip = Math.floor(Math.random() * 6000)
        const res = await axios.get(`${API_URL}/verses?skip=${skip}&limit=10`)
        setRandomVerses(res.data)
      } catch (fallbackErr) {
        console.error('❌ خطأ في Fallback:', fallbackErr)
      }
    }
  }

  // 4. تعديل دالة handleSearch لاستدعاء تحديث السجل (Replace the whole function)
// ✅ الحل: أرسل النص الأصلي للباك اند
const handleSearch = async (query = searchQuery) => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || isSearching) return

  setIsSearching(true)
  setSearchResults([])

  try {
    // ✅ أرسل النص الأصلي بدون تنظيف!
    const response = await axios.get(`${API_URL}/search`, {
      params: {
        q: trimmedQuery,  // ✅ النص الأصلي
        limit: 100,
        threshold: 0.7, // ✅ رفع threshold إلى 0.7 لمطابقة أفضل
        highlight: true  // ✅ طلب التظليل
      }
    })

    const searchData = response.data;
    const versesArray = searchData.verses || searchData.results || searchData.versions || [];

    if (versesArray.length > 0) {
      setSearchResults(versesArray);
      updateSearchHistory(trimmedQuery);
      
      // 📊 تتبع البحث الناجح
      Analytics.search(trimmedQuery, versesArray.length);
    } else {
      alert('لم يتم العثور على نتائج مطابقة.');
      
      // 📊 تتبع البحث بدون نتائج
      Analytics.search(trimmedQuery, 0);
    }
  } catch (error) {
    console.error('خطأ في عملية البحث:', error);
    
    // 📊 تتبع خطأ البحث
    Analytics.trackEvent('Search', 'search_error', error.message);
    
    if (error.response) {
      alert('خطأ في الخادم: ' + (error.response.data?.message || 'يرجى المحاولة لاحقًا'));
    } else if (error.request) {
      alert('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.');
    } else {
      alert('حدث خطأ غير متوقع أثناء البحث.');
    }
  } finally {
    setIsSearching(false);
  }
}

  const handleVoiceSearch = (transcript) => {
    setSearchQuery(transcript)
    setTimeout(() => handleSearch(), 300)
  }

  // ✅ دالة واضحة ومباشرة لفتح المتشابهات
  const openSimilarities = (verse) => {
    console.log('Opening similarities for verse:', verse)
    setExplorerVerse(verse)
    setShowExplorer(true)
    
    // 📊 تتبع عرض المتشابهات
    Analytics.viewSimilarVerses(verse.id || verse.surah + ':' + verse.ayah, 0)
  }

  // ✅ دالة واضحة لإغلاق المتشابهات
  const closeSimilarities = () => {
    setShowExplorer(false)
    setTimeout(() => setExplorerVerse(null), 300)
  }

  // ✅ تعريف متغير مساعد لنتائج البحث
  const searchVersesArray = searchResults?.results || searchResults;

  return (
    <ReciterContext.Provider value={selectedReciter}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
        
        <header style={{ textAlign: 'center', color: 'white', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
            🌙 المصحف الذكي للمتشابهات
          </h1>
          <p style={{ fontSize: '20px', opacity: 0.95 }}>ابحث، قارن، واحفظ الآيات المتشابهة بسهولة</p>
          {stats && (
            <p style={{ fontSize: '16px', opacity: 0.9, marginTop: '8px' }}>
              📖 {stats.total_verses} آية | {stats.total_surahs} سورة
            </p>
          )}
        </header>

        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
            {/* 🔴 تم حذف زر اختيار القارئ من هنا */}

            <button onClick={() => {
              setShowHelp(true)
              // 📊 تتبع فتح المساعدة
              Analytics.useFeature('help_modal')
            }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', transition: 'all 0.3s' }}>
              <HelpCircle size={24} />
              المساعدة والإرشاد
            </button>
          </div>

          {/* 1. عرض زر التحميل لـ الآيات العشوائية */}
          {randomVerses.length > 0 && searchQuery.length === 0 && activeView === null && (
              <DownloadResults 
                  data={randomVerses}
                  filename="الآيات العشوائية" 
                  type="search"
              />
          )}

          {/* 2. عرض زر التحميل لـ نتائج البحث */}
          {searchVersesArray && searchVersesArray.length > 0 && searchQuery.length > 0 && activeView === null && (
              <DownloadResults 
                  data={searchVersesArray}
                  filename={`نتائج بحث: ${searchQuery}`}
                  type="search"
              />
          )}

          {/* Search Box */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', marginBottom: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '25px', color: '#1f2937', textAlign: 'center' }}>
              🔍 البحث النصي
            </h2>
            
            {/* 5. استبدال محتوى div شريط البحث بالكامل */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'stretch' }}>
              
              {/* 🎙️ مكون البحث الصوتي (يستخدم الدالة الجديدة startVoiceSearch) */}
              <VoiceSearch 
                onTranscript={setSearchQuery} 
                onStartSearch={startVoiceSearch} 
              />
              
              {/* حقل الإدخال */}
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="ابحث عن آية أو متشابهة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '20px 25px', 
                    fontSize: '20px', 
                    border: '3px solid #e5e7eb', 
                    borderRadius: '16px', 
                    fontFamily: 'Amiri, serif', 
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                  list="search-history-list" 
                />

                {/* 🆕 قائمة سجل البحث (datalist) */}
                <datalist id="search-history-list">
                  {searchHistory.map((query, index) => (
                    <option key={index} value={query} />
                  ))}
                </datalist>
              </div>
              
              {/* زر البحث (يبقى كما هو) */}
              <button 
                onClick={() => handleSearch()} 
                disabled={isSearching || !searchQuery.trim()}
                style={{ 
                  padding: '20px 40px', 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  backgroundColor: isSearching ? '#9ca3af' : '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '16px', 
                  cursor: isSearching ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  minWidth: '180px', 
                  justifyContent: 'center' 
                }}
              >
                {isSearching ? (
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Search size={24} />
                )}
                {isSearching ? 'جاري البحث...' : 'بحث'}
              </button>
            </div>

            {/* Search Results */}
            {searchVersesArray && searchVersesArray.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px solid #10b981' }}>
                  <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#065f46', margin: 0 }}>
                    📋 النتائج ({searchVersesArray.length} آية)
                  </h3>
                  <DownloadResults data={searchVersesArray} filename={` نتائج البحث النصي: ${searchQuery}`} type="search" />                                              
                </div>
                
                <div style={{ display: 'grid', gap: '15px', maxHeight: '500px', overflowY: 'auto', padding: '10px' }}>
                  {searchVersesArray.map((verse) => (
                    <div key={verse.id} style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                          {verse.surah_name} ({verse.surah}:{verse.ayah})
                        </span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <QuranAudioPlayer surah={verse.surah} ayah={verse.ayah} reciter={selectedReciter} />
                          {/* ✅ زر عرض المتشابهات - واضح ومباشر */}
                          <button 
                            onClick={() => openSimilarities(verse)} 
                            style={{ 
                              padding: '10px 16px', 
                              backgroundColor: '#8b5cf6', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px', 
                              fontSize: '14px', 
                              fontWeight: 'bold', 
                              cursor: 'pointer', 
                              whiteSpace: 'nowrap' 
                            }}
                          >
                            🔍 عرض المتشابهات
                          </button>
                        </div>
                      </div>
                      {/* 🔥 FIXED: Use highlighted text with yellow background */}
                      <p 
                        style={{ fontSize: '20px', lineHeight: '2', fontFamily: 'Amiri, serif', textAlign: 'right', margin: 0, color: '#1f2937' }}
                        dangerouslySetInnerHTML={{ 
                          __html: verse.highlighted_text || verse.text 
                        }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            <button onClick={() => {
              setShowQuiz(true)
              // 📊 تتبع بدء الاختبار
              Analytics.startQuiz('general', 'all')
            }} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none', padding: '35px 30px', borderRadius: '20px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', textAlign: 'right', boxShadow: '0 8px 20px rgba(240, 147, 251, 0.4)', transition: 'all 0.3s' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎮</div>
              <div style={{ marginBottom: '10px' }}>اختبر حفظك</div>
              <div style={{ fontSize: '16px', opacity: 0.9, fontWeight: 'normal' }}>اختبارات تفاعلية مع نطاقات مخصصة</div>
            </button>

            <button onClick={() => { 
              setExplorerVerse(null); 
              setShowExplorer(true);
              // 📊 تتبع استكشاف المتشابهات
              Analytics.useFeature('similarities_explorer')
            }} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', border: 'none', padding: '35px 30px', borderRadius: '20px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', textAlign: 'right', boxShadow: '0 8px 20px rgba(79, 172, 254, 0.4)', transition: 'all 0.3s' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
              <div style={{ marginBottom: '10px' }}>استكشاف المتشابهات</div>
              <div style={{ fontSize: '16px', opacity: 0.9, fontWeight: 'normal' }}>اكتشف الآيات المتشابهة لفظياً</div>
            </button>

            {/* ✅ زر إحصائيات القرآن الجديد */}
            <button
              onClick={() => {
                setActiveView('stats')
                // 📊 تتبع عرض الإحصائيات
                Analytics.useFeature('quran_stats')
              }}
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '30px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
              <div>إحصائيات القرآن</div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>
                ابحث عن تكرار كلمة في المصحف
              </div>
            </button>
          </div>

          {/* Random Verses */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '35px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                ✨ آيات عشوائية
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                {randomVerses.length > 0 && <DownloadResults data={randomVerses} filename=" الآيات العشوائية " type="search" />}
                <button onClick={loadRandomVerses} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  <RefreshCw size={18} />
                  تحديث
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '18px' }}>
              {randomVerses.map((verse) => (
                <div key={verse.id} style={{ padding: '22px', backgroundColor: '#f9fafb', borderRadius: '14px', border: '2px solid #e5e7eb', transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#667eea' }}>
                      {verse.surah_name} ({verse.surah}:{verse.ayah})
                    </span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {/* ✅ هذا الزر سيبقى ويعمل لأنه يعتمد على selectedReciter و RECITERS */}
                      <QuranAudioPlayer surah={verse.surah} ayah={verse.ayah} reciter={selectedReciter} />
                      
                      {/* ✅ زر عرض المتشابهات - متطابق مع نتائج البحث */}
                      <button 
                        onClick={() => openSimilarities(verse)} 
                        style={{ 
                          padding: '10px 16px', 
                          backgroundColor: '#8b5cf6', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        🔍 عرض المتشابهات
                      </button>
                    </div>
                  </div>
                  {/* 🔥 FIXED: Use highlighted text for random verses too */}
                  <p 
                    style={{ fontSize: '21px', lineHeight: '2.2', fontFamily: 'Amiri, serif', textAlign: 'right', margin: 0, color: '#1f2937' }}
                    dangerouslySetInnerHTML={{ 
                      __html: verse.highlighted_text || verse.text 
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

      <footer style={{ 
          // هذه الخاصية هي المسافة المطلوبة بين الآيات والتذييل
          marginTop: "60px", 
          paddingBottom: "20px", 
          paddingTop: "20px",
          textAlign: "center"
      }}>
          <div style={{ 
              maxWidth: "1400px",
              margin: "0 auto",
              paddingLeft: "16px", 
              paddingRight: "16px" 
          }}>
              <p style={{ 
                  fontSize: "30px", // حجم خط كبير (يمكن تعديله إلى 28px/24px حسب رغبتك)
                  color: "white", // اللون الأبيض لكي يكون واضحاً
                  fontWeight: "bold", // خط ثقيل/جريء
                  marginBottom: "10px" // مسافة أسفل العنوان
              }}>
                  المصحف الذكي للمتشابهات
              </p>
        
              <p style={{ 
                  color: "white", // اللون الأبيض
                  opacity: 0.8, // وضوح أقل قليلاً
                  marginBottom: "25px" // مسافة بين النص والشارات
              }}>
                  تطبيق لمشروع مفتوح المصدر
              </p>
        
              <div style={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  gap: "1rem", 
                  fontSize: "16px", 
                  flexWrap: "wrap" 
              }}>
                  <span style={{ 
                      backgroundColor: "rgba(255, 255, 255, 0.1)", 
                      color: "white", 
                      padding: "4px 12px", 
                      borderRadius: "20px" 
                  }}>
                      البيانات من Tanzil.net
                  </span>
                  <span style={{ 
                      backgroundColor: "rgba(255, 255, 255, 0.1)", 
                      color: "white", 
                      padding: "4px 12px", 
                      borderRadius: "20px" 
                  }}>
                      بني بـ React و FastAPI
                  </span>
              </div>
          </div>
      </footer>

        {/* Modals */}
        {showQuiz && <QuizGame onClose={() => setShowQuiz(false)} />}
        {showExplorer && <SimilaritiesExplorer onClose={closeSimilarities} selectedReciter={selectedReciter} initialVerse={explorerVerse} />}
        {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
        
        {/* ✅ عرض إحصائيات القرآن */}
        {activeView === 'stats' && (
          <QuranStats onClose={() => setActiveView(null)} />
        )}
      </div>
    </ReciterContext.Provider>
  )
}

export default App