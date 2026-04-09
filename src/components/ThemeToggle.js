"use client";

import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';

import { Button } from './ui/button';

const STORAGE_KEY = 'eduresourcehub-theme';

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ className = '', showLabel = false }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : getSystemTheme();

    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const baseClasses = showLabel
    ? 'button theme-toggle gap-2 rounded-full border border-border/50 bg-background/80 px-3 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/60 hover:text-foreground'
    : 'button theme-toggle gap-2 rounded-full border border-border/50 bg-background/80 px-3 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted/60 hover:text-foreground h-10 w-10 rounded-full border-border/50 bg-background/90 text-foreground hover:bg-muted/70'

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      onClick={toggleTheme}
      className={`${baseClasses} ${className}`}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Toggle theme'}
      title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme` : 'Toggle theme'}
    >
      {theme === 'dark' ? (
        <SunMedium size={16} className="text-foreground" aria-hidden="true" />
      ) : (
        <MoonStar size={16} className="text-foreground" aria-hidden="true" />
      )}
      {showLabel ? <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span> : null}
    </Button>
  );
}
