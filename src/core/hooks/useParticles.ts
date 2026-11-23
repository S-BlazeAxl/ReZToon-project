import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
  update: (w: number, h: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const LINK_DISTANCE = 120;
const CELL_SIZE = LINK_DISTANCE;

export function useParticles(count = 150) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return;

    let rafId = 0;
    const particles: Particle[] = [];
    const grid = new Map<string, number[]>();

    const measure = (): { w: number; h: number } => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { w: Math.round(rect.width), h: Math.round(rect.height) };
        }
      }
      return { w: window.innerWidth, h: window.innerHeight };
    };

    const resize = () => {
      const { w, h } = measure();
      const prevW = canvas.width;
      const prevH = canvas.height;
      canvas.width = w;
      canvas.height = h;

      if (prevW > 0 && prevH > 0) {
        const scaleX = w / prevW;
        const scaleY = h / prevH;
        for (const p of particles) {
          p.x *= scaleX;
          p.y *= scaleY;
          p.x = Math.max(0, Math.min(w, p.x));
          p.y = Math.max(0, Math.min(h, p.y));
        }
      } else {
        for (const p of particles) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.6 + 0.2,
      hue: 40 + Math.random() * 20,
      update(w: number, h: number) {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > w) this.speedX *= -1;
        if (this.y < 0 || this.y > h) this.speedY *= -1;
        if (this.x < 0) this.x = 0;
        if (this.x > w) this.x = w;
        if (this.y < 0) this.y = 0;
        if (this.y > h) this.y = h;
      },
      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity})`;
        c.fill();
      },
    });

    for (let i = 0; i < count; i++) particles.push(createParticle());

    let running = true;

    const buildGrid = () => {
      grid.clear();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);
        const key = `${cx},${cy}`;
        const cell = grid.get(key);
        if (cell) cell.push(i);
        else grid.set(key, [i]);
      }
    };

    const drawLinks = () => {
      const maxSq = LINK_DISTANCE * LINK_DISTANCE;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = Math.floor(p.x / CELL_SIZE);
        const cy = Math.floor(p.y / CELL_SIZE);

        for (let nx = cx - 1; nx <= cx + 1; nx++) {
          for (let ny = cy - 1; ny <= cy + 1; ny++) {
            const cell = grid.get(`${nx},${ny}`);
            if (!cell) continue;
            for (const j of cell) {
              if (j <= i) continue;
              const dx = p.x - particles[j].x;
              const dy = p.y - particles[j].y;
              const distSq = dx * dx + dy * dy;
              if (distSq < maxSq) {
                const dist = Math.sqrt(distSq);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(245, 176, 66, ${0.08 * (1 - dist / LINK_DISTANCE)})`;
                ctx.lineWidth = 0.6;
                ctx.stroke();
              }
            }
          }
        }
      }
    };

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      }
      buildGrid();
      drawLinks();
      rafId = requestAnimationFrame(animate);
    };
    animate();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!running) {
          running = true;
          animate();
        }
      } else {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const parentEl = canvas.parentElement;
    let ro: ResizeObserver | null = null;
    if (parentEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(parentEl);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      ro?.disconnect();
    };
  }, [count]);

  return canvasRef;
}