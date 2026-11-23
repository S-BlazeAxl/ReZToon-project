import { BarChart2 } from 'lucide-react';

interface Item {
    id: string;
    label: string;
    value: number;
}

interface Props {
    items: Item[];
    accent?: string;
    emptyMessage?: string;
}

export default function BarChartV({ items, accent = '#f5b042', emptyMessage = 'No activity recorded this week' }: Props) {
    const totalActivity = items.reduce((sum, item) => sum + item.value, 0);

    if (!items || items.length === 0 || totalActivity === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: 180, color: 'rgba(255,255,255,0.3)', gap: 10
            }}>
                <BarChart2 size={32} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emptyMessage}</span>
            </div>
        );
    }

    const max = Math.max(...items.map((i) => i.value), 1);

    return (
        <div className="chart-bar-v">
            {items.map((item) => {
                const pct = Math.round((item.value / max) * 100);
                return (
                    <div key={item.id} className="chart-bar-v-col">
                        <span className="chart-bar-v-value">{item.value}</span>
                        <div className="chart-bar-v-track">
                            <div
                                className="chart-bar-v-fill"
                                style={{
                                    height: `${pct}%`,
                                    background: `linear-gradient(180deg, ${accent}, ${accent}80)`,
                                }}
                            />
                        </div>
                        <span className="chart-bar-v-label">{item.label}</span>
                    </div>
                );
            })}
        </div>
    );
}