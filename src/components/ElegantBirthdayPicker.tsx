import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface ElegantBirthdayPickerProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

export const ElegantBirthdayPicker: React.FC<ElegantBirthdayPickerProps> = ({ value, onChange, label }) => {
  const [showModal, setShowModal] = useState(false);
  const [tempDate, setTempDate] = useState(value || '2010-01-01');
  
  const parts = tempDate.split('-');
  const [year, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const years = Array.from({ length: 80 }, (_, i) => (new Date().getFullYear() - 3 - i).toString());
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const monthNums = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleUpdate = (type: 'year' | 'month' | 'day', val: string) => {
    const newParts = [...parts];
    if (type === 'year') newParts[0] = val;
    if (type === 'month') newParts[1] = val;
    if (type === 'day') newParts[2] = val;
    setTempDate(newParts.join('-'));
  };

  const confirm = () => {
    onChange(tempDate);
    setShowModal(false);
  };

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        {label && <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>{label}</label>}
        <div className="elegant-picker-trigger" onClick={() => {
          setTempDate(value || '2010-01-01');
          setShowModal(true);
        }}>
          <div className="picker-part"><span>{day}</span><label>Tag</label></div>
          <div className="picker-part"><span>{months[parseInt(month) - 1]}</span><label>Monat</label></div>
          <div className="picker-part"><span>{year}</span><label>Jahr</label></div>
        </div>
      </div>

      {showModal && (
        <div className="elegant-modal-overlay">
          <div className="elegant-modal-content animation-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Geburtsdatum</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X /></button>
            </div>

            <div className="wheel-container">
              <div className="wheel-selection-indicator"></div>
              
              {/* Day Wheel */}
              <WheelColumn 
                items={days} 
                selected={day} 
                onSelect={(val: string) => handleUpdate('day', val)} 
              />
              
              {/* Month Wheel */}
              <WheelColumn 
                items={monthNums} 
                selected={month} 
                labels={months}
                onSelect={(val: string) => handleUpdate('month', val)} 
              />

              {/* Year Wheel */}
              <WheelColumn 
                items={years} 
                selected={year} 
                onSelect={(val: string) => handleUpdate('year', val)} 
              />
            </div>

            <button 
              onClick={confirm}
              style={{ width: '100%', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 20px -5px rgba(234, 179, 8, 0.4)' }}
            >
              <Check size={20} /> Übernehmen
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const WheelColumn = ({ items, selected, onSelect, labels }: any) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = items.indexOf(selected);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = index * 40;
    }
  }, [items, selected]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollTop / 40);
    if (items[index] && items[index] !== selected) {
      onSelect(items[index]);
    }
  };

  return (
    <div className="wheel-column" ref={scrollRef} onScroll={handleScroll}>
      <div className="wheel-spacer"></div>
      {items.map((item: string, idx: number) => (
        <div key={item} className={`wheel-item ${selected === item ? 'active' : ''}`}>
          {labels ? labels[idx] : item}
        </div>
      ))}
      <div className="wheel-spacer"></div>
    </div>
  );
};
