/**
 * مكون تشغيل القرآن بأصوات المشايخ المشهورين
 * ملف: mushaf-ai/frontend/src/components/QuranAudioPlayer.jsx
 */

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2, Download } from 'lucide-react';

// قائمة المشايخ المتاحين
const RECITERS = {
  'husary': {
    name: 'محمود خليل الحصري',
    server: 'https://everyayah.com/data/Husary_128kbps'
  },
  'afasy': {
    name: 'مشاري راشد العفاسي',
    server: 'https://everyayah.com/data/Alafasy_128kbps'
  },
  'abdulbasit': {
    name: 'عبد الباسط عبد الصمد',
    server: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps'
  },
  'minshawi': {
    name: 'محمد صديق المنشاوي',
    server: 'https://everyayah.com/data/Minshawy_Murattal_128kbps'
  },
  'sudais': {
    name: 'عبد الرحمن السديس',
    server: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps'
  },
  'shuraim': {
    name: 'سعود الشريم',
    server: 'https://everyayah.com/data/Saood_ash-Shuraym_128kbps'
  }
};

const QuranAudioPlayer = ({ 
  surah, 
  ayah, 
  reciter = 'husary',
  autoPlay = false,
  showReciterSelect = true 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReciter, setSelectedReciter] = useState(reciter);
  const audioRef = useRef(null);

  // تنسيق رقم السورة والآية (001001 = سورة 1، آية 1)
  const formatAyahNumber = (surahNum, ayahNum) => {
    const paddedSurah = String(surahNum).padStart(3, '0');
    const paddedAyah = String(ayahNum).padStart(3, '0');
    return `${paddedSurah}${paddedAyah}`;
  };

  // بناء رابط الصوت
  const getAudioUrl = () => {
    const reciterData = RECITERS[selectedReciter];
    const ayahCode = formatAyahNumber(surah, ayah);
    return `${reciterData.server}/${ayahCode}.mp3`;
  };

  // تشغيل/إيقاف الصوت
  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        setError(null);
        
        audioRef.current.src = getAudioUrl();
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('خطأ في تشغيل الصوت:', err);
      setError('فشل تحميل الصوت');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  // معالجة الأحداث
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError('خطأ في تحميل الملف الصوتي');
      setIsPlaying(false);
      setIsLoading(false);
    };
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // تشغيل تلقائي
  useEffect(() => {
    if (autoPlay) {
      togglePlay();
    }
  }, [autoPlay]);

  // إعادة تحميل عند تغيير القارئ
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [selectedReciter]);

  return (
    <div className="flex items-center gap-2">
      {/* اختيار القارئ */}
      {showReciterSelect && (
        <select
          value={selectedReciter}
          onChange={(e) => setSelectedReciter(e.target.value)}
          className="px-3 py-2 border-2 border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          title="اختر القارئ"
        >
          {Object.entries(RECITERS).map(([key, reciter]) => (
            <option key={key} value={key}>
              {reciter.name}
            </option>
          ))}
        </select>
      )}

      {/* زر التشغيل */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`
          p-2 rounded-lg transition-all transform hover:scale-105
          ${isPlaying 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : ''}
        `}
        title={isPlaying ? 'إيقاف' : 'تشغيل'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* زر التحميل - تم تصحيح وسم <a> */}
      <a 
        href={getAudioUrl()}
        download={`${RECITERS[selectedReciter].name}_${surah}_${ayah}.mp3`}
        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
        title="تحميل الصوت"
      >
        <Download className="w-5 h-5" />
      </a>

      {/* عنصر الصوت المخفي */}
      <audio ref={audioRef} preload="none" />

      {/* رسالة الخطأ */}
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
};

export default QuranAudioPlayer;