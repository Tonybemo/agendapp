import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Catalogo from './pages/Catalogo';
import Aquapp from './pages/Aquapp';
import Tareasapp from './pages/Tareasapp';
import Avisomap from './pages/Avisomap';
import Workapp from './pages/Workapp';
import Dashboard from './pages/Dashboard';
import Estadisticas from './pages/Estadisticas';
import Calendario from './pages/Calendario';
import GestorGlobal from './pages/GestorGlobal';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Public Routes (Read-only for guests) */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/aquapp" element={<Aquapp />} />
            <Route path="/avisomap" element={<Avisomap />} />
            <Route path="/calendario" element={<Calendario />} />
            
            {/* Private Routes (Admin only) */}
            <Route path="/tareas" element={<ProtectedRoute><Tareasapp /></ProtectedRoute>} />
            <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
            <Route path="/workapp" element={<ProtectedRoute><Workapp /></ProtectedRoute>} />
            <Route path="/estadisticas" element={<ProtectedRoute><Estadisticas /></ProtectedRoute>} />
            <Route path="/gestor" element={<ProtectedRoute><GestorGlobal /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
