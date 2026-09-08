import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import './layout.css'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
