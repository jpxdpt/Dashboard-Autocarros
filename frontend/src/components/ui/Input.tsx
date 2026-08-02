import { InputHTMLAttributes } from 'react';

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="footnote block mb-1.5">{label}</span>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface text-label border border-separator
                    placeholder:text-label-tertiary outline-none
                    focus:border-accent focus:ring-4 focus:ring-accent/15 transition-shadow
                    ${error ? 'border-[var(--red)]' : ''} ${className}`}
        {...props}
      />
      {error && <span className="footnote block mt-1 text-[var(--red)]">{error}</span>}
    </label>
  );
}
