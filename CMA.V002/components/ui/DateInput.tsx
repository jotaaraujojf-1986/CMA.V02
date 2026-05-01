import React, { useRef } from 'react';

interface DateInputProps {
  type: 'date' | 'month';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

/**
 * DateInput — wraps native date/month input with a formatted overlay on mobile.
 * On mobile, browsers show dates in locale format (e.g. "1 de abr. de 2026") which
 * can overflow narrow containers. This component overlays "dd/MM/yyyy" or "MM/yyyy"
 * text so users always see a compact format, while preserving the native picker UX.
 */
export const DateInput: React.FC<DateInputProps> = ({ type, value, onChange, className = '' }) => {
  const ref = useRef<HTMLInputElement>(null);

  const formatDisplay = () => {
    if (!value) return '';
    if (type === 'month') {
      // value is "yyyy-MM"
      const [y, m] = value.split('-');
      return `${m}/${y}`;
    }
    // value is "yyyy-MM-dd"
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="date-input-wrap" onClick={() => ref.current?.showPicker?.()}>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        className={`${className} date-input-native`}
      />
      <span className="date-input-display">{formatDisplay()}</span>
    </div>
  );
};
