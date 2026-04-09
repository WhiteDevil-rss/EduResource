"use client";

import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';

import { AppIcon } from '@/components/ui/AppIcon'
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
    ? 'theme-toggle flex items-center justify-center gap-2 rounded-md px-3 py-2 text-foreground transition-colors hover:bg-muted hover:text-primary border border-border/50 bg-background/80 shadow-sm backdrop-blur-sm'
    : 'theme-toggle p-2 rounded-md hover:bg-muted flex items-center justify-center text-foreground transition-colors hover:text-primary'

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
      <AppIcon icon={theme === 'dark' ? SunMedium : MoonStar} size={16} className="text-foreground hover:text-primary" />
      {showLabel ? <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span> : null}
    </Button>
  );
}
