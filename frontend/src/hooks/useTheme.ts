import { useEffect, useState, useCallback } from 'react';

type Preference = 'light' | 'dark' | 'system';
const KEY = 'theme-preference';

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState<Preference>(
    () => (localStorage.getItem(KEY) as Preference) || 'system'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    preference === 'system' ? systemTheme() : preference
  );

  useEffect(() => {
    const resolved = preference === 'system' ? systemTheme() : preference;
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem(KEY, preference);

    if (preference === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        const t = systemTheme();
        setTheme(t);
        document.documentElement.dataset.theme = t;
      };
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, [preference]);

  const set = useCallback((p: Preference) => setPreference(p), []);
  return { theme, preference, setTheme: set };
}
