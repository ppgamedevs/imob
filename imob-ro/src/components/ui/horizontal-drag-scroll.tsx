"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface HorizontalDragScrollProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function HorizontalDragScroll({
  children,
  className,
  ...props
}: HorizontalDragScrollProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const stopDragging = React.useCallback(() => {
    dragState.current.isDragging = false;
  }, []);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const element = ref.current;
      if (!element) return;

      dragState.current.isDragging = true;
      dragState.current.startX = event.clientX;
      dragState.current.startScrollLeft = element.scrollLeft;
      dragState.current.moved = false;
    },
    [],
  );

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element || !dragState.current.isDragging) return;

    const deltaX = event.clientX - dragState.current.startX;
    if (Math.abs(deltaX) > 4) {
      dragState.current.moved = true;
    }

    element.scrollLeft = dragState.current.startScrollLeft - deltaX;
  }, []);

  const handleClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.moved) return;

    event.preventDefault();
    event.stopPropagation();
    dragState.current.moved = false;
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      onClickCapture={handleClickCapture}
      style={{ touchAction: "pan-x" }}
      {...props}
    >
      {children}
    </div>
  );
}
