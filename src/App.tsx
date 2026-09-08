import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReportsPage from './pages/ReportsPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import SignInPage from './pages/SignInPage'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { PatientsDataProvider } from './lib/PatientsDataContext'
import { isSupabaseConfigured } from './lib/supabaseClient'

// Страница /myopia работает с реальными ФИО/ДР 9 пациентов (см. заголовок
// src/data/myopiaIdentity.ts) и существует только для локальной разработки.
// import.meta.env.DEV — литерал false в продакшен-сборке (npm run build),
// поэтому весь блок ниже, включая динамический import('./pages/MyopiaPage')
// (а через него и сам myopiaIdentity.ts), вычищается Vite как мёртвый код:
// физически не попадает ни в один опубликованный JS-файл, а не просто
// скрывается по .gitignore, которого для собранного билда недостаточно.
const MyopiaPage = import.meta.env.DEV ? lazy(() => import('./pages/MyopiaPage')) : null

/**
 * Пропускает в приложение только авторизованного врача — но только когда
 * Supabase вообще настроен (isSupabaseConfigured). Без настроенного
 * бэкенда экран входа не показывается вовсе: приложение работает как
 * раньше, на статичных данных, без авторизации — так и локальная разработка
 * без ключей, и уже опубликованная демо-версия продолжают работать.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) return <>{children}</>

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Проверяем сессию…</span>
      </div>
    )
  }

  if (!session) return <SignInPage />

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <PatientsDataProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/patients" replace />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:code" element={<PatientDetailPage />} />
              {import.meta.env.DEV && MyopiaPage && (
                <Route
                  path="/myopia"
                  element={
                    <Suspense fallback={null}>
                      <MyopiaPage />
                    </Suspense>
                  }
                />
              )}
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<Navigate to="/patients" replace />} />
            </Route>
          </Routes>
        </PatientsDataProvider>
      </AuthGate>
    </AuthProvider>
  )
}
