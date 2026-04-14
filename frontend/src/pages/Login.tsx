import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export default function Login() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      await api.postForm('/auth/login', {
        username: form.get('username') as string,
        password: form.get('password') as string,
      })
      // Invalidate the auth-me cache so App.tsx re-fetches and transitions to dashboard
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] })
    } catch {
      setError('Usuário ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-[360px] mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-sky-400">Brew</span>
            <span className="text-border mx-2">·</span>
            <span className="text-emerald-400">Grow</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Dashboard interno</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <Input name="username" autoComplete="username" required
                className="bg-muted/50 border-border/60 focus:border-ring transition-colors h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Senha</Label>
              <Input name="password" type="password" autoComplete="current-password" required
                className="bg-muted/50 border-border/60 focus:border-ring transition-colors h-10" />
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}
              className="mt-1 h-10 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-500/40 transition-all font-medium">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
