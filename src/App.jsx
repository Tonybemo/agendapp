import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Catalogo from './pages/Catalogo';
import Aquapp from './pages/Aquapp';
import Tareasapp from './pages/Tareasapp';
import Avisomap from './pages/Avisomap';
import Workapp from './pages/Workapp';
import Dashboard from './pages/Dashboard';
import Inicio from './pages/Inicio';
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

function AppContent() {
  const toast = useToast();

  useEffect(() => {
    // Hacer el toast disponible globalmente para código fuera de componentes
    window.__toast = toast;
  }, [toast]);

  useEffect(() => {
    const syncOfflineMuestras = async () => {
      const queue = JSON.parse(localStorage.getItem('offline_muestras_queue') || '[]');
      if (queue.length > 0 && navigator.onLine) {
        console.log(`Intentando sincronizar ${queue.length} muestras offline...`);
        const { error } = await supabase.from('aquapp_muestras').insert(queue);
        if (!error) {
          localStorage.removeItem('offline_muestras_queue');
          toast.success(`Sincronización completada: ${queue.length} muestras subidas`);
          window.dispatchEvent(new CustomEvent('aquapp-refresh-data'));
        } else {
          console.error("Error sincronizando muestras offline:", error);
        }
      }
    };

    syncOfflineMuestras();
    window.addEventListener('online', syncOfflineMuestras);
    return () => window.removeEventListener('online', syncOfflineMuestras);
  }, [toast]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Public Routes (Read-only for guests) */}
          <Route path="/" element={<Inicio />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
