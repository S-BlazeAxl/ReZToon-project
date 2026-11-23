import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  gap?: number;
  dragIgnoreSelector?: string;
  resetKey?: unknown;
}

export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(
  cardSelector: string,
  options: Options = {},
) {
  const { gap = 16, dragIgnoreSelector, resetKey } = options;
  const trackRef = useRef<T>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragState = useRef({ startX: 0, scrollLeft: 0, isDown: false });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  useEffect(() => {
    updateArrows();
  }, [resetKey, updateArrows]);

  const scrollByAmount = useCallback(
    (dir: 1 | -1) => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>(cardSelector);
      const step = card ? card.offsetWidth + gap : 260;
      el.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
    },
    [cardSelector, gap],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const el = trackRef.current;
      if (!el) return;
      if (e.button !== 0) return;
      if (dragIgnoreSelector && (e.target as HTMLElement).closest(dragIgnoreSelector)) return;
      e.preventDefault();
      setIsDragging(true);
      dragState.current = {
        startX: e.pageX - el.offsetLeft,
        scrollLeft: el.scrollLeft,
        isDown: true,
      };
    },
    [dragIgnoreSelector],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.current.isDown) return;
      e.preventDefault();
      const el = trackRef.current;
      if (!el) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - dragState.current.startX) * 1.4;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    },
    [],
  );

  const stopDrag = useCallback(() => {
    setIsDragging(false);
    dragState.current.isDown = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, [stopDrag]);

  const resetScroll = useCallback(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: 0, behavior: 'smooth' });
    updateArrows();
  }, [updateArrows]);

  return {
    trackRef,
    canPrev,
    canNext,
    isDragging,
    scrollByAmount,
    updateArrows,
    resetScroll,
    dragHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseLeave: stopDrag,
    },
  };
}