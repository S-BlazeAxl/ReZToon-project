import { useEffect, useRef } from 'react';

const SHAPES = ['▲', '●', '◆', '★', '♦'];
const SHAPE_COUNT = 12;

export default function FloatingShapes() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const animations: Animation[] = [];
    const elements: HTMLSpanElement[] = [];

    for (let i = 0; i < SHAPE_COUNT; i++) {
      const el = document.createElement('span');
      el.textContent = SHAPES[i % SHAPES.length];
      el.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 20 + 10}px;
        color: rgba(245, 176, 66, ${Math.random() * 0.15 + 0.05});
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
      `;
      container.appendChild(el);
      elements.push(el);

      const dx1 = Math.random() * 200 - 100;
      const dy1 = Math.random() * 200 - 100;
      const dx2 = Math.random() * 200 - 100;
      const dy2 = Math.random() * 200 - 100;
      const dx3 = Math.random() * 200 - 100;
      const dy3 = Math.random() * 200 - 100;
      const r1 = Math.random() * 360;
      const r2 = Math.random() * 360;
      const r3 = Math.random() * 360;

      const anim = el.animate(
        [
          { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 0.2 },
          { transform: `translate(${dx1}px,${dy1}px) rotate(${r1}deg) scale(1.2)`, opacity: 0.6 },
          { transform: `translate(${dx2}px,${dy2}px) rotate(${r2}deg) scale(0.8)`, opacity: 0.3 },
          { transform: `translate(${dx3}px,${dy3}px) rotate(${r3}deg) scale(1.4)`, opacity: 0.7 },
          { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 0.2 },
        ],
        {
          duration: (15 + Math.random() * 25) * 1000,
          iterations: Infinity,
          delay: Math.random() * 10 * 1000,
          easing: 'linear',
        },
      );
      animations.push(anim);
    }

    return () => {
      animations.forEach((a) => a.cancel());
      elements.forEach((el) => el.remove());
    };
  }, []);

  return <div className="floating-shapes" ref={ref} />;
}