import { ReactNode } from 'react';

const tones = {
  green: 'bg-[var(--green)]/15 text-[var(--green)]',
  orange: 'bg-[var(--orange)]/15 text-[var(--orange)]',
  red: 'bg-[var(--red)]/15 text-[var(--red)]',
  gray: 'bg-fill text-label-secondary',
  blue: 'bg-accent/15 text-accent',
};

export default function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
