import React, { useState, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';

// التأكد من دعم المتصفح لـ Web Speech API
const SpeechRecognition = 
  window.SpeechRecognition || window.webkitSpeechRecognition;

// 1. استبدال تعريف المكون (السطر 9 تقريباً)
const VoiceSearch = ({ onTranscript, onStartSearch }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(!!SpeechRecognition);
  const [error, setError] = useState(null);
  
  // تهيئة كائن التعرف على الكلام مرة واحدة
  useEffect(() => {
    if (!isSupported) {
      setError("❌ البحث الصوتي غير مدعوم في متصفحك. استخدم Chrome أو Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ar-SA';

    // 2. استبدال محتوى الدالة recognition.onresult (السطر 30 تقريباً)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('🗣️ تم التعرف على:', transcript);
      setIsListening(false);
      setError(null);
      
      // تنظيف النص الصوتي
      const cleanedTranscript = transcript.replace(/[.,]/g, '').trim();
      
      // ✅ إرسال النص المعترف به إلى المكون الأب
      onTranscript(cleanedTranscript); 
      // ✅ التعديل: تشغيل البحث بعد اكتمال النطق
      onStartSearch(cleanedTranscript); 
    };

    // عند انتهاء عملية التعرف (سواء بنجاح أو فشل)
    recognition.onend = () => {
      setIsListening(false);
      console.log('⏹️ انتهت عملية الاستماع.');
    };

    // عند حدوث خطأ
    recognition.onerror = (event) => {
      console.error('❌ خطأ في التعرف الصوتي:', event.error);
      setIsListening(false);
      
      let errorMsg;
      switch (event.error) {
        case 'not-allowed':
          errorMsg = '🔒 لم يتم السماح باستخدام الميكروفون. يرجى مراجعة إعدادات متصفحك.';
          break;
        case 'no-speech':
          errorMsg = '🎙️ لم يتم اكتشاف صوت. حاول مرة أخرى.';
          break;
        case 'network':
          errorMsg = '🌐 خطأ في الاتصال بالشبكة (يحدث عادةً بسبب عدم السماح).';
          break;
        default:
          errorMsg = `🚫 حدث خطأ غير معروف: ${event.error}`;
      }
      alert(errorMsg); 
      setError(errorMsg);
    };

    // حفظ كائن recognition في الـ window لتنظيفه عند الحاجة
    window.quranRecognition = recognition;

    // تنظيف عند إزالة المكون
    return () => {
      if (window.quranRecognition) {
        window.quranRecognition.stop();
        delete window.quranRecognition;
      }
    };
  }, [onTranscript, onStartSearch, isSupported]);
  
  // دالة بدء/إيقاف الاستماع
  const toggleListening = () => {
    if (!isSupported) {
      alert(error);
      return;
    }

    if (isListening) {
      // إيقاف التعرف الصوتي إذا كان يعمل
      if (window.quranRecognition) {
        window.quranRecognition.stop();
        setIsListening(false);
      }
    } else {
      // بدء التعرف الصوتي
      setError(null);
      try {
        if (window.quranRecognition) {
           window.quranRecognition.start();
           setIsListening(true);
           console.log('🎤 بدأ الاستماع...');
        }
      } catch (err) {
        console.warn('⚠️ محاولة بدء التعرف الصوتي وهو يعمل بالفعل:', err);
        setIsListening(true);
      }
    }
  };

  if (!isSupported) {
      return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '12px', 
            fontSize: '14px', 
            color: '#dc2626', 
            backgroundColor: '#fecaca', 
            borderRadius: '12px' 
          }}>
              {error}
          </div>
      );
  }

  return (
    <button
      onClick={toggleListening}
      type="button"
      disabled={isListening}
      style={{
        padding: '20px',
        borderRadius: '16px',
        transition: 'all 0.3s',
        transform: 'scale(1)',
        backgroundColor: isListening ? '#ef4444' : '#6366f1',
        color: 'white',
        border: 'none',
        cursor: isListening ? 'wait' : 'pointer',
        opacity: isListening ? 1 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '60px'
      }}
      onMouseEnter={(e) => !isListening && (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => !isListening && (e.currentTarget.style.transform = 'scale(1)')}
      title={isListening ? 'اضغط للإيقاف' : 'البحث الصوتي'}
    >
      {isListening ? (
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <Mic size={24} />
      )}
    </button>
  );
};

export default VoiceSearch;