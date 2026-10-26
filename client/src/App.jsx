import { useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Stations from './pages/Stations.jsx';
import StationDetail from './pages/StationDetail.jsx';
import Sensors from './pages/Sensors.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Alerts from './pages/Alerts.jsx';
import Reports from './pages/Reports.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

function Shell() {
  const [navOpen, setNavOpen] = useState(false); const [dark, setDark] = useState(false);
  return <div className={dark ? 'dark' : ''}><div className="min-h-screen bg-[#f4f7f7] text-ink"><div className="flex min-h-screen"><Sidebar open={navOpen} onClose={() => setNavOpen(false)}/><div className="min-w-0 flex-1"><Navbar onMenu={() => setNavOpen(true)} dark={dark} onTheme={() => setDark(!dark)}/><main className="mx-auto max-w-[1440px] p-5 sm:p-7 lg:p-9"><Outlet/></main></div></div></div></div>;
}

function AuthPage({ children }) { return <PrivateRoute>{children}</PrivateRoute>; }
export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/>
    <Route element={<AuthPage><Shell/></AuthPage>}>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/stations" element={<Stations/>}/><Route path="/stations/:id" element={<StationDetail/>}/>
      <Route path="/sensors" element={<PrivateRoute roles={['Admin']}><Sensors/></PrivateRoute>}/>
      <Route path="/maintenance" element={<PrivateRoute roles={['Admin','Operator']}><Maintenance/></PrivateRoute>}/>
      <Route path="/alerts" element={<PrivateRoute roles={['Admin','Operator']}><Alerts/></PrivateRoute>}/>
      <Route path="/reports" element={<Reports/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Route>
  </Routes></BrowserRouter></AuthProvider>;
}
