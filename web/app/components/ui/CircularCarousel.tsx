"use client";

import React, { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CircularCarouselProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: ReactNode[];
  itemWidth?: number;
  itemHeight?: number;
  className?: string;
  currentIndex?: number;
  onChange?: (idx: number) => void;
}

const CircularCarousel = React.forwardRef<
  HTMLDivElement,
  CircularCarouselProps
>(
  (
    {
      items = [],
      itemWidth = 320,
      itemHeight = 420,
      className,
      currentIndex,
      onChange,
      ...props
    },
    ref
  ) => {
    const count = items.length;
    const [internalIndex, setInternalIndex] = useState(0);
    const current = currentIndex !== undefined ? currentIndex : internalIndex;

    const goTo = (idx: number) => {
      const newIndex = (idx + count) % count;
      if (onChange) onChange(newIndex);
      else setInternalIndex(newIndex);
    };

    const handlePrev = () => goTo(current - 1);
    const handleNext = () => goTo(current + 1);

    // Calculate indices for previous, current, next
    const prevIdx = (current - 1 + count) % count;
    const nextIdx = (current + 1) % count;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4",
          className
        )}
        {...props}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: itemWidth * 3, height: itemHeight }}
        >
          {/* Previous card (left) */}
          <div
            className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-20 scale-75 transition-all duration-500 pointer-events-none"
            style={{ width: itemWidth, height: itemHeight, zIndex: 1 }}
          >
            {items[prevIdx]}
          </div>
          {/* Current card (center) */}
          <div
            className="relative z-30 flex items-center justify-center w-full h-full transition-all duration-500 drop-shadow-2xl"
            style={{ width: itemWidth, height: itemHeight }}
          >
            {items[current]}
          </div>
          {/* Next card (right) */}
          <div
            className="absolute -right-[-50px] top-1/2 -translate-y-1/2 opacity-20 scale-75 transition-all duration-500 pointer-events-none"
            style={{ width: itemWidth, height: itemHeight, zIndex: 1 }}
          >
            {items[nextIdx]}
          </div>
        </div>
        {/* Navigation buttons below the card */}
        <div
          className="flex items-center justify-center mt-[-32px] gap-8 z-50"
          style={{ position: "relative" }}
        >
          <button
            onClick={handlePrev}
            className="z-50 bg-zinc-800/80 text-white border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 rounded-full w-12 h-12 flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 backdrop-blur-sm "
            aria-label="Previous"
            style={{ fontSize: 24 }}
          >
            &#8592;
          </button>
          <button
            onClick={handleNext}
            className="z-50 bg-zinc-800/80 text-white border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 rounded-full w-12 h-12 flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 backdrop-blur-sm"
            aria-label="Next"
            style={{ fontSize: 24 }}
          >
            &#8594;
          </button>
        </div>
      </div>
    );
  }
);

CircularCarousel.displayName = "CircularCarousel";

export { CircularCarousel };
