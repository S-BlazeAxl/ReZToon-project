import { Activity } from 'lucide-react';

interface Series {
    id: string;
    label: string;
    color: string;
    values: number[];
}

interface Props {
    labels: string[];
    series: Series[];
    height?: number;
    emptyMessage?: string;
}

export default function LineChart({
    labels,
    series,
    height = 220,
    emptyMessage = 'No data recorded yet',
}: Props) {
    const hasData = series && series.length > 0 && series.some(s => s.values.some(v => v > 0));

    if (!labels || labels.length === 0 || !hasData) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height, color: 'rgba(255,255,255,0.3)', gap: 10 }}>
                <Activity size={32} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emptyMessage}</span>
            </div>
        );
    }

    const width = 900;
    const padX = 40;
    const padY = 30;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const allValues = series.flatMap((s) => s.values);
    const max = Math.max(...allValues, 1);

    const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0;

    const buildPath = (values: number[]) => {
        return values
            .map((v, i) => {
                const x = padX + i * stepX;
                const y = padY + innerH - (v / max) * innerH;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
    };

    const gridLines = 4;

    return (
        <div className="chart-line">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {Array.from({ length: gridLines + 1 }).map((_, i) => {
                    const y = padY + (innerH / gridLines) * i;
                    const value = Math.round(max - (max / gridLines) * i);
                    return (
                        <g key={i}>
                            <line
                                x1={padX}
                                x2={width - padX}
                                y1={y}
                                y2={y}
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="1"
                            />
                            <text
                                x={padX - 8}
                                y={y + 4}
                                textAnchor="end"
                                fill="rgba(255,255,255,0.35)"
                                fontSize="10"
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}

                {series.map((s) => (
                    <path
                        key={s.id}
                        d={buildPath(s.values)}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                ))}

                {series.map((s) =>
                    s.values.map((v, i) => {
                        const x = padX + i * stepX;
                        const y = padY + innerH - (v / max) * innerH;
                        return (
                            <circle
                                key={`${s.id}-${i}`}
                                cx={x}
                                cy={y}
                                r="3"
                                fill={s.color}
                                stroke="#0d0d1a"
                                strokeWidth="1.5"
                            />
                        );
                    }),
                )}
            </svg>

            <div className="chart-line-labels">
                {labels.map((l, i) => (
                    <span key={i}>{l}</span>
                ))}
            </div>

            <div className="chart-legend">
                {series.map((s) => (
                    <span key={s.id} className="chart-legend-item">
                        <span className="chart-legend-dot" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
        </div>
    );
}