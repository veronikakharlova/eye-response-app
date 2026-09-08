import { useState } from 'react'
import Header from '../layout/Header'
import { EmptyState } from '../components/StateViews'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { changePassword } from '../lib/backend'
import '../layout/layout.css'
import '../components/modal.css'

function initialsFromEmail(email: string | undefined): string {
  if (!email) return 'Вр'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]+/).filter(Boolean)
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  return letters.toUpperCase()
}

export default function SettingsPage() {
  const { session, signOut } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div>
        <Header title="Настройки" />
        {/* Тот же компонент EmptyState, что и на «Отчётах» при пустом журнале —
            одна и та же карточка-заглушка с иконкой вместо двух разных
            самодельных вариантов центрированного текста. */}
        <div className="data-card">
          <EmptyState
            icon="inbox"
            title="Пока нечего настраивать"
            description="Приложение работает на статичных данных, без входа."
          />
        </div>
      </div>
    )
  }

  const email = session?.user.email ?? '—'

  const resetPwStatus = () => {
    setPwError('')
    setPwSuccess(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Заполните все три поля.')
      return
    }
    if (newPassword.length < 6) {
      setPwError('Новый пароль должен быть не короче 6 символов.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Новый пароль и повтор не совпадают.')
      return
    }
    if (!session?.user.email) {
      setPwError('Не удалось определить почту аккаунта. Перезайдите и попробуйте снова.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword(session.user.email, currentPassword, newPassword)
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Не удалось поменять пароль.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Header title="Настройки" />

      <div className="data-card" style={{ padding: '28px 32px', maxWidth: 480, marginBottom: 20 }}>
        <span className="panel__label">Профиль врача</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '16px 0 22px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '999px',
              background: 'linear-gradient(135deg, var(--accent), #9b8cff)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initialsFromEmail(session?.user.email)}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{email}</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>Врач-офтальмолог</p>
          </div>
        </div>

        <button type="button" className="page-btn" onClick={() => signOut()}>
          Выйти
        </button>
      </div>

      <p className="form-field__hint" style={{ maxWidth: 480, marginBottom: 20 }}>
        Имя и специализация задаются администратором клиники при создании аккаунта.
      </p>

      <div className="data-card" style={{ padding: '28px 32px', maxWidth: 480 }}>
        <span className="panel__label">Безопасность</span>
        <p style={{ margin: '10px 0 18px', fontSize: 13.5, color: 'var(--muted)' }}>
          Смените пароль.
        </p>

        <form onSubmit={handleChangePassword}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="form-field">
              <label htmlFor="settings-current-password">Текущий пароль</label>
              <input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  resetPwStatus()
                }}
                placeholder="••••••••"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settings-new-password">Новый пароль</label>
              <input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  resetPwStatus()
                }}
                placeholder="••••••••"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settings-confirm-password">Повторите новый пароль</label>
              <input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  resetPwStatus()
                }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {pwError && (
            <p
              style={{
                background: 'var(--warn-bg)',
                color: 'var(--warn-text)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                marginTop: 16,
              }}
            >
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p
              style={{
                background: 'var(--ok-bg)',
                color: 'var(--ok-text)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                marginTop: 16,
              }}
            >
              Пароль изменён.
            </p>
          )}

          <button
            type="submit"
            className="page-btn page-btn--primary"
            disabled={submitting}
            style={{ marginTop: 18 }}
          >
            {submitting ? 'Меняем…' : 'Сменить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
