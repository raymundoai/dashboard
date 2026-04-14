import type { ReactNode } from 'react'

interface Props { children: ReactNode }
export default function Shell({ children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
