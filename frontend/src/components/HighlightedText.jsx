import { normalizeSearchQuery } from '../utils/textNormalizer'

export default function HighlightedText({ text, searchQuery }) {
  if (!searchQuery || !searchQuery.trim()) {
    return <span>{text}</span>
  }

  const normalizedQuery = normalizeSearchQuery(searchQuery)
  const normalizedText = normalizeSearchQuery(text)
  
  const matchIndex = normalizedText.indexOf(normalizedQuery)
  
  if (matchIndex === -1) {
    return <span>{text}</span>
  }

  // حساب الموقع الفعلي في النص الأصلي
  let originalStartIndex = 0
  let normalizedCount = 0
  
  for (let i = 0; i < text.length; i++) {
    if (normalizedCount === matchIndex) {
      originalStartIndex = i
      break
    }
    
    const char = text[i]
    const normalizedChar = normalizeSearchQuery(char)
    
    if (normalizedChar) {
      normalizedCount++
    }
  }
  
  // حساب نهاية التطابق
  let originalEndIndex = originalStartIndex
  let matchedLength = 0
  
  for (let i = originalStartIndex; i < text.length; i++) {
    const char = text[i]
    const normalizedChar = normalizeSearchQuery(char)
    
    if (normalizedChar) {
      matchedLength++
    }
    
    if (matchedLength === normalizedQuery.length) {
      originalEndIndex = i + 1
      break
    }
  }

  const before = text.substring(0, originalStartIndex)
  const matched = text.substring(originalStartIndex, originalEndIndex)
  const after = text.substring(originalEndIndex)

  return (
    <span>
      {before}
      <span style={{
        backgroundColor: '#fef08a',
        color: '#854d0e',
        fontWeight: 'bold',
        padding: '2px 4px',
        borderRadius: '4px',
        boxShadow: '0 0 0 2px #fbbf24'
      }}>
        {matched}
      </span>
      {after}
    </span>
  )
}