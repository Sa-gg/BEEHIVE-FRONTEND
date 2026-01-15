import { useState } from 'react'
import { X, ZoomIn, ZoomOut, Download, ExternalLink } from 'lucide-react'

interface ImageViewerProps {
  src: string
  alt?: string
  onClose: () => void
}

export const ImageViewer = ({ src, alt = 'Image', onClose }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = alt || 'image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    window.open(src, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-5 w-5 text-white" />
        </button>
        <span className="text-white text-sm px-2 min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-5 w-5 text-white" />
        </button>
        <div className="w-px h-6 bg-white/30 mx-1" />
        <button
          onClick={handleDownload}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Download"
        >
          <Download className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={handleOpenInNewTab}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="h-5 w-5 text-white" />
        </button>
        <div className="w-px h-6 bg-white/30 mx-1" />
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Close"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Image */}
      <div 
        className="flex items-center justify-center w-full h-full p-8 overflow-auto"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200 rounded-lg shadow-2xl"
          style={{ transform: `scale(${zoom})` }}
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23f0f0f0" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="14">Failed to load</text></svg>'
          }}
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Click outside the image or press ESC to close
      </div>
    </div>
  )
}
