import { useEffect, useRef, type RefObject } from 'react';

export function useResizeObserver(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => callbackRef.current();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const ro = new ResizeObserver(() => callbackRef.current());
    ro.observe(element);
    return () => ro.disconnect();
  }, [ref]);
}