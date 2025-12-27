/**
 * Print utility that uses an iframe instead of opening a new tab
 * This prevents focus issues when the print dialog is cancelled
 */
export const printWithIframe = (htmlContent: string): void => {
  // Remove any existing print iframe
  const existingIframe = document.getElementById('print-iframe')
  if (existingIframe) {
    existingIframe.remove()
  }

  // Create a hidden iframe
  const iframe = document.createElement('iframe')
  iframe.id = 'print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.visibility = 'hidden'
  
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) {
    console.error('Failed to access iframe document')
    iframe.remove()
    return
  }

  // Write content to iframe
  iframeDoc.open()
  iframeDoc.write(htmlContent)
  iframeDoc.close()

  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (e) {
        console.error('Print failed:', e)
      }
      // Remove iframe after a delay to ensure print dialog has appeared
      setTimeout(() => {
        iframe.remove()
      }, 1000)
    }, 250)
  }
}
