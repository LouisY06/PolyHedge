import { useStore } from './store/useStore'
import ImportPage from './pages/ImportPage'
import Dashboard from './pages/Dashboard'

function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn)
  return isLoggedIn ? <Dashboard /> : <ImportPage />
}

export default App
