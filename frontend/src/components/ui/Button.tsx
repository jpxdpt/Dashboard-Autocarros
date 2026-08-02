import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-sm',
  secondary:
    'bg-fill text-label hover:bg-fill',
  ghost:
    'text-accent hover:bg-fill',
  destructive:
    'bg-[var(--red)] text-white hover:opacity-90',
};

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  md: 'px-4 py-2 text-[15px] rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      className={`font-medium transition-all duration-100 active:scale-[0.97]
                  disabled:opacity-50 disabled:pointer-events-none
                  ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
