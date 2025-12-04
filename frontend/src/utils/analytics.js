// frontend/src/utils/analytics.js

// ✅ تحقق مما إذا كان gtag محملاً
const isGtagLoaded = () => {
  return typeof window.gtag !== 'undefined' && typeof window.dataLayer !== 'undefined';
};

// ✅ تهيئة GA (لا نحتاج فعلًا لشيء لأنه محمل في index.html)
export const initGA = () => {
  if (isGtagLoaded()) {
    console.log('✅ Google Analytics is ready via gtag.js');
    return true;
  } else {
    console.warn('⚠️ Google Analytics (gtag.js) not loaded. Check index.html');
    return false;
  }
};

// ✅ تتبع عرض الصفحة
export const trackPageView = (path) => {
  if (isGtagLoaded()) {
    window.gtag('config', 'G-VYHKHT4HTS', {
      page_path: path,
      page_title: document.title
    });
    console.log(`📊 Page view tracked: ${path}`);
  } else {
    console.log(`📋 Page view queued (GA not ready): ${path}`);
    // تخزين مؤقت إذا احتجنا
    if (!window.pendingGAActions) window.pendingGAActions = [];
    window.pendingGAActions.push({ type: 'pageview', path });
  }
};

// ✅ تتبع الأحداث
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
    window.pendingGAActions.push({ 
      type: 'event', 
      category, 
      action, 
      label, 
      value 
    });
  }
};

// ✅ معالجة الأحداث المعلقة عند تحميل GA
const processPendingActions = () => {
  if (window.pendingGAActions && window.pendingGAActions.length > 0) {
    console.log(`🔄 Processing ${window.pendingGAActions.length} pending GA actions`);
    window.pendingGAActions.forEach(action => {
      if (action.type === 'pageview') {
        trackPageView(action.path);
      } else if (action.type === 'event') {
        trackEvent(action.category, action.action, action.label, action.value);
      }
    });
    window.pendingGAActions = [];
  }
};

// ✅ استمع لتحميل gtag
if (typeof window !== 'undefined') {
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

// ✅ أحداث مخصصة للتطبيق
export const Analytics = {
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
  
  // الميزات
  useFeature: (featureName) => {
    trackEvent('Feature', 'feature_used', featureName);
  },
  
  // اختبار GA
  test: () => {
    console.log('🧪 Testing GA integration...');
    console.log('gtag loaded?', isGtagLoaded());
    console.log('dataLayer:', window.dataLayer);
    
    if (isGtagLoaded()) {
      trackEvent('Test', 'analytics_test', 'Testing GA4 integration', 1);
      return true;
    }
    return false;
  }
};