import React from 'react';
import { BookOpen } from 'lucide-react';
import { LehrwerkReference } from './wochenfahrplanTypes';

export interface WochenFahrplanBookPillProps {
  lehrwerke: LehrwerkReference[];
  onOpenBook?: (book: LehrwerkReference) => void;
  style?: React.CSSProperties;
}

export const WochenFahrplanBookPill: React.FC<WochenFahrplanBookPillProps> = ({
  lehrwerke,
  onOpenBook,
  style
}) => {
  if (!lehrwerke || lehrwerke.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Zugeordnete Lehrwerke & Noten"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px',
        ...style
      }}
    >
      {lehrwerke.map((book, idx) => {
        const pagesText = book.pages && book.pages.length > 0
          ? ` • S. ${book.pages.join(', ')}`
          : '';

        return (
          <button
            key={`${book.title}-${idx}`}
            type="button"
            onClick={() => onOpenBook && onOpenBook(book)}
            title={`Noten für ${book.title}${pagesText} öffnen`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: onOpenBook ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={12} color="#475569" />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
              {book.title}{pagesText}
            </span>
          </button>
        );
      })}
    </div>
  );
};
