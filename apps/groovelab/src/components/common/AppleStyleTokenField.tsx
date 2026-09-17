import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface AppleStyleTokenFieldProps {
  label: string;
  selectedString: string;
  onChange: (newValue: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export const AppleStyleTokenField: React.FC<AppleStyleTokenFieldProps> = ({
  label,
  selectedString,
  onChange,
  suggestions,
  placeholder = 'Fach hinzufügen...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedTokens = selectedString
    ? selectedString.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const availableSuggestions = suggestions.filter(
    (s) => !selectedTokens.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectToken = (token: string) => {
    const next = [...selectedTokens, token];
    onChange(next.join(', '));
    setInputValue('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const handleRemoveToken = (token: string) => {
    const next = selectedTokens.filter((t) => t !== token);
    onChange(next.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputValue && selectedTokens.length > 0) {
      handleRemoveToken(selectedTokens[selectedTokens.length - 1]);
    } else if (e.key === 'ArrowDown' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % availableSuggestions.length);
    } else if (e.key === 'ArrowUp' && availableSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + availableSuggestions.length) % availableSuggestions.length);
    } else if (e.key === 'Enter' && availableSuggestions.length > 0) {
      e.preventDefault();
      handleSelectToken(availableSuggestions[activeIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        width: '100%' 
      }}
    >
      <div 
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '12px',
          border: isFocused ? '1.5px solid #007aff' : '1.5px solid #cbd5e1',
          background: '#ffffff',
          boxShadow: isFocused ? '0 0 0 3px rgba(0, 122, 255, 0.15)' : 'none',
          minHeight: '44px',
          cursor: 'text',
          transition: 'all 0.15s ease-in-out',
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {label && (
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            color: '#8e8e93', 
            marginRight: '4px',
            userSelect: 'none'
          }}>
            {label}
          </span>
        )}

        {selectedTokens.map((token) => (
          <div
            key={token}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#e5e5ea',
              color: '#1c1c1e',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 650,
              userSelect: 'none',
              transition: 'background 0.2s'
            }}
          >
            <span>{token}</span>
            <button
              type="button"
              aria-label={`Entferne ${token}`}
              title={`Entferne ${token}`}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveToken(token);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8e8e93',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '14px',
                height: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d1d1d6';
                e.currentTarget.style.color = '#555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#8e8e93';
              }}
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setActiveIndex(0);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTokens.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: '80px',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '2px 0',
            color: '#1c1c1e',
            background: 'transparent'
          }}
        />
      </div>

      {isFocused && availableSuggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '6px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px'
          }}
        >
          {availableSuggestions.map((suggestion, index) => {
            const isSelected = index === activeIndex;
            return (
              <div
                key={suggestion}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectToken(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isSelected ? '#007aff' : 'transparent',
                  color: isSelected ? '#ffffff' : '#1c1c1e',
                  transition: 'background 0.05s ease, color 0.05s ease'
                }}
              >
                {suggestion}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppleStyleTokenField;
