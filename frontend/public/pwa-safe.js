// ============================================
// ملف PWA آمن 100% - لا يلمس النظام الحالي
// ============================================

console.log('🔒 بدء PWA الآمن...');

// 1. تحقق إذا كان التطبيق مثبتاً أصلاً
function checkIfAlreadyInstalled() {
  var isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  if (isInstalled) {
    console.log('📱 التطبيق مثبت بالفعل - لن أضيف زر');
    return true;
  }
  return false;
}

// 2. أنشئ زر بسيط جداً
function createSimpleButton() {
  // إذا كان الزر موجوداً أو التطبيق مثبتاً، توقف
  if (document.getElementById('safe-pwa-button') || checkIfAlreadyInstalled()) {
    return;
  }
  
  console.log('🎨 إنشاء زر بسيط...');
  
  // أنشئ الزر
  var button = document.createElement('button');
  button.id = 'safe-pwa-button';
  button.innerHTML = '📱 تثبيت';
  
  // تصميم بسيط وغير مزعج
  button.style.cssText = `
    /* الموقع */
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 9999;
    
    /* المظهر */
    background: #4CAF50;  /* أخضر - لطيف */
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    border: none;
    
    /* الخط */
    font-size: 14px;
    font-weight: bold;
    font-family: Arial, sans-serif;
    
    /* الظل */
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    
    /* التأثيرات */
    cursor: pointer;
    transition: all 0.3s;
    
    /* البدء مخفياً */
    opacity: 0;
    transform: translateY(-10px);
  `;
  
  // 3. ماذا يحدث عند النقر؟
  button.onclick = function() {
    console.log('🖱️ تم النقر على زر PWA الآمن');
    
    // رسالة بسيطة وواضحة
    var message = '📱 **كيفية تثبيت التطبيق:**\n\n' +
                  '1. انظر لأعلى اليمين في المتصفح\n' +
                  '2. ابحث عن أيقونة 📱 صغيرة\n' +
                  '3. اضغط عليها\n' +
                  '4. اختر "تثبيت التطبيق"\n\n' +
                  '💡 **بديل:**\n' +
                  '• اضغط على النقاط الثلاث ⋮\n' +
                  '• ابحث عن "تثبيت التطبيق"\n\n' +
                  '✅ **ملاحظة:**\n' +
                  'هذا لا يؤثر على التطبيق الحالي\n' +
                  'يمكنك إزالته بأي وقت';
    
    alert(message);
  };
  
  // 4. أضف الزر للصفحة
  document.body.appendChild(button);
  
  // 5. أظهر الزر ببطء (بعد 3 ثواني)
  setTimeout(function() {
    button.style.opacity = '1';
    button.style.transform = 'translateY(0)';
    console.log('✅ الزر معروض الآن');
  }, 3000);
  
  // 6. أضف تأثير عند المرور بالفأرة
  button.addEventListener('mouseover', function() {
    this.style.transform = 'scale(1.05)';
    this.style.boxShadow = '0 4px 10px rgba(76, 175, 80, 0.3)';
  });
  
  button.addEventListener('mouseout', function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  });
}

// 7. ابدأ عندما تصبح الصفحة جاهزة
window.addEventListener('load', function() {
  console.log('🌐 الصفحة جاهزة - بدء PWA الآمن');
  
  // انتظر 2 ثانية ثم أنشئ الزر
  setTimeout(createSimpleButton, 2000);
  
  // إذا ظهرت نافذة التثبيت التلقائي، احفظها
  window.addEventListener('beforeinstallprompt', function(e) {
    console.log('🎉 نافذة التثبيت التلقائي ظهرت!');
    e.preventDefault();
    
    // احفظها لاستخدامها لاحقاً
    window.safeInstallPrompt = e;
    
    // غيّر الزر ليعمل تلقائياً
    var button = document.getElementById('safe-pwa-button');
    if (button) {
      button.innerHTML = '📱 تثبيت (تلقائي)';
      button.style.background = '#2196F3'; // أزرق
      button.onclick = function() {
        if (window.safeInstallPrompt) {
          window.safeInstallPrompt.prompt();
        }
      };
    }
  });
});

console.log('🔧 PWA الآمن جاهز للتشغيل');