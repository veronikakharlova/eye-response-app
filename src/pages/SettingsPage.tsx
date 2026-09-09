import { useState } from 'react'
import Header from '../layout/Header'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { changePassword } from '../lib/backend'
import Avatar, { initialsFromEmail } from '../components/Avatar'
import '../layout/layout.css'
import '../components/modal.css'

// Демо-профиль для режима без Supabase — не настоящий аккаунт, просто
// пример того, как выглядит карточка врача, когда она есть. Раньше здесь
// был EmptyState «нечего настраивать», но это буквально неверно: посмотреть
// на профиль есть на что, просто сменить пароль в демо-режиме нельзя (не к
// чему подключаться) — это и показываем, честно объяснив почему.
const DEMO_DOCTOR = { name: 'Екатерина Смирнова', initials: 'ЕС' }

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

        <div className="data-card" style={{ padding: 'var(--space-28) var(--space-32)', maxWidth: 480, marginBottom: 'var(--space-20)' }}>
          <span className="panel__label">Профиль врача</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', margin: '0 0 var(--space-4)' }}>
            <Avatar initials={DEMO_DOCTOR.initials} size={56} />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{DEMO_DOCTOR.name}</p>
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--muted)' }}>Врач-офтальмолог</p>
            </div>
          </div>
        </div>

        <p className="form-field__hint" style={{ maxWidth: 480 }}>
          Демо-режим: профиль выше — пример, не настоящий аккаунт, поэтому сменить пароль здесь нельзя, подключаться не к чему. В обычном режиме имя и специализация задаются администратором клиники при создании аккаунта, а смена пароля работает по-настоящему.
        </p>
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

      <div className="data-card" style={{ padding: 'var(--space-28) var(--space-32)', maxWidth: 480, marginBottom: 'var(--space-20)' }}>
        <span className="panel__label">Профиль врача</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)', margin: '0 0 var(--space-22)' }}>
          <Avatar initials={initialsFromEmail(session?.user.email)} size={56} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{email}</p>
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: 13, color: 'var(--muted)' }}>Врач-офтальмолог</p>
          </div>
        </div>

        <button type="button" className="page-btn" onClick={() => signOut()}>
          Выйти
        </button>
      </div>

      <p className="form-field__hint" style={{ maxWidth: 480, marginBottom: 'var(--space-20)' }}>
        Имя и специализация задаются администратором клиники при создании аккаунта.
      </p>

      <div className="data-card" style={{ padding: 'var(--space-28) var(--space-32)', maxWidth: 480 }}>
        <span className="panel__label">Безопасность</span>
        <p style={{ margin: '0 0 var(--space-18)', fontSize: 13.5, color: 'var(--muted)' }}>
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
                padding: 'var(--space-10) var(--space-14)',
                fontSize: 13,
                marginTop: 'var(--space-16)',
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
                padding: 'var(--space-10) var(--space-14)',
                fontSize: 13,
                marginTop: 'var(--space-16)',
              }}
            >
              Пароль изменён.
            </p>
          )}

          <button
            type="submit"
            className="page-btn page-btn--primary"
            disabled={submitting}
            style={{ marginTop: 'var(--space-18)' }}
          >
            {submitting ? 'Меняем…' : 'Сменить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
