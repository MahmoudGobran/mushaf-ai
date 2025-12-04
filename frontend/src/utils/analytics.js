// frontend/src/utils/analytics.js
import ReactGA from 'react-ga4';

// ✅ ضع Measurement ID الخاص بك هنا
const MEASUREMENT_ID = 'G-VYHKHT4HTS'; // 🔴 غيّر هذا!

let isInitialized = false;

export const initGA = () => {
  if (!isInitialized && MEASUREMENT_ID !== 'G-VYHKHT4HTS') {
    ReactGA.initialize(MEASUREMENT_ID);
    isInitialized = true;
    console.log('✅ Google Analytics initialized');
  }
};

// تتبع الصفحات
export const trackPageView = (path) => {
  if (isInitialized) {
    ReactGA.send({ hitType: 'pageview', page: path });
    console.log(`📊 Page view: ${path}`);
  }
};

// تتبع الأحداث المخصصة
export const trackEvent = (category, action, label = '', value = 0) => {
  if (isInitialized) {
    ReactGA.event({
      category,
      action,
      label,
      value
    });
    console.log(`📊 Event: ${category} - ${action}`);
  }
};

// أحداث مخصصة للتطبيق
export const Analytics = {
  // البحث
  search: (query, resultsCount) => {
    trackEvent('Search', 'search_query', query, resultsCount);
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
  }
};