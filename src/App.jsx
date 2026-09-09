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
import Calculadora from './pages/Calculadora';
import Login from './pages/Login';

import { preloadOfflineCache, syncAllOfflineData } from './lib/offlineManager';

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
    // 1. Precargar caché de clientes y tareas en localStorage
    preloadOfflineCache();

    // 2. Intentar sincronizar datos pendientes
    const triggerSync = () => syncAllOfflineData(toast);
    triggerSync();

    // 3. Escuchar reconexión a Internet
    window.addEventListener('online', triggerSync);
    window.addEventListener('focus', triggerSync);
    window.addEventListener('trigger-offline-sync', triggerSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Chequeo periódico cada 30 segundos
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', triggerSync);
      window.removeEventListener('focus', triggerSync);
      window.removeEventListener('trigger-offline-sync', triggerSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(syncInterval);
    };
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
          <Route path="/calculadora" element={<Calculadora />} />
          
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
