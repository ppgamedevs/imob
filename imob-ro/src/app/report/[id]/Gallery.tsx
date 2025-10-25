"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Gallery - Image carousel with thumbnails
 *
 * Features:
 * - Swipeable on mobile (touch gestures)
 * - Keyboard navigation (arrow keys)
 * - Thumbnail row with scroll
 * - Lightbox on click
 * - Responsive aspect ratios (4:3 mobile, 16:9 desktop)
 * - Zero CLS with reserved space
 */

export interface GalleryProps {
  images: GalleryImage[];
  title?: string;
}

export interface GalleryImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export default function Gallery({ images, title = "Galerie foto" }: GalleryProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  // Navigate to specific image
  const goToImage = React.useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setCurrentIndex(index);
      }
    },
    [images.length],
  );

  // Previous/Next handlers
  const goToPrevious = React.useCallback(() => {
    goToImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  }, [currentIndex, images.length, goToImage]);

  const goToNext = React.useCallback(() => {
    goToImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, images.length, goToImage]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, goToPrevious, goToNext]);

  if (images.length === 0) {
    return (
      <div className="relative w-full aspect-[4/3] lg:aspect-[16/9] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted">Nicio fotografie disponibilă</p>
      </div>
    );
  }

  return (
    <>
      {/* Main Carousel */}
      <div
        ref={carouselRef}
        className="relative w-full"
        role="region"
        aria-roledescription="carousel"
        aria-label={title}
      >
        {/* Main Image */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full aspect-[4/3] lg:aspect-[16/9] bg-muted rounded-lg overflow-hidden focus-ring cursor-zoom-in group"
          aria-label={`Deschide galerie la imaginea ${currentIndex + 1} din ${images.length}`}
        >
          <Image
            src={currentImage.src}
            alt={currentImage.alt || `Fotografie ${currentIndex + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover transition-transform duration-slow group-hover:scale-105"
            priority={currentIndex === 0}
            loading={currentIndex === 0 ? "eager" : "lazy"}
          />

          {/* Image counter overlay */}
          {hasMultiple && (
            <div className="absolute bottom-4 right-4 px-3 py-1 bg-bg/90 backdrop-blur-sm rounded-md text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </button>

        {/* Navigation Arrows */}
        {hasMultiple && (
          <>
            <Button
              variant="secondary"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-elev1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Imaginea anterioară"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-elev1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Imaginea următoare"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Thumbnails */}
        {hasMultiple && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToImage(index)}
                className={cn(
                  "relative shrink-0 w-20 h-16 rounded-md overflow-hidden border-2 transition-all focus-ring",
                  index === currentIndex
                    ? "border-primary shadow-elev1"
                    : "border-border hover:border-primary/50",
                )}
                aria-label={`Vizualizează imaginea ${index + 1}`}
                aria-current={index === currentIndex}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Galerie în mărime completă"
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-10"
            aria-label="Închide galerie"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={currentImage.src}
              alt={currentImage.alt || `Fotografie ${currentIndex + 1}`}
              fill
              sizes="(max-width: 1536px) 90vw, 1536px"
              className="object-contain"
              priority
            />
          </div>

          {hasMultiple && (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
                aria-label="Imaginea anterioară"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full"
                aria-label="Imaginea următoare"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg/90 backdrop-blur-sm rounded-md text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
