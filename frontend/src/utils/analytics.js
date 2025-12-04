// frontend/src/utils/analytics.js

// ✅ التحقق من تحميل gtag.js
const isGAReady = () => {
  return typeof window !== 'undefined' && 
         typeof window.gtag !== 'undefined' && 
         typeof window.dataLayer !== 'undefined';
};

// ✅ تهيئة Google Analytics (الوظيفة الأصلية محفوظة)
export const initGA = () => {
  if (isGAReady()) {
    console.log('✅ Google Analytics جاهز للاستخدام');
    return true;
  } else {
    console.log('⏳ Google Analytics قيد التحميل...');
    
    // ✅ محاولة تحميل gtag إذا لم يكن محملاً
    if (typeof window !== 'undefined' && !window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-VYHKHT4HTS';
      document.head.appendChild(script);
      
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){window.dataLayer.push(arguments);};
      window.gtag('js', new Date());
      window.gtag('config', 'G-VYHKHT4HTS');
      
      console.log('✅ تم تحميل Google Analytics يدوياً');
    }
    
    return false;
  }
};

// ✅ تتبع عرض الصفحة (الوظيفة الأصلية محفوظة)
export const trackPageView = (path) => {
  if (isGAReady()) {
    try {
      window.gtag('config', 'G-VYHKHT4HTS', {
        page_path: path,
        page_title: document.title
      });
      console.log(`📊 تم تتبع الصفحة: ${path}`);
      return true;
    } catch (error) {
      console.warn('⚠️ خطأ في تتبع الصفحة:', error);
      return false;
    }
  } else {
    // ✅ تخزين مؤقت وإعادة المحاولة لاحقاً
    if (window.pendingGAPageViews) {
      window.pendingGAPageViews.push(path);
    } else {
      window.pendingGAPageViews = [path];
    }
    
    // ✅ محاولة التهيئة تلقائياً
    setTimeout(() => {
      initGA();
      if (window.pendingGAPageViews && window.pendingGAPageViews.length > 0) {
        window.pendingGAPageViews.forEach(pendingPath => {
          trackPageView(pendingPath);
        });
        window.pendingGAPageViews = [];
      }
    }, 2000);
    
    return false;
  }
};

// ✅ تتبع الأحداث المخصصة (الوظيفة الأصلية محفوظة)
export const trackEvent = (category, action, label = '', value = 0) => {
  if (isGAReady()) {
    try {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
      console.log(`📊 حدث: ${category} - ${action}${label ? ' - ' + label : ''}`);
      return true;
    } catch (error) {
      console.warn('⚠️ خطأ في تتبع الحدث:', error);
      return false;
    }
  } else {
    // ✅ تخزين الأحداث مؤقتاً
    if (window.pendingGAEvents) {
      window.pendingGAEvents.push({ category, action, label, value });
    } else {
      window.pendingGAEvents = [{ category, action, label, value }];
    }
    
    // ✅ محاولة إرسال الأحداث المعلقة بعد تحميل GA
    const checkInterval = setInterval(() => {
      if (isGAReady() && window.pendingGAEvents && window.pendingGAEvents.length > 0) {
        console.log(`🔄 جارٍ إرسال ${window.pendingGAEvents.length} حدث معلق...`);
        window.pendingGAEvents.forEach(event => {
          trackEvent(event.category, event.action, event.label, event.value);
        });
        window.pendingGAEvents = [];
        clearInterval(checkInterval);
      }
    }, 1000);
    
    // ✅ إيقاف المحاولة بعد 10 ثواني
    setTimeout(() => clearInterval(checkInterval), 10000);
    
    return false;
  }
};

// ✅ أحداث مخصصة للتطبيق (جميع الوظائف الأصلية محفوظة)
export const Analytics = {
  // البحث (محفوظة كما هي)
  search: (query, resultsCount) => {
    const safeQuery = query ? String(query).substring(0, 100) : '';
    trackEvent('Search', 'search_query', safeQuery, resultsCount || 0);
  },
  
  // المتشابهات (محفوظة كما هي)
  viewSimilarVerses: (verseId, similarCount) => {
    trackEvent('Similar', 'view_similar_verses', `verse_${verseId}`, similarCount || 0);
  },
  
  // Quiz (محفوظة كما هي)
  startQuiz: (quizType, scope) => {
    trackEvent('Quiz', 'quiz_started', `${quizType}_${scope}`);
  },
  
  completeQuiz: (quizType, score) => {
    trackEvent('Quiz', 'quiz_completed', quizType, score || 0);
  },
  
  // الإحصائيات (محفوظة كما هي)
  viewWordStats: (word) => {
    trackEvent('Stats', 'view_word_stats', word || 'general');
  },
  
  // الميزات (محفوظة كما هي)
  useFeature: (featureName) => {
    trackEvent('Feature', 'feature_used', featureName);
  },
  
  // ✅ وظائف جديدة محسنة (إضافية فقط، لا تغيير في القديم)
  
  // تتبع مفصل للبحث
  trackDetailedSearch: (query, resultsCount, searchType = 'text', duration = 0) => {
    // الوظيفة الأصلية باقية
    trackEvent('Search', 'search_query', query ? String(query).substring(0, 50) : '', resultsCount);
    
    // إضافة تفاصيل إضافية (اختياري)
    if (searchType === 'voice') {
      trackEvent('Search_Type', 'voice_search', `duration_${duration}ms`, resultsCount);
    }
  },
  
  // تتبع تفاعلات المستخدم
  trackUserInteraction: (elementType, elementName, action = 'click') => {
    trackEvent('User_Interaction', `${action}_${elementType}`, elementName);
  },
  
  // تتبع التحميلات
  trackDownload: (fileType, itemCount, source = 'unknown') => {
    trackEvent('Download', `download_${fileType}`, source, itemCount);
  },
  
  // ✅ اختبار النظام (للاستخدام الداخلي فقط)
  _test: () => {
    console.log('🧪 اختبار نظام التحليلات...');
    console.log('✅ gtag محمل:', isGAReady());
    console.log('📊 dataLayer:', window.dataLayer ? `موجود (${window.dataLayer.length} حدث)` : 'غير موجود');
    
    if (isGAReady()) {
      trackEvent('Analytics', 'system_test', 'Test from analytics module', 1);
      return true;
    }
    return false;
  }
};

// ✅ معالجة الأحداث المعلقة تلقائياً عند تحميل الصفحة
if (typeof window !== 'undefined') {
  // محاولة تهيئة GA عند تحميل الصفحة
  window.addEventListener('load', () => {
    setTimeout(() => {
      initGA();
      trackPageView(window.location.pathname);
      
      // إرسال حدث تحميل الصفحة
      trackEvent('App', 'page_loaded', window.location.href);
    }, 1000);
  });
}