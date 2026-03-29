import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import LandingPage from './pages/LandingPage'
import ImportPage from './pages/ImportPage'
import GmailPreviewPage from './pages/GmailPreviewPage'
import Dashboard from './pages/Dashboard'

function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn)

  if (isLoggedIn) {
    return (
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/gmail-preview" element={<GmailPreviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
