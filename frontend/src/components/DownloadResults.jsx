import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function DownloadResults({ data, filename = 'results', type = 'search' }) {
  
  // ✅ دالة تحويل النص العربي إلى اسم ملف آمن
  const sanitizeFilename = (name) => {
    // قاموس للتحويل
    const translations = {
      'نتائج بحث': 'search_results',
      'نتائج البحث': 'search_results',
      'الآيات العشوائية': 'random_verses',
      'آيات عشوائية': 'random_verses',
      'المتشابهات': 'similarities',
      'القرآن الكريم': 'quran',
      'السورة': 'surah',
      'الجزء': 'juz'
    }
    
    // إزالة علامات خاصة وتنظيف
    let cleaned = name.trim()
      .replace(/[:\-،؛]/g, '_')
      .replace(/\s+/g, '_')
    
    // محاولة الترجمة الكاملة
    if (translations[cleaned]) {
      return translations[cleaned]
    }
    
    // محاولة الترجمة الجزئية
    for (const [arabic, english] of Object.entries(translations)) {
      if (cleaned.includes(arabic)) {
        cleaned = cleaned.replace(arabic, english)
      }
    }
    
    // إذا ما زال يحتوي على عربي، استخدم اسم عام
    const hasArabic = /[\u0600-\u06FF]/.test(cleaned)
    if (hasArabic) {
      const timestamp = new Date().toISOString().slice(0, 10)
      return `quran_verses_${timestamp}`
    }
    
    return cleaned
  }
  
  const fetchHighlightedComparison = async (verse1, verse2) => {
    try {
      const response = await axios.get(`${API_URL}/compare/${verse1.id}/${verse2.id}`)
      return response.data
    } catch (err) {
      console.error('خطأ في جلب المقارنة:', err)
      return null
    }
  }

  const normalizeData = (items) => {
    return items.map(item => {
      if (item.verse1 && item.verse2) {
        return [
          {
            surah: item.verse1.surah,
            ayah: item.verse1.ayah,
            surah_name: item.verse1.surah_name || '',
            text: item.verse1.text,
            juz: item.verse1.juz || '',
            similarity: `${item.score_percent || Math.round(item.similarity * 100)}%`,
            note: 'الآية الأولى',
            _verse1: item.verse1,
            _verse2: item.verse2,
            _similarity: item.similarity
          },
          {
            surah: item.verse2.surah,
            ayah: item.verse2.ayah,
            surah_name: item.verse2.surah_name || '',
            text: item.verse2.text,
            juz: item.verse2.juz || '',
            similarity: `${item.score_percent || Math.round(item.similarity * 100)}%`,
            note: 'الآية الثانية',
            _isSecondVerse: true
          }
        ]
      }
      
      if (item.verse && item.count) {
        return {
          surah: item.verse.surah,
          ayah: item.verse.ayah,
          surah_name: item.verse.surah_name || '',
          text: item.verse.text,
          juz: item.verse.juz || '',
          count: item.count,
          note: `تكرر ${item.count} مرة`
        }
      }
      
      return {
        surah: item.surah || item.surah_number || '',
        ayah: item.ayah || item.ayah_number || item.verse_number || '',
        surah_name: item.surah_name || item.sura_name || '',
        text: item.text || item.verse_text || item.ayah_text || '',
        juz: item.juz || item.juz_number || '',
        similarity: item.similarity || ''
      }
    }).flat()
  }

  const downloadPDF = async () => {
    try {
      const loadingDiv = document.createElement('div')
      loadingDiv.id = 'pdf-loading-overlay'
      loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px 50px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        text-align: center;
      `
      loadingDiv.innerHTML = `
        <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px;">
          ⏳ جاري إنشاء PDF...
        </div>
        <div style="font-size: 16px; color: #6b7280;">
          يرجى الانتظار
        </div>
      `
      document.body.appendChild(loadingDiv)

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const normalizedData = normalizeData(data)
      
      // جلب الفروقات الملونة
      const comparisonPromises = []
      for (let i = 0; i < normalizedData.length; i += 2) {
        const item = normalizedData[i]
        if (item._verse1 && item._verse2 && !normalizedData[i]._highlightedData) {
          comparisonPromises.push(
            fetchHighlightedComparison(item._verse1, item._verse2).then(result => {
              if (result) {
                normalizedData[i]._highlightedData = result
              }
            })
          )
        }
      }
      
      if (comparisonPromises.length > 0) {
        loadingDiv.innerHTML = `
          <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px;">
            ⏳ جاري تحليل الفروقات...
          </div>
          <div style="font-size: 16px; color: #6b7280;">
            ${comparisonPromises.length} مقارنة
          </div>
        `
        await Promise.all(comparisonPromises)
      }

      // ✅ فك التشفير من اسم الملف للعرض (العنوان العربي في PDF)
      const displayTitle = filename
        .replace(/_/g, ' ')
        .replace(/\+/g, ' ')
      
      // ✅ تحويل اسم الملف إلى إنجليزي آمن
      const safeFilename = sanitizeFilename(filename)
      
      loadingDiv.innerHTML = `
        <div style="font-size: 24px; font-weight: bold; color: #667eea; margin-bottom: 10px;">
          📄 جاري إنشاء الصفحات...
        </div>
      `

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let isFirstPage = true
      const pageHeight = 297 // A4 height in mm
      const pageWidth = 210 // A4 width in mm
      const margin = 15
      const contentWidth = pageWidth - (2 * margin)
      let currentY = margin

      // ✅ رندر النص الملون
      const renderHighlightedText = (highlightedText, isFirstVerse) => {
        if (!highlightedText || !Array.isArray(highlightedText)) return ''
        const color = isFirstVerse ? '#fef08a' : '#86efac'
        return highlightedText.map(item => {
          const bgColor = item.type === 'diff' ? color : 'transparent'
          return `<span style="background-color: ${bgColor}; padding: 2px 0;">${item.text} </span>`
        }).join('')
      }

      // ✅ دالة لإضافة صفحة جديدة
      const addNewPage = () => {
        pdf.addPage()
        currentY = margin
        isFirstPage = false
      }

      // ✅ دالة لإضافة محتوى بدون تقسيم
      const addContent = async (htmlContent, minHeight = 60) => {
        const tempDiv = document.createElement('div')
        tempDiv.style.cssText = `
          position: absolute;
          left: -9999px;
          top: 0;
          width: ${contentWidth * 3.78}px;
          padding: 0;
          background: white;
          font-family: 'Amiri', 'Traditional Arabic', 'Arial', serif;
          direction: rtl;
          text-align: right;
        `
        tempDiv.innerHTML = htmlContent
        document.body.appendChild(tempDiv)

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        })

        document.body.removeChild(tempDiv)

        const imgData = canvas.toDataURL('image/png')
        const imgHeight = (canvas.height * contentWidth) / canvas.width

        // ✅ إذا لا يوجد مساحة كافية، انتقل لصفحة جديدة
        if (currentY + imgHeight > pageHeight - margin) {
          addNewPage()
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight)
        currentY += imgHeight + 5 // مسافة صغيرة بين العناصر
      }

      // ✅ العنوان (بالعربي داخل PDF)
      await addContent(`
        <div style="margin-bottom: 20px; border-bottom: 3px solid #667eea; padding-bottom: 15px;">
          <h1 style="font-size: 28px; color: #667eea; margin: 0; font-family: 'Amiri', serif;">
            📄 ${displayTitle}
          </h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px; font-family: 'Amiri', serif;">
            عدد النتائج: ${normalizedData.length} آية
          </p>
        </div>
      `)

      // ✅ الآيات - كل آية في وحدة واحدة
      for (let index = 0; index < normalizedData.length; index++) {
        const item = normalizedData[index]

        // حالة التشابهات
        if (item._verse1 && item._verse2 && item._highlightedData) {
          const hData = item._highlightedData
          const verse1Highlighted = renderHighlightedText(hData.highlighted1, true)
          const verse2Highlighted = renderHighlightedText(hData.highlighted2, false)
          const nextItem = normalizedData[index + 1]
          
          await addContent(`
            <div style="margin-bottom: 25px; padding: 20px; background: #f9fafb; border-radius: 12px; border: 2px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <span style="font-size: 18px; font-weight: bold; color: #667eea; background: #eef2ff; padding: 8px 16px; border-radius: 8px; font-family: 'Amiri', serif;">
                  نسبة التشابه: ${Math.round(item._similarity * 100)}%
                </span>
              </div>
              
              <div style="margin-bottom: 15px; padding: 15px; background: #fffbeb; border-radius: 10px; border: 2px solid #fbbf24;">
                <div style="margin-bottom: 8px; font-weight: bold; color: #92400e; font-size: 14px; font-family: 'Amiri', serif;">
                  📖 ${item.surah_name || 'سورة ' + item.surah} (${item.surah}:${item.ayah})
                </div>
                <div style="font-size: 18px; line-height: 2; color: #1f2937; background: white; padding: 12px; border-radius: 8px; font-family: 'Amiri', serif;">
                  ${verse1Highlighted}
                </div>
              </div>
              
              <div style="padding: 15px; background: #ecfdf5; border-radius: 10px; border: 2px solid #10b981;">
                <div style="margin-bottom: 8px; font-weight: bold; color: #065f46; font-size: 14px; font-family: 'Amiri', serif;">
                  🔗 ${nextItem.surah_name} (${nextItem.surah}:${nextItem.ayah})
                </div>
                <div style="font-size: 18px; line-height: 2; color: #1f2937; background: white; padding: 12px; border-radius: 8px; font-family: 'Amiri', serif;">
                  ${verse2Highlighted}
                </div>
              </div>
            </div>
          `, 120)
          
          index++ // تخطي الآية الثانية
          continue
        }

        // تخطي الآية الثانية
        if (item._isSecondVerse) {
          continue
        }

        // حالة عادية
        const similarityText = item.similarity ? `<div style="margin-top: 8px; font-size: 13px; color: #6b7280; font-family: 'Amiri', serif;">نسبة التشابه: ${item.similarity}</div>` : ''
        const countText = item.count ? `<div style="margin-top: 8px; font-size: 13px; color: #f59e0b; font-weight: bold; font-family: 'Amiri', serif;">تكرر: ${item.count} مرة</div>` : ''
        const noteText = item.note ? `<div style="margin-top: 6px; font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 4px 8px; border-radius: 6px; display: inline-block; font-family: 'Amiri', serif;">${item.note}</div>` : ''
        
        await addContent(`
          <div style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 10px; border: 2px solid #e5e7eb;">
            <div style="font-weight: bold; color: #667eea; margin-bottom: 8px; font-size: 14px; font-family: 'Amiri', serif;">
              ${item.surah_name || 'سورة ' + item.surah} (${item.surah}:${item.ayah})
            </div>
            <div style="font-size: 18px; line-height: 2; color: #1f2937; font-family: 'Amiri', serif;">
              ${item.text}
            </div>
            ${similarityText}
            ${countText}
            ${noteText}
          </div>
        `, 50)
      }

      // Footer
      if (currentY + 20 > pageHeight - margin) {
        addNewPage()
      }
      
      await addContent(`
        <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 13px; font-family: 'Amiri', serif;">
          المصحف الذكي للمتشابهات
        </div>
      `)

      document.body.removeChild(loadingDiv)
      
      // ✅ حفظ الملف باسم إنجليزي آمن
      pdf.save(`${safeFilename}.pdf`)
      
      console.log(`✅ تم حفظ الملف: ${safeFilename}.pdf`)
      console.log(`📄 العنوان داخل PDF: ${displayTitle}`)
      
    } catch (error) {
      console.error('❌ خطأ في PDF:', error)
      alert('حدث خطأ في توليد PDF. يرجى المحاولة مرة أخرى.')
      const loadingDiv = document.getElementById('pdf-loading-overlay')
      if (loadingDiv) document.body.removeChild(loadingDiv)
    }
  }
  
  const downloadExcel = () => {
    try {
      const normalizedData = normalizeData(data)
      
      // ✅ تحويل اسم الملف إلى إنجليزي آمن
      const safeFilename = sanitizeFilename(filename)
      
      const worksheet = XLSX.utils.json_to_sheet(
        normalizedData.map(item => ({
          'رقم الآية': `${item.surah}:${item.ayah}`,
          'السورة': item.surah_name || '',
          'الجزء': item.juz || '',
          'النص': item.text,
          'التشابه': item.similarity || '',
          'التكرار': item.count || '',
          'ملاحظة': item.note || ''
        }))
      )
      
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'النتائج')
      
      // ✅ حفظ الملف باسم إنجليزي آمن
      XLSX.writeFile(workbook, `${safeFilename}.xlsx`)
      
      console.log(`✅ تم حفظ ملف Excel: ${safeFilename}.xlsx`)
      
    } catch (error) {
      console.error('❌ خطأ في Excel:', error)
      alert('حدث خطأ في توليد Excel.')
    }
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  const actualCount = normalizeData(data).length
  
  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
      justifyContent: 'center',
      flexWrap: 'wrap'
    }}>
      <button
        onClick={downloadPDF}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
      >
        <Download size={18} />
        تحميل PDF ({actualCount} آية)
      </button>
      
      <button
        onClick={downloadExcel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
      >
        <Download size={18} />
        تحميل Excel ({actualCount} آية)
      </button>
    </div>
  )
}