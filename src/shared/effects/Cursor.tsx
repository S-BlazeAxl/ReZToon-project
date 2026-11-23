import { useCursor } from '../../core/hooks/useCursor';

export default function Cursor() {
  const { cursorRef, trailRef, glowRef } = useCursor();
  return (
    <>
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-trail" ref={trailRef} />
      <div className="cursor-glow" ref={glowRef} />
    </>
  );
}