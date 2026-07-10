import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Dashboard from './screens/Dashboard'
import MapScreen from './screens/MapScreen'
import Plants from './screens/Plants'
import PlantDetail from './screens/PlantDetail'
import Tasks from './screens/Tasks'
import CalendarScreen from './screens/CalendarScreen'
import Inventory from './screens/Inventory'
import Settings from './screens/Settings'
import { AuthScreen, GardenGate } from './screens/Auth'
import { useAuth } from './store'
import { icons } from './components/ui'

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment">
      <div className="flex items-center gap-2.5 opacity-70">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-garden">
          {icons.leaf('h-5 w-5 text-parchment')}
        </span>
        <span className="font-display text-3xl font-semibold text-garden">GardenOS</span>
      </div>
    </div>
  )
}

export default function App() {
  const status = useAuth((s) => s.status)
  const activeGardenId = useAuth((s) => s.activeGardenId)
  const boot = useAuth((s) => s.boot)

  useEffect(() => {
    void boot()
  }, [boot])

  if (status === 'booting') return <Splash />
  if (status === 'anon') return <AuthScreen />
  if (!activeGardenId) return <GardenGate />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapScreen />} />
          <Route path="plants" element={<Plants />} />
          <Route path="plants/:id" element={<PlantDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<CalendarScreen />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
