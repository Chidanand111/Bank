'use client';

import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  AlertTriangle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

export interface DiagramViewerProps {
  src?: string | null;
  alt?: string;
  title?: string;
  caption?: string;
  className?: string;
  maxHeightClass?: string; // e.g. "max-h-72", "max-h-96", "max-h-48"
  allowZoom?: boolean;
  bordered?: boolean;
}

export const DiagramViewer: React.FC<DiagramViewerProps> = ({
  src,
  alt = 'Question diagram',
  title,
  caption,
  className = '',
  maxHeightClass = 'max-h-72',
  allowZoom = true,
  bordered = true,
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  // Reset zoom scale whenever modal is opened/closed
  const openZoomModal = () => {
    if (!allowZoom || loadStatus !== 'loaded') return;
    setZoomScale(1);
    setIsZoomOpen(true);
  };

  const closeZoomModal = () => {
    setIsZoomOpen(false);
    setZoomScale(1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZoomOpen) {
        closeZoomModal();
      }
    };
    if (isZoomOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomOpen]);

  // Normalize and validate diagram source reference
  const normalizedSrc = React.useMemo(() => {
    if (!src || typeof src !== 'string') return '';
    const trimmed = src.trim();
    if (!trimmed) return '';

    // Filter out invalid dummy strings (like option letters "A", "B" or LaTeX expressions)
    if (trimmed.length <= 4 && /^[A-E0-9]$/i.test(trimmed)) return '';
    if (trimmed.startsWith('$') || trimmed.includes('\\frac')) return '';

    // Standard valid web URL formats
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    // Bare filename fallback (e.g. "reasoning_q5_question.png") -> route to /api/media/questions/
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed)) {
      return `/api/media/questions/${trimmed}`;
    }

    return trimmed;
  }, [src]);

  // When src changes, reset loading status
  useEffect(() => {
    if (!normalizedSrc) {
      setLoadStatus('error');
    } else {
      setLoadStatus('loading');
    }
  }, [normalizedSrc, retryKey]);

  if (!normalizedSrc) {
    return null;
  }

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadStatus('loading');
    setRetryKey((prev) => prev + 1);
  };

  const imageSrcWithCacheBust = retryKey > 0
    ? `${normalizedSrc}${normalizedSrc.includes('?') ? '&' : '?'}retry=${retryKey}`
    : normalizedSrc;

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.min(prev + 0.3, 3.0));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.max(prev - 0.3, 0.5));
  };

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
  };

  return (
    <div className={`relative inline-block max-w-full select-none ${className}`}>
      {/* Thumbnail Container */}
      <div
        className={`group relative rounded-xl overflow-hidden transition-all duration-200 ${
          bordered ? 'border border-slate-200/90 shadow-2xs hover:shadow-xs bg-white' : ''
        } ${allowZoom && loadStatus === 'loaded' ? 'cursor-zoom-in' : ''}`}
        onClick={openZoomModal}
      >
        {/* Transparent grid backing for high-contrast viewing of transparent PNG line drawings */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

        {/* Loading state skeleton */}
        {loadStatus === 'loading' && (
          <div className="flex items-center justify-center p-8 bg-slate-50/80 min-h-[140px] w-full animate-pulse">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ImageIcon className="w-6 h-6 animate-spin" />
              <span className="text-[11px] font-medium">Loading diagram...</span>
            </div>
          </div>
        )}

        {/* Error state with retry */}
        {loadStatus === 'error' && (
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-center flex flex-col items-center gap-2 max-w-md">
            <div className="flex items-center gap-1.5 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Diagram could not be loaded</span>
            </div>
            <p className="text-[11px] text-slate-500">
              The image resource could not be reached or has an invalid format.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry Loading
            </button>
          </div>
        )}

        {/* Rendered Image */}
        <img
          key={retryKey}
          src={imageSrcWithCacheBust}
          alt={alt}
          title={title || alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadStatus('loaded')}
          onError={() => setLoadStatus('error')}
          className={`relative z-10 w-auto max-w-full ${maxHeightClass} object-contain transition-opacity duration-200 ${
            loadStatus === 'loaded' ? 'opacity-100' : 'opacity-0 absolute'
          }`}
          style={{ imageRendering: 'auto' }}
        />

        {/* Hover Zoom Prompt Badge */}
        {allowZoom && loadStatus === 'loaded' && (
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-md pointer-events-none">
            <ZoomIn className="w-3 h-3 text-blue-300" />
            <span>Click to Zoom</span>
          </div>
        )}
      </div>

      {/* Optional Caption */}
      {caption && (
        <span className="block text-[11px] text-slate-500 font-medium mt-1 italic text-center">
          {caption}
        </span>
      )}

      {/* Interactive Fullscreen Lightbox Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeZoomModal}
        >
          {/* Top Control Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between gap-3 bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl border border-slate-700 shadow-xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <Maximize2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold truncate text-slate-200">
                {title || alt || 'Diagram Detail Inspector'}
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomScale <= 0.5}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-800 text-blue-300 rounded border border-slate-700">
                {Math.round(zoomScale * 100)}%
              </span>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomScale >= 3.0}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ml-1"
                title="Reset to 100%"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={closeZoomModal}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 transition-colors"
                title="Close (Esc)"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pannable & Zoomable Image Area */}
          <div
            className="flex-1 w-full max-w-6xl overflow-auto my-3 flex items-center justify-center p-2 rounded-2xl cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="transition-transform duration-150 ease-out inline-block rounded-xl overflow-hidden shadow-2xl bg-white/95 [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] p-3 border border-slate-700"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={imageSrcWithCacheBust}
                alt={alt}
                className="max-h-[75vh] max-w-[85vw] object-contain select-none"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>

          {/* Bottom Footer Note */}
          <div className="text-[11px] text-slate-400 font-medium z-10 flex items-center gap-2">
            <span>Scroll or use +/- to inspect mathematical labels, axes, and fine details.</span>
            <span className="hidden sm:inline">• Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
