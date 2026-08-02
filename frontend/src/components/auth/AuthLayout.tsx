import { ReactNode } from 'react';
import { motion } from 'motion/react';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-app"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent)',
      }}
    >
      <motion.div
        className="glass rounded-2xl shadow-sheet p-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      >
        <div className="text-center mb-6">
          <h1 className="display-1">{title}</h1>
          {subtitle && <p className="footnote mt-2">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 text-center text-[14px] text-label-secondary">{footer}</div>}
      </motion.div>
    </div>
  );
}
