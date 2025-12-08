// src/pwa-injector.jsx
import React, { useEffect, useState } from 'react';

export function PWAInjector() {
  const [showButton, setShowButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    console.log('🔧 تهيئة PWA Injector...');
    
    // تحقق إذا كان على iOS
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(checkIOS);
    
    // تحقق إذا كان التطبيق مثبتاً بالفعل
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone || 
                    document.referrer.includes('android-app://'));

    // إذا كان مثبتاً بالفعل، لا تعرض الزر
    if (isStandalone) {
      console.log('✅ التطبيق مثبت بالفعل');
      return;
    }

    // استمع لحدث beforeinstallprompt (لأجهزة Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
      console.log('✅ PWA جاهز للتثبيت');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // استمع لحدث appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('🎉 تم تثبيت التطبيق بنجاح!');
      setShowButton(false);
    });

    // عرض الزر بعد 3 ثواني فقط للأجهزة غير iOS
    if (!checkIOS) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 3000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('👍 المستخدم وافق على التثبيت');
        } else {
          console.log('👎 المستخدم رفض التثبيت');
        }
        setDeferredPrompt(null);
      });
    } else if (isIOS) {
      alert('لتثبيت التطبيق على iOS:\n\n' +
            '1. اضغط على زر "مشاركة" (Share) 📤\n' +
            '2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية"\n' +
            '3. اضغط على "إضافة" في الأعلى');
    } else {
      alert('لتثبيت التطبيق:\n\n' +
            '1. ابحث عن أيقونة 📱 في شريط العنوان\n' +
            '2. أو اضغط على ⋮ (القائمة)\n' +
            '3. اختر "تثبيت التطبيق"');
    }
  };

  if (!showButton || isStandalone) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="pwa-install-btn"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '25px',
        border: 'none',
        cursor: 'pointer',
        zIndex: 10000,
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        transition: 'all 0.3s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
      }}
    >
      📱 {isIOS ? 'أضف إلى الشاشة الرئيسية' : 'تثبيت التطبيق'}
    </button>
  );
}