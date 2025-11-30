export default function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage,
  onPageChange 
}) {
  const maxPagesToShow = 7
  
  const getPageNumbers = () => {
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    const pages = []
    const leftSide = Math.max(currentPage - 2, 1)
    const rightSide = Math.min(currentPage + 2, totalPages)
    
    if (leftSide > 1) {
      pages.push(1)
      if (leftSide > 2) pages.push('...')
    }
    
    for (let i = leftSide; i <= rightSide; i++) {
      pages.push(i)
    }
    
    if (rightSide < totalPages) {
      if (rightSide < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    
    return pages
  }
  
  const pages = getPageNumbers()
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
      padding: '20px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      marginTop: '20px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#6b7280',
        fontWeight: '600'
      }}>
        عرض {startItem} - {endItem} من أصل {totalItems} نتيجة
      </div>
      
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '10px 20px',
            backgroundColor: currentPage === 1 ? '#e5e7eb' : '#667eea',
            color: currentPage === 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          ← السابق
        </button>
        
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span 
                key={`ellipsis-${index}`}
                style={{
                  padding: '10px',
                  color: '#9ca3af',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                ...
              </span>
            )
          }
          
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: '10px 16px',
                backgroundColor: page === currentPage ? '#667eea' : 'white',
                color: page === currentPage ? 'white' : '#374151',
                border: page === currentPage ? 'none' : '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                minWidth: '45px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (page !== currentPage) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }
              }}
              onMouseLeave={(e) => {
                if (page !== currentPage) {
                  e.currentTarget.style.backgroundColor = 'white'
                }
              }}
            >
              {page}
            </button>
          )
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '10px 20px',
            backgroundColor: currentPage === totalPages ? '#e5e7eb' : '#667eea',
            color: currentPage === totalPages ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          التالي →
        </button>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <span>الذهاب إلى صفحة:</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value)
            if (page >= 1 && page <= totalPages) {
              onPageChange(page)
            }
          }}
          style={{
            width: '60px',
            padding: '8px',
            border: '2px solid #d1d5db',
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        />
      </div>
    </div>
  )
}