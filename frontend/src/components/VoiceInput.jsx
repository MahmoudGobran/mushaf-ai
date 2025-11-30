// ملف: mushaf-ai/frontend/src/components/VoiceInput.jsx
// مكون الإدخال الصوتي للاختبارات - يستخدم في QuizGame.jsx

import React, { useState, useEffect } from 'react';

const VoiceInput = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // التحقق من دعم المتصفح
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // إنشاء مثيل التعرف على الصوت
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'ar-SA';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

    recognitionInstance.onresult = (event) => {
      const text = event.results[0][0].transcript;
      console.log('🎤 تم التعرف على:', text);
      onTranscript(text);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionInstance.onerror = (event) => {
      console.error('❌ خطأ:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        alert('⚠️ يجب السماح بالوصول للميكروفون من إعدادات المتصفح.');
      } else if (event.error === 'no-speech') {
        alert('⚠️ لم يتم اكتشاف صوت. حاول مرة أخرى.');
      }
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognition || disabled) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.warn('⚠️ خطأ في بدء التسجيل:', err);
      }
    }
  };

  if (!isSupported) {
    return (
      <div style={{ 
        fontSize: '12px', 
        color: '#ef4444', 
        textAlign: 'center',
        padding: '8px',
        backgroundColor: '#fee2e2',
        borderRadius: '8px'
      }}>
        ⚠️ متصفحك لا يدعم الميكروفون
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s',
        background: isListening 
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        opacity: disabled ? 0.5 : 1,
        animation: isListening ? 'pulse 1.5s infinite' : 'none'
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {isListening ? '🔴' : '🎤'}
      </span>
      <span>{isListening ? 'استمع...' : 'ميكروفون'}</span>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </button>
  );
};

export default VoiceInput;