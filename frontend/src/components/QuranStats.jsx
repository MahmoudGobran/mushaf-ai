import { useState } from 'react'
import axios from 'axios'
import { BarChart, BookOpen, Zap, X, User } from 'lucide-react' 
import VoiceSearch from './VoiceSearch'
import DownloadResults from './DownloadResults'  // ✅ إضافة الاستيراد

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRESET_STATS = [
    { title: 'أكثر الكلمات: الله', word: 'الله', icon: 'zap' },
    { title: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟', word: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟', icon: 'user' },
    { title: 'يَٰٓأَهْلَ ٱلْكِتَٰبِ', word: 'يَٰٓأَهْلَ ٱلْكِتَٰبِ', icon: 'book' },
    { title: 'بَنِىٓ إِسْرَٰٓءِيلَ', word: 'بَنِىٓ إِسْرَٰٓءِيلَ', icon: 'book' },

    { title: 'ٱلدُّنْيَا', word: 'ٱلدُّنْيَا', icon: 'book' },
    { title: 'ٱلْءَاخِرَةِ ', word: 'ٱلْءَاخِرَةِ ', icon: 'book' },
    { title: 'المَلَٰٓئِكَةِ ', word: 'المَلَٰٓئِكَةِ ', icon: 'book' },
    { title: 'ٱلشَّيْطَٰنُ ', word: 'ٱلشَّيْطَٰنُ ', icon: 'book' },
    { title: 'ضَرًّۭا ', word: 'ضَرًّۭا ', icon: 'book' },
    { title: 'نَفْعًۭا ۚ', word: 'نَفْعًۭا ۚ', icon: 'book' },
    { title: 'رِّجَالُ ', word: 'رِّجَالُ ', icon: 'book' },
    { title: 'نِّسَآءِ ', word: 'نِّسَآءِ ', icon: 'book' },
    { title: 'حسنه ', word: 'حسنه ', icon: 'book' },
    { title: 'سيئه', word: 'سيئه', icon: 'book' },
    { title: 'ٱلْمَوْتِ', word: 'ٱلْمَوْتِ', icon: 'book' },
    { title: 'ٱلْكُفْرَ ', word: 'ٱلْكُفْرَ ', icon: 'book' },
    { title: 'ٱلْإِيمَٰنِ', word: 'ٱلْإِيمَٰنِ', icon: 'book' },
    { title: 'شَهْرُ ', word: 'شَهْرُ ', icon: 'book' },
    { title: 'يَوْمِ ', word: 'يَوْمِ ', icon: 'book' },
    { title: 'إِبْرَٰهِيمُ', word: 'إِبْرَٰهِيمُ', icon: 'book' },

    { title: 'موسى', word: 'موسى', icon: 'book' },
    { title: 'عيسى ', word: 'عيسى ', icon: 'book' },
    { title: 'ٱلصَّلَوٰة', word: 'ٱلصَّلَوٰة', icon: 'book' },
    { title: 'ٱلزَّكَوٰة', word: 'ٱلزَّكَوٰة', icon: 'book' },
    { title: 'الجنة', word: 'الجنة', icon: 'book' },
    { title: 'النار', word: 'النار', icon: 'book' },
    { title: 'التقوى', word: 'التقوى', icon: 'book' }
];

export default function QuranStats({ onClose }) {
  const [word, setWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const searchWord = async (searchQuery = word) => { 
    if (!searchQuery.trim()) {
      alert('يرجى إدخال كلمة')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await axios.get(`${API_URL}/stats/word`, {
        params: {
          word: searchQuery.trim(), 
          limit: 100
        }
      })

      setResults(response.data)
      setWord(searchQuery)
      console.log('✅ نتائج الإحصائيات:', response.data)
    } catch (err) {
      console.error('❌ خطأ:', err)
      setError('حدث خطأ في تحميل الإحصائيات')
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (presetWord) => {
    setWord(presetWord); 
    searchWord(presetWord);
  }

  return (
    <div style={{
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
    onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}>
        
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '25px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            📊 إحصائيات القرآن
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
            }}>
            ×
          </button>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
              الإحصائيات الجاهزة ⚡️
            </h2>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px', 
                marginBottom: '30px' 
            }}>
                {PRESET_STATS.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handlePresetClick(item.word)}
                        style={{
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                            padding: '15px 10px',
                            borderRadius: '12px',
                            border: '2px solid #c7d2fe',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            minHeight: '60px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#eef2ff'}
                        disabled={loading}
                    >
                        {item.icon === 'zap' && <Zap size={18} />}
                        {item.icon === 'user' && <User size={18} />}
                        {item.icon === 'book' && <BookOpen size={18} />}
                        {item.title}
                    </button>
                ))}
            </div>
          </div>

          <div style={{
            marginBottom: '30px',
            padding: '25px',
            backgroundColor: '#f9fafb',
            borderRadius: '16px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
              البحث عن تكرار كلمة محددة
            </h2>
            
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px',
              textAlign: 'right',
              color: '#374151'
            }}>
              ابحث عن كلمة أو عبارة
            </label>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'stretch' }}>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchWord()}
                placeholder="مثال: الله، الرحمن، الصلاة..."
                style={{
                  flex: 1,
                  padding: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '18px',
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}
              />
              
              <VoiceSearch 
                onTranscript={setWord}
                onStartSearch={searchWord}
              />
              
              <button
                onClick={() => searchWord()}
                disabled={loading || !word.trim()}
                style={{
                  padding: '15px 30px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: loading || !word.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !word.trim() ? 0.5 : 1
                }}>
                {loading ? 'جاري البحث...' : '🔍 بحث'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '20px',
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
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #f59e0b',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}></div>
              <p style={{ fontSize: '18px', color: '#6b7280', fontWeight: 'bold' }}>
                جاري البحث في القرآن الكريم...
              </p>
            </div>
          )}

          {results && !loading && (
            <div>
              {/* ✅ إضافة زر التحميل هنا */}
              {results.matches && results.matches.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <DownloadResults 
                    data={results.matches}
                    filename={`إحصائيات_${word}_${results.total_count}_تكرار`}
                  //  displayTitle={`إحصائيات كلمة: ${searchWord}`}  // ✅ عربي
                    type="stats"
                  />
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#d97706' }}>
                    {results.total_count}
                  </div>
                  <div style={{ fontSize: '14px', color: '#92400e', marginTop: '5px' }}>
                    إجمالي التكرارات
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1e40af' }}>
                    {results.verses_count}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1e3a8a', marginTop: '5px' }}>
                    عدد الآيات
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#047857' }}>
                    {Object.keys(results.by_surah || {}).length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#065f46', marginTop: '5px' }}>
                    عدد السور
                  </div>
                </div>
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '15px',
                textAlign: 'right',
                color: '#374151'
              }}>
                التوزيع حسب السور (أكثر 10 سور):
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '10px',
                marginBottom: '30px'
              }}>
                {Object.entries(results.by_surah || {}).slice(0, 10).map(([surah, count], index) => (
                  <div key={index} style={{
                    padding: '15px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '18px' }}>
                      {count}
                    </span>
                    <span style={{ fontSize: '16px', color: '#374151', textAlign: 'right' }}>
                      {surah}
                    </span>
                  </div>
                ))}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '15px',
                textAlign: 'right',
                color: '#374151'
              }}>
                أمثلة من الآيات (أول 10):
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {(results.matches || []).slice(0, 10).map((match, index) => (
                  <div key={index} style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '10px',
                      textAlign: 'right',
                      fontWeight: 'bold'
                    }}>
                      {match.verse.surah_name} ({match.verse.surah}:{match.verse.ayah}) - 
                      <span style={{ color: '#f59e0b', marginRight: '5px' }}>
                        {match.count} مرة
                      </span>
                    </div>
                    <p style={{
                      fontSize: '18px',
                      lineHeight: '2',
                      fontFamily: 'Amiri, serif',
                      color: '#1f2937',
                      textAlign: 'right',
                      margin: 0
                    }}>
                      {match.verse.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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