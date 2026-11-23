import { useEffect } from 'react';
// 👇 Correction du chemin d'import (remontée de 2 niveaux)
import type { ModalData } from '../../config/types';

interface GenreModalProps {
    isOpen: boolean;
    data: ModalData;
    onClose: () => void;
}

export default function GenreModal({ isOpen, data, onClose }: GenreModalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    return (
        <div
            className={`modal-overlay ${isOpen ? 'active' : ''}`}
            id="genreModal"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-content modal-opaque">
                <button className="modal-close" id="modalClose" onClick={onClose}>
                    &times;
                </button>
                <h2 className="modal-title" id="modalTitle">
                    {data.title}
                </h2>
                <p className="modal-description" id="modalDescription">
                    {data.description}
                </p>
            </div>
        </div>
    );
}