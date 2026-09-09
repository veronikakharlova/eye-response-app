import { useState } from 'react'
import { signIn } from '../lib/backend'
import '../components/modal.css'

/**
 * Экран входа врача. Показывается вместо всего приложения, когда Supabase
 * настроен (isSupabaseConfigured), но сессии ещё нет — см. AuthGate в
 * App.tsx. Публичной регистрации намеренно нет: приложение однодоктороское
 * (см. комментарий в supabase/schema.sql), пользователя заводят вручную —
 * Supabase Dashboard → Authentication → Users → Add user.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Заполните и почту, и пароль.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // Дальше ничего делать не нужно: AuthProvider сам подхватит новую
      // сессию через onAuthStateChange, и AuthGate пропустит в приложение.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти. Проверьте почту и пароль.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 'var(--space-20)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="data-card"
        style={{ width: '100%', maxWidth: 380, padding: 'var(--space-32) var(--space-28)' }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #9b8cff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-18)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" stroke="white" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3" fill="white" />
          </svg>
        </div>

        <h1 style={{ fontSize: 19, fontWeight: 500, margin: '0 0 var(--space-4)' }}>Вход врача</h1>
        <p className="page-subtitle" style={{ margin: '0 0 var(--space-20)' }}>
          Частотная характеристика сетчатки. Доступ только для авторизованных.
        </p>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-field">
            <label htmlFor="signin-email">Почта</label>
            <input
              id="signin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@example.com"
            />
          </div>
          <div className="form-field">
            <label htmlFor="signin-password">Пароль</label>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <p style={{ color: 'var(--warn-text)', fontSize: 13, marginTop: 'var(--space-14)' }}>{error}</p>}

        <button
          type="submit"
          className="page-btn page-btn--primary"
          disabled={submitting}
          style={{ width: '100%', marginTop: 'var(--space-18)' }}
        >
          {submitting ? 'Входим…' : 'Войти'}
        </button>

        <p className="form-field__hint" style={{ marginTop: 'var(--space-14)', textAlign: 'center' }}>
          Аккаунт создаётся вручную в Supabase Dashboard, публичной регистрации нет.
        </p>
      </form>
    </div>
  )
}
