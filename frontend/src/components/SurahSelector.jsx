import { useState, useEffect, useRef } from 'react'
import { Mic, Search } from 'lucide-react'

// قائمة السور الـ 114
const SURAHS = [
  { number: 1, name: 'الفاتحة' },
  { number: 2, name: 'البقرة' },
  { number: 3, name: 'آل عمران' },
  { number: 4, name: 'النساء' },
  { number: 5, name: 'المائدة' },
  { number: 6, name: 'الأنعام' },
  { number: 7, name: 'الأعراف' },
  { number: 8, name: 'الأنفال' },
  { number: 9, name: 'التوبة' },
  { number: 10, name: 'يونس' },
  { number: 11, name: 'هود' },
  { number: 12, name: 'يوسف' },
  { number: 13, name: 'الرعد' },
  { number: 14, name: 'إبراهيم' },
  { number: 15, name: 'الحجر' },
  { number: 16, name: 'النحل' },
  { number: 17, name: 'الإسراء' },
  { number: 18, name: 'الكهف' },
  { number: 19, name: 'مريم' },
  { number: 20, name: 'طه' },
  { number: 21, name: 'الأنبياء' },
  { number: 22, name: 'الحج' },
  { number: 23, name: 'المؤمنون' },
  { number: 24, name: 'النور' },
  { number: 25, name: 'الفرقان' },
  { number: 26, name: 'الشعراء' },
  { number: 27, name: 'النمل' },
  { number: 28, name: 'القصص' },
  { number: 29, name: 'العنكبوت' },
  { number: 30, name: 'الروم' },
  { number: 31, name: 'لقمان' },
  { number: 32, name: 'السجدة' },
  { number: 33, name: 'الأحزاب' },
  { number: 34, name: 'سبأ' },
  { number: 35, name: 'فاطر' },
  { number: 36, name: 'يس' },
  { number: 37, name: 'الصافات' },
  { number: 38, name: 'ص' },
  { number: 39, name: 'الزمر' },
  { number: 40, name: 'غافر' },
  { number: 41, name: 'فصلت' },
  { number: 42, name: 'الشورى' },
  { number: 43, name: 'الزخرف' },
  { number: 44, name: 'الدخان' },
  { number: 45, name: 'الجاثية' },
  { number: 46, name: 'الأحقاف' },
  { number: 47, name: 'محمد' },
  { number: 48, name: 'الفتح' },
  { number: 49, name: 'الحجرات' },
  { number: 50, name: 'ق' },
  { number: 51, name: 'الذاريات' },
  { number: 52, name: 'الطور' },
  { number: 53, name: 'النجم' },
  { number: 54, name: 'القمر' },
  { number: 55, name: 'الرحمن' },
  { number: 56, name: 'الواقعة' },
  { number: 57, name: 'الحديد' },
  { number: 58, name: 'المجادلة' },
  { number: 59, name: 'الحشر' },
  { number: 60, name: 'الممتحنة' },
  { number: 61, name: 'الصف' },
  { number: 62, name: 'الجمعة' },
  { number: 63, name: 'المنافقون' },
  { number: 64, name: 'التغابن' },
  { number: 65, name: 'الطلاق' },
  { number: 66, name: 'التحريم' },
  { number: 67, name: 'الملك' },
  { number: 68, name: 'القلم' },
  { number: 69, name: 'الحاقة' },
  { number: 70, name: 'المعارج' },
  { number: 71, name: 'نوح' },
  { number: 72, name: 'الجن' },
  { number: 73, name: 'المزمل' },
  { number: 74, name: 'المدثر' },
  { number: 75, name: 'القيامة' },
  { number: 76, name: 'الإنسان' },
  { number: 77, name: 'المرسلات' },
  { number: 78, name: 'النبأ' },
  { number: 79, name: 'النازعات' },
  { number: 80, name: 'عبس' },
  { number: 81, name: 'التكوير' },
  { number: 82, name: 'الانفطار' },
  { number: 83, name: 'المطففين' },
  { number: 84, name: 'الانشقاق' },
  { number: 85, name: 'البروج' },
  { number: 86, name: 'الطارق' },
  { number: 87, name: 'الأعلى' },
  { number: 88, name: 'الغاشية' },
  { number: 89, name: 'الفجر' },
  { number: 90, name: 'البلد' },
  { number: 91, name: 'الشمس' },
  { number: 92, name: 'الليل' },
  { number: 93, name: 'الضحى' },
  { number: 94, name: 'الشرح' },
  { number: 95, name: 'التين' },
  { number: 96, name: 'العلق' },
  { number: 97, name: 'القدر' },
  { number: 98, name: 'البينة' },
  { number: 99, name: 'الزلزلة' },
  { number: 100, name: 'العاديات' },
  { number: 101, name: 'القارعة' },
  { number: 102, name: 'التكاثر' },
  { number: 103, name: 'العصر' },
  { number: 104, name: 'الهمزة' },
  { number: 105, name: 'الفيل' },
  { number: 106, name: 'قريش' },
  { number: 107, name: 'الماعون' },
  { number: 108, name: 'الكوثر' },
  { number: 109, name: 'الكافرون' },
  { number: 110, name: 'النصر' },
  { number: 111, name: 'المسد' },
  { number: 112, name: 'الإخلاص' },
  { number: 113, name: 'الفلق' },
  { number: 114, name: 'الناس' }
]

// دالة تطبيع النص العربي للبحث
const normalizeArabic = (text) => {
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim()
    .toLowerCase()
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export { SURAHS } // تصدير قائمة السور للاستخدام في مكونات أخرى

export default function SurahSelector({ value, onChange, placeholder = 'اختر سورة' }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const containerRef = useRef(null)
  const recognitionRef = useRef(null)

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // إعداد البحث الصوتي
  useEffect(() => {
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'ar-SA'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      console.log('🗣️ نطق السورة:', transcript)
      setIsListening(false)
      
      // تطبيع النطق
      const normalized = normalizeArabic(transcript)
      
      // البحث في السور
      const found = SURAHS.find(s => {
        const normalizedName = normalizeArabic(s.name)
        return normalizedName.includes(normalized) || 
               normalized.includes(normalizedName) ||
               normalizedName === normalized
      })

      if (found) {
        onChange(found.number)
        setSearchTerm(found.name)
        setIsOpen(false)
      } else {
        setSearchTerm(transcript)
        setIsOpen(true)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onChange])

  // تشغيل/إيقاف البحث الصوتي
  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('البحث الصوتي غير مدعوم في متصفحك')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('خطأ في البحث الصوتي:', err)
      }
    }
  }

  // تصفية السور
  const filteredSurahs = SURAHS.filter(surah => {
    if (!searchTerm) return true
    const normalized = normalizeArabic(searchTerm)
    const normalizedName = normalizeArabic(surah.name)
    return normalizedName.includes(normalized) || 
           surah.number.toString().includes(searchTerm)
  })

  // اسم السورة المختارة
  const selectedSurah = SURAHS.find(s => s.number === value)

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        alignItems: 'stretch'
      }}>
        {/* حقل البحث/الاختيار */}
        <input
          type="text"
          value={selectedSurah ? selectedSurah.name : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '10px 15px',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'right',
            direction: 'rtl',
            fontWeight: '500',
            fontFamily: 'Amiri, serif'
          }}
        />

        {/* زر البحث الصوتي */}
        <button
          type="button"
          onClick={toggleVoiceSearch}
          disabled={isListening}
          style={{
            padding: '10px',
            backgroundColor: isListening ? '#ef4444' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isListening ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '45px'
          }}
          title="البحث الصوتي"
        >
          <Mic size={18} style={isListening ? { animation: 'pulse 1s infinite' } : {}} />
        </button>
      </div>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: '2px solid #d1d5db',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {filteredSurahs.length > 0 ? (
            filteredSurahs.map(surah => (
              <div
                key={surah.number}
                onClick={() => {
                  onChange(surah.number)
                  setSearchTerm('')
                  setIsOpen(false)
                }}
                style={{
                  padding: '12px 15px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  textAlign: 'right',
                  direction: 'rtl',
                  backgroundColor: value === surah.number ? '#eef2ff' : 'white',
                  fontFamily: 'Amiri, serif',
                  fontSize: '15px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 
                    value === surah.number ? '#eef2ff' : 'white'
                }}
              >
                <strong>{surah.number}.</strong> {surah.name}
              </div>
            ))
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#9ca3af',
              fontFamily: 'Amiri, serif'
            }}>
              لم يتم العثور على سورة
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}