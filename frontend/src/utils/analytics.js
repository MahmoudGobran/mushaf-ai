// frontend/src/utils/analytics.js
import ReactGA from 'react-ga4';

// ✅ ضع Measurement ID الخاص بك هنا
const MEASUREMENT_ID = 'G-VYHKHT4HTS';

let isInitialized = false;
let pendingPageViews = [];
let pendingEvents = [];

const initializeGA = () => {
  if (isInitialized || !MEASUREMENT_ID) return false;
  
  try {
    console.log('🚀 Initializing Google Analytics with ID:', MEASUREMENT_ID);
    
    ReactGA.initialize(MEASUREMENT_ID, {
      // ✅ إعدادات مهمة لتطبيقات SPA
      gaOptions: {
        siteSpeedSampleRate: 100
      }
    });
    
    isInitialized = true;
    console.log('✅ Google Analytics initialized successfully');
    
    // ✅ معالجة الأحداث المعلقة
    pendingPageViews.forEach(view => trackPageView(view));
    pendingEvents.forEach(event => trackEvent(event.category, event.action, event.label, event.value));
    
    pendingPageViews = [];
    pendingEvents = [];
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Google Analytics:', error);
    return false;
  }
};

export const initGA = () => {
  // ✅ تأخير التهيئة قليلاً لضمان تحميل الصفحة
  setTimeout(() => {
    initializeGA();
  }, 500);
};

// تتبع الصفحات
export const trackPageView = (path) => {
  if (!isInitialized) {
    console.log('📋 Queueing page view (GA not initialized):', path);
    pendingPageViews.push(path);
    return;
  }
  
  try {
    ReactGA.send({ 
      hitType: 'pageview', 
      page: path,
      title: document.title
    });
    console.log(`📊 Page view tracked: ${path}`);
  } catch (error) {
    console.error('❌ Failed to track page view:', error);
  }
};

// تتبع الأحداث المخصصة
export const trackEvent = (category, action, label = '', value = 0) => {
  if (!isInitialized) {
    console.log('📋 Queueing event (GA not initialized):', { category, action });
    pendingEvents.push({ category, action, label, value });
    return;
  }
  
  try {
    ReactGA.event({
      category,
      action,
      label,
      value
    });
    console.log(`📊 Event tracked: ${category} - ${action}`);
  } catch (error) {
    console.error('❌ Failed to track event:', error);
  }
};

// أحداث مخصصة للتطبيق
export const Analytics = {
  // البحث
  search: (query, resultsCount) => {
    trackEvent('Search', 'search_query', query.substring(0, 100), resultsCount);
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
  
  // وظيفة مساعدة للتحقق من الحالة
  isInitialized: () => isInitialized
};