import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = () => setVisible(window.scrollY > 400);
        window.addEventListener('scroll', handler);
        handler();
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <button
            className={`scroll-top ${visible ? 'visible' : ''}`}
            onClick={scrollTop}
            aria-label="Back to top"
        >
            <ChevronUp />
        </button>
    );
}