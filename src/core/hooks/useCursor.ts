import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  '[role="tab"]',
  '[role="link"]',
  'select',
  'summary',
  'label',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="range"]',
  'input[type="file"]',
  '.cursor-pointer',
  '.cursor-hover'
].join(', ');

const TEXT_SELECTOR = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="search"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="number"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]',
].join(', ');

export function useCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || reduceMotion) {
      [cursorRef, trailRef, glowRef].forEach((r) => {
        if (r.current) r.current.style.display = 'none';
      });
      document.body.style.cursor = '';
      document.body.classList.remove('has-custom-cursor');
      return;
    }

    const cursor = cursorRef.current;
    const trail = trailRef.current;
    const glow = glowRef.current;

    if (!cursor || !trail || !glow) return;

    document.body.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let trailX = mouseX;
    let trailY = mouseY;
    let glowX = mouseX;
    let glowY = mouseY;
    let rafId = 0;
    let isMoving = false;
    let moveTimeout: number;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isMoving) {
        isMoving = true;
        loop();
      }

      clearTimeout(moveTimeout);
      moveTimeout = window.setTimeout(() => {
        isMoving = false;
      }, 100);
    };

    const loop = () => {
      cursorX += (mouseX - cursorX) * 0.8;
      cursorY += (mouseY - cursorY) * 0.8;
      trailX += (mouseX - trailX) * 0.3;
      trailY += (mouseY - trailY) * 0.3;
      glowX += (mouseX - glowX) * 0.15;
      glowY += (mouseY - glowY) * 0.15;

      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0) translate(-50%, -50%)`;
      glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;

      if (isMoving || Math.abs(mouseX - cursorX) > 0.1 || Math.abs(mouseY - cursorY) > 0.1) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const setState = (state: 'idle' | 'hover' | 'text' | 'click') => {
      if (cursor.dataset.state === state) return;
      cursor.dataset.state = state;
      trail.dataset.state = state;
      glow.dataset.state = state;
    };

    const evaluate = (el: HTMLElement | null) => {
      if (!el || el.closest('.reader-shell')) {
        setState('idle');
        return;
      }

      if (el.closest(TEXT_SELECTOR)) {
        setState('text');
        return;
      }

      if (el.closest(INTERACTIVE_SELECTOR)) {
        setState('hover');
        return;
      }

      setState('idle');
    };

    const onOver = (e: MouseEvent) => evaluate(e.target as HTMLElement);

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related) evaluate(related);
      else setState('idle');
    };

    const onDown = () => setState('click');
    const onUp = (e: MouseEvent) => evaluate(e.target as HTMLElement);

    const onLeave = () => {
      cursor.style.opacity = '0';
      trail.style.opacity = '0';
      glow.style.opacity = '0';
    };

    const onEnter = () => {
      cursor.style.opacity = '';
      trail.style.opacity = '';
      glow.style.opacity = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(moveTimeout);
      document.body.classList.remove('has-custom-cursor');
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return { cursorRef, trailRef, glowRef };
}