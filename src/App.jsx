import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tareas" element={<Tareasapp />} />
          <Route path="/aquapp" element={<Aquapp />} />
          <Route path="/avisomap" element={<Avisomap />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/workapp" element={<Workapp />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/gestor" element={<GestorGlobal />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
