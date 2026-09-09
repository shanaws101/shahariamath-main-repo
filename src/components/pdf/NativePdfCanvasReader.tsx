import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Minimize2, Shield, RotateCw, Rows, FileText, ArrowLeft
} from 'lucide-react';

// Configure local worker from public directory
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface NativePdfCanvasReaderProps {
  data: Uint8Array | ArrayBuffer | string;
  title: string;
  isFree?: boolean;
  onBack?: () => void;
}

// ----------------------------------------------------
// Individual PDF Page Component (Lazy / Intersection-based)
// ----------------------------------------------------
function PdfPageCanvasItem({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  onVisible,
}: {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  onVisible?: (pageNum: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414); // Standard A4 default
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    let active = true;
    pdfDoc.getPage(pageNumber).then(page => {
      if (!active) return;
      const vp = page.getViewport({ scale: 1, rotation });
      if (vp.width && vp.height) {
        setAspectRatio(vp.height / vp.width);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [pdfDoc, pageNumber, rotation]);

  const renderPage = useCallback(async () => {
    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale, rotation: rotation });

      canvas.width = Math.ceil(viewport.width * dpr);
      canvas.height = Math.ceil(viewport.height * dpr);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: context,
        viewport,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      setIsRendered(true);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Page ${pageNumber} render notice:`, err);
      }
    }
  }, [pdfDoc, pageNumber, scale, rotation]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onVisible?.(pageNumber);
            renderPage();
          }
        });
      },
      { rootMargin: '500px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [renderPage, onVisible, pageNumber]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative shadow-md sm:shadow-xl rounded-md sm:rounded-xl bg-white overflow-hidden mx-auto my-2 sm:my-4 transition-all border border-border/40"
      style={{
        maxWidth: '100%',
        minHeight: isRendered ? 'auto' : '300px',
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-auto select-none" />
      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono pointer-events-none opacity-70">
        Page {pageNumber}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main Native PDF Canvas Reader Component
// ----------------------------------------------------
export function NativePdfCanvasReader({
  data,
  title,
  isFree = false,
  onBack,
}: NativePdfCanvasReaderProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [userScale, setUserScale] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'continuous' | 'single'>('continuous');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    async function loadPdf() {
      try {
        let docSource: any;
        if (typeof data === 'string') {
          docSource = { url: data };
        } else if (data instanceof Uint8Array) {
          docSource = { data: data };
        } else {
          docSource = { data: new Uint8Array(data) };
        }

        const loadingTask = pdfjsLib.getDocument({
          ...docSource,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(loadedDoc);
          setNumPages(loadedDoc.numPages);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF in canvas:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to render PDF document.');
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [data]);

  // 2. Measure Container Width for Auto Fit
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 3. Compute Auto Scale to Fill Screen Width (Especially on Mobile)
  const computedScale = useMemo(() => {
    if (userScale !== null) return userScale;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const availableWidth = isMobile ? Math.max(containerWidth - 16, 320) : Math.min(containerWidth - 64, 850);
    // Standard PDF page width is ~595pt
    const basePageWidth = 595;
    const autoScale = availableWidth / basePageWidth;
    return Math.max(0.6, Number(autoScale.toFixed(2)));
  }, [containerWidth, userScale]);

  // 4. Track visible page during continuous scroll
  const handlePageVisible = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  // 5. Scroll to page
  const scrollToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return;
    setCurrentPage(pageNum);

    if (viewMode === 'continuous') {
      const pageEl = document.getElementById(`pdf-page-${pageNum}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // 6. Security controls: Block right click, Ctrl+P, Ctrl+S, F12
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col select-none bg-background ${
        isFullscreen ? 'fixed inset-0 z-50' : 'fixed inset-0 z-40 lg:relative lg:h-[calc(100vh-4.5rem)]'
      }`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Controls Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-card/95 backdrop-blur border-b border-border shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shrink-0"
              onClick={onBack}
              title="Back to Library"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-extrabold truncate text-foreground leading-tight">
              {title}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
              {isFree ? 'Free Sample' : 'Full Suggestion'} • Shaharia Math
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom In / Out */}
          <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setUserScale(s => Math.max(0.5, Number(((s ?? computedScale) - 0.15).toFixed(2))))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] px-1.5 text-center font-mono font-semibold">
              {Math.round(computedScale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setUserScale(s => Math.min(2.5, Number(((s ?? computedScale) + 0.15).toFixed(2))))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* View Mode Toggle: Continuous vs Single Page */}
          <Button
            variant={viewMode === 'continuous' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-xl hidden sm:inline-flex"
            onClick={() => setViewMode(m => m === 'continuous' ? 'single' : 'continuous')}
            title={viewMode === 'continuous' ? 'Switch to Single Page' : 'Switch to Continuous Scroll'}
          >
            <Rows className="h-4 w-4" />
          </Button>

          {/* Rotate */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hidden sm:inline-flex"
            onClick={() => setRotation(r => (r + 90) % 360)}
            title="Rotate Page"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hidden sm:inline-flex"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          {/* Page Counter Badge */}
          <Badge
            variant="secondary"
            className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
          >
            {currentPage} / {numPages || 1}
          </Badge>
        </div>
      </div>

      {/* Main Document Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/40 px-2 sm:px-6 py-4 pb-28 sm:pb-32 relative"
      >
        {isLoading && (
          <div className="m-auto text-center space-y-3 p-16">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-foreground">Loading PDF Document...</p>
            <p className="text-xs text-muted-foreground">Rendering crystal clear high-speed pages</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="m-auto text-center space-y-3 p-8 max-w-md bg-card rounded-2xl border border-destructive/30 shadow-lg">
            <p className="text-sm font-bold text-destructive">Failed to display PDF</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!isLoading && !error && pdfDoc && (
          <div className="max-w-4xl mx-auto w-full">
            {viewMode === 'continuous' ? (
              // Continuous Vertical Scroll List
              pageNumbers.map(pageNum => (
                <PdfPageCanvasItem
                  key={pageNum}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  scale={computedScale}
                  rotation={rotation}
                  onVisible={handlePageVisible}
                />
              ))
            ) : (
              // Single Page Mode
              <PdfPageCanvasItem
                key={currentPage}
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                scale={computedScale}
                rotation={rotation}
              />
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Page Control Bar (For fast navigation) */}
      {!isLoading && !error && numPages > 1 && (
        <div className="fixed sm:absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2 z-30">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Button>

          <span className="text-xs font-mono font-extrabold px-2 tabular-nums">
            {currentPage} / {numPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-xl text-xs font-bold gap-1"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
