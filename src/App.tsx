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

export default function App() {
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
