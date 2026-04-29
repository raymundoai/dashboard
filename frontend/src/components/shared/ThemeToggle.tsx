import { Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '@/lib/types'

interface Props {
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  className?: string
}

export default function ThemeToggle({ theme, onThemeChange, className = '' }: Props) {
  const isLight = theme === 'light'

  return (
    <button
      role="switch"
      aria-checked={isLight}
      title={isLight ? 'Usar tema escuro' : 'Usar tema claro'}
      onClick={() => onThemeChange(isLight ? 'dark' : 'light')}
      className={`relative flex h-9 w-[74px] items-center rounded-full border p-1
        transition-all duration-300 cursor-pointer select-none
        ${isLight
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
          : 'border-sky-500/35 bg-sky-500/10 text-sky-400'}
        ${className}`}
    >
      <span className={`absolute top-1 h-7 w-7 rounded-full transition-all duration-300
        ${isLight
          ? 'left-[41px] bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.22)]'
          : 'left-1 bg-sky-500/20 shadow-[0_0_10px_rgba(56,189,248,0.22)]'}`}
      />
      <Moon className={`relative z-10 ml-1 h-4 w-4 transition-opacity ${isLight ? 'opacity-35' : 'opacity-100'}`} />
      <Sun className={`relative z-10 ml-auto mr-1 h-4 w-4 transition-opacity ${isLight ? 'opacity-100' : 'opacity-35'}`} />
    </button>
  )
}
