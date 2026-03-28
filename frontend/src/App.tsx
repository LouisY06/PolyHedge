import { useStore } from './store/useStore'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn)
  return isLoggedIn ? <Dashboard /> : <LoginPage />
}

export default App
