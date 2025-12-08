import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',  // تأكد من وجود هذا
  plugins: [
    react(),
    
    // ✅ PWA Plugin - النظام الآلي المحسّن
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'manifest.webmanifest',
        'icon-192x192.png',
        'icon-512x512.png',
        'icon-maskable-192x192.png',
        'icon-maskable-512x512.png',
        'robots.txt', 
        'vite.svg',
        'icons/*.png',
        'icons/*.jpg',
        'fonts/*.woff2',
        'fonts/*.ttf'
      ],
      
      // ✅ Manifest - معلومات التطبيق (من ملفك)
      manifest: {
        name: 'المصحف الذكي للمتشابهات القرآنية',
        id: '/',  // ← أضف هذا السطر هنا
        start_url: '/?source=pwa',  // ← أضف هذا السطر
        short_name: 'المصحف الذكي',
        description: 'تطبيق ذكي لاستكشاف القرآن الكريم بميزات البحث المتقدم والمتشابهات والاختبارات',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'ar',
        dir: 'rtl',
        categories: ['education', 'books', 'reference'],
        
        // ✅ الأيقونات (ستنشئها في الخطوة التالية)
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        
        screenshots: [
          {
            src: '/screenshots/home.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'الصفحة الرئيسية'
          },
          {
            src: '/screenshots/search.png', 
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'بحث الآيات'
          }
        ],

        // ✅ Shortcuts (من ملفك)
        shortcuts: [
          {
            name: 'بحث نصي',
            short_name: 'بحث',
            description: 'البحث في القرآن الكريم',
            url: '/?action=search',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'المتشابهات',
            short_name: 'متشابهات',
            description: 'استكشاف الآيات المتشابهة',
            url: '/?action=similar',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'اختبار',
            short_name: 'اختبار',
            description: 'اختبر معرفتك بالقرآن',
            url: '/?action=quiz',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      
      // ✅ Workbox - استراتيجيات التخزين المؤقت المدمجة
      workbox: {
        // ⚡ حجم التخزين المؤقت (من ملفك)
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
        
        // ⚡ استراتيجيات الـ Cache المتقدمة (مدمجة)
        runtimeCaching: [
          // ==================== 1. القرآن الكريم API (الأولوية القصوى) ====================
          {
            urlPattern: ({ url }) => {
              // كل API القرآنية (من ملفي - أكثر تحديداً)
              return url.pathname.match(/\/api\/(search|similar|verse|verses|stats|quiz)/)
            },
            handler: 'NetworkFirst', // ⭐ الأولوية للشبكة لضمان التحديث
            options: {
              cacheName: 'quran-api-priority-cache',
              networkTimeoutSeconds: 5, // ⏱️ أقل من ملفك لسرعة الاستجابة
              expiration: {
                maxEntries: 200, // 📊 زيادة السعة
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 أيام (أكثر منطقية للقرآن)
              },
              cacheableResponse: {
                statuses: [0, 200] // ✅ من ملفك (ممتاز)
              }
            }
          },
          
          // ==================== 2. API العامة (من ملفك - محسّن) ====================
          {
            urlPattern: ({ url }) => {
              // كل API الأخرى (بما فيها mushaf-ai-backend)
              return url.pathname.startsWith('/api/') || 
                     url.hostname.includes('mushaf-ai-backend') ||
                     url.pathname.includes('/feedback/') ||
                     url.pathname.includes('/rating/')
            },
            handler: 'StaleWhileRevalidate', // 🔄 تحديث خلفي
            options: {
              cacheName: 'general-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 أيام فقط (تغييرات متكررة)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          
          // ==================== 3. Google Fonts (من ملفك - ممتاز) ====================
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // سنة
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          
          // ==================== 4. Static Assets (مدمج) ====================
          {
            urlPattern: /\.(?:js|css|html|json|woff2?|ttf)$/,
            handler: 'StaleWhileRevalidate', // من ملفك (أفضل من CacheFirst)
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100, // زيادة السعة
                maxAgeSeconds: 60 * 60 * 24 * 30 // شهر
              }
            }
          },
          
          // ==================== 5. Images (مدمج مع webp) ====================
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100, // زيادة السعة للصور
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          
          // ==================== 6. GA & Analytics (جديد) ====================
          {
            urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-analytics-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 // يوم واحد فقط
              }
            }
          }
        ],
        
        // ⚡ إضافة globPatterns (من ملفي)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,json}'],
        
        globDirectory: 'dist',
        globIgnores: ['**/node_modules/**/*'],


        // ⚡ إضافة navigationPreload (جديد - تسريع التنقل)
        navigationPreload: true,
        
        // ⚡ إضافة cleanupOutdatedCaches (جديد)
        cleanupOutdatedCaches: true,
        
        // ⚡ إضافة skipWaiting (جديد - تحديث أسرع)
        skipWaiting: true,
        
        // ⚡ إضافة clientsClaim (جديد)
        clientsClaim: true
      },
      
      // ✅ إعدادات Dev (من ملفك - ممتاز)
      devOptions: {
        enabled: false, // تعطيل في Development (لتسريع التطوير)
        type: 'module' // ⭐ إضافة مهمة
      },
      
      // ✅ إضافة scope (جديد)
      scope: '/',
      
      // ✅ إضافة strategies (جديد)
      strategies: 'generateSW', // ⭐ هذا هو الإعداد الصحيحم
      
      // ✅ إضافة manifestFilename (جديد)
      manifestFilename: 'manifest.webmanifest',
      
      // ✅ إضافة injectRegister (جديد)
      injectRegister: 'auto'
    })
  ],
  
  // ⚡ إضافة إعدادات البناء المحسّنة (من ملفي)
  build: {
    // زيادة الحد للتحذيرات
    chunkSizeWarningLimit: 1500,
    
    // 🔥 تقسيم الكود إلى chunks منطقية
    rollupOptions: {
      output: {
        manualChunks(id) {
          // القرآن الكريم (أكبر وأهم)
          if (id.includes('Quran') || id.includes('Verse') || id.includes('Similarities')) {
            return 'quran-core'
          }
          
          // React
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          
          // UI Components
          if (id.includes('node_modules/lucide-react') || id.includes('components/')) {
            return 'ui-components'
          }
          
          // Utilities
          if (id.includes('node_modules/axios') || 
              id.includes('node_modules/uuid') || 
              id.includes('node_modules/html2canvas')) {
            return 'utilities'
          }
          
          // Analytics & PWA
          if (id.includes('analytics') || id.includes('pwa') || id.includes('workbox')) {
            return 'analytics-pwa'
          }
        },
        
        // تسمية الملفات بشكل منطقي
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // ⚡ Minification محسن
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // إزالة console.log في production
        drop_debugger: true
      }
    },
    
    // 📦 تقارير Bundle
    reportCompressedSize: true,
    
    // 🔍 Source maps (للتطوير فقط)
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  
  // ⚡ إضافة إعدادات الخادم (جديد)
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: true // افتح المتصفح تلقائياً
  },
  
  // ⚡ إضافة إعدادات Preview (جديد)
  preview: {
    host: true,
    port: 4173,
    strictPort: true
  },
  
  // ⚡ إضافة resolve (جديد)
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@assets': '/public'
    }
  },
  
  // ⚡ إضافة css (جديد)
  css: {
    devSourcemap: true // sourcemaps للـ CSS
  }
})