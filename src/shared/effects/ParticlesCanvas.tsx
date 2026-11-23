import { useParticles } from '../../core/hooks/useParticles';

interface Props {
  count?: number;
  className?: string;
}

export default function ParticlesCanvas({ count = 150, className = '' }: Props) {
  const canvasRef = useParticles(count);
  return <canvas ref={canvasRef} className={`particles-canvas ${className}`} />;
}