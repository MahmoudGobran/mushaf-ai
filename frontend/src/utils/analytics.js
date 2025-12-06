// frontend/src/utils/analytics.js

// ✅ تحقق مما إذا كان gtag محملاً
const isGtagLoaded = () => {
  // التأكد من أن مكتبة جوجل أناليتكس مُحمَّلة
  return typeof window.gtag !== 'undefined' && typeof window.dataLayer !== 'undefined';
};

// ✅ تهيئة GA
export const initGA = () => {
  if (isGtagLoaded()) {
    console.log('✅ Google Analytics is ready via gtag.js');
    return true;
  } else {
    console.warn('⚠️ Google Analytics (gtag.js) not loaded. Check index.html');
    return false;
  }
};

// وظيفة مساعدة لمعالجة الإجراءات المؤجلة
const processPendingActions = () => {
  if (window.pendingGAActions) {
    window.pendingGAActions.forEach(action => {
      if (action.type === 'pageview') {
        trackPageView(action.path);
      } else if (action.type === 'event') {
        trackEvent(action.category, action.action, action.label, action.value);
      }
    });
    window.pendingGAActions = []; // مسح القائمة
  }
};

// ✅ تتبع عرض الصفحة
export const trackPageView = (path) => {
  if (isGtagLoaded()) {
    // يرجى استبدال 'G-VYHKHT4HTS' بمعرف تتبع GA4 الخاص بك
    window.gtag('config', 'G-VYHKHT4HTS', { 
      page_path: path,
      page_title: document.title
    });
    console.log(`📊 Page view tracked: ${path}`);
  } else {
    console.log(`📋 Page view queued (GA not ready): ${path}`);
    if (!window.pendingGAActions) window.pendingGAActions = [];
    window.pendingGAActions.push({ type: 'pageview', path });
  }
};

// ✅ تتبع الأحداث (الدالة الأصلية)
export const trackEvent = (category, action, label = '', value = 0) => {
  if (isGtagLoaded()) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
    console.log(`📊 Event tracked: ${category} - ${action} - ${label}`);
  } else {
    console.log(`📋 Event queued (GA not ready): ${category} - ${action}`);
    if (!window.pendingGAActions) window.pendingGAActions = [];
    window.pendingGAActions.push({ type: 'event', category, action, label, value });

    // تحقق بشكل دوري من تحميل gtag
    const checkGtagInterval = setInterval(() => {
      if (isGtagLoaded()) {
        clearInterval(checkGtagInterval);
        processPendingActions();
      }
    }, 1000);
    
    // توقف بعد 10 ثواني
    setTimeout(() => clearInterval(checkGtagInterval), 10000);
  }
};

// ✅ أحداث مخصصة للتطبيق
export const Analytics = {
  
  // 🛑 تم إعادة إضافة الدوال المفقودة لضمان استقرار App.jsx 🛑
  useFeature: (featureName) => {
    trackEvent('Feature', 'use', featureName);
  },
  
  test: () => {
    trackEvent('Test', 'test_call', 'initial_test');
  },
  // 🛑 نهاية الدوال المضافة 🛑


  // البحث
  search: (query, resultsCount) => {
    const safeQuery = query ? query.substring(0, 100) : '';
    trackEvent('Search', 'search_query', safeQuery, resultsCount);
  },
  
  // المتشابهات
  viewSimilarVerses: (verseId, similarCount) => {
    trackEvent('Similar', 'view_similar_verses', `verse_${verseId}`, similarCount);
  },
  
  // Quiz
  startQuiz: (quizType, scope) => {
    trackEvent('Quiz', 'quiz_started', `${quizType}_${scope}`);
  },
  
  completeQuiz: (quizType, score) => {
    trackEvent('Quiz', 'quiz_completed', quizType, score);
  },
  
  // الإحصائيات
  viewWordStats: (word) => {
    trackEvent('Stats', 'view_word_stats', word);
  },

  // 📝 التعليقات (التقييمات، الاقتراحات، البلاغات) - ✅ الجديد والمصحح
  submitFeedback: (type, data) => {
    // 1. تتبع الحدث الأساسي باستخدام الدالة الموجودة (للتوافق القديم)
    trackEvent('Feedback', `submit_${type}`, data.title || data.category || data.rating_value || 'N/A', data.rating_value || 0);

    // 2. إطلاق حدث GA4 منفصل بـ Parameters لبيانات منظمة
    if (isGtagLoaded()) {
      const eventParams = {
        feedback_type: type, // rating, suggestion, bug
        page_url: window.location.pathname,
        ...data // تمرير البيانات الإضافية
      };
      
      window.gtag('event', 'feedback_submitted', eventParams);
      console.log(`📊 GA4 Event: feedback_submitted`, eventParams);
    }
  },
};