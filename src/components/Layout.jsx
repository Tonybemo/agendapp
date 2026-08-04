import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Droplet, MapPin, BookOpen, Clock, Menu, X, BarChart2, Calendar as CalendarIcon, Database, ArrowLeft, LogOut, LogIn } from 'lucide-react';
import UniversalForm from './UniversalForm';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', label: 'Inicio', icon: <LayoutDashboard size={20} />, public: true },
    { path: '/calendario', label: 'Calendario Global', icon: <CalendarIcon size={20} />, public: true },
    { path: '/aquapp', label: 'Muestras y Tratamientos', icon: <Droplet size={20} />, public: true },
    { path: '/avisomap', label: 'Avisos Mapfre', icon: <MapPin size={20} />, public: true },
    { path: '/tareas', label: 'Tareas Mensuales', icon: <CalendarCheck size={20} />, public: false },
    { path: '/catalogo', label: 'Productos', icon: <BookOpen size={20} />, public: false },
    { path: '/workapp', label: 'Resumen Jornada', icon: <Clock size={20} />, public: false },
    { path: '/estadisticas', label: 'Estadísticas', icon: <BarChart2 size={20} />, public: false },
    { path: '/gestor', label: 'Gestor Global', icon: <Database size={20} />, public: false }
  ];

  const visibleNavItems = isAdmin ? navItems : navItems.filter(item => item.public);

  // Mobile Bottom Nav items (just a few core ones)
  const bottomNavItems = [
    { path: '/', label: 'Inicio', icon: <LayoutDashboard size={24} /> },
    { path: '/calendario', label: 'Calendario', icon: <CalendarIcon size={24} /> },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="layout-container">
      {/* Mobile Top Bar */}
      {isMobile && (
        <header className="mobile-header">
          {location.pathname !== '/' ? (
            <button onClick={() => navigate(-1)} style={{background: 'none', border: 'none', color: '#1e293b', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="logo-container">
              <div className="logo-icon">A</div>
              <h1 style={{margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b'}}>Agendapp</h1>
            </div>
          )}
          
          <button className="menu-btn" onClick={toggleSidebar}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
      )}

      {/* Sidebar (Desktop or Mobile Drawer) */}
      <aside className={`sidebar ${isMobile ? 'mobile-sidebar' : 'desktop-sidebar'} ${sidebarOpen ? 'open' : ''}`}>
        {!isMobile && (
          <div className="sidebar-header">
            <div className="logo-icon">A</div>
            <h2>Agendapp</h2>
          </div>
        )}
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div style={{ padding: '20px', marginTop: 'auto' }}>
          {isAdmin ? (
            <button 
              onClick={() => { signOut(); isMobile && setSidebarOpen(false); navigate('/'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <button 
              onClick={() => { isMobile && setSidebarOpen(false); navigate('/login'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              <LogIn size={20} />
              <span>Acceso Admin</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="bottom-nav">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Formulario Universal Flotante (Solo Admin) */}
      {isAdmin && <UniversalForm />}
      {!isAdmin && <style>{`.admin-only { display: none !important; }`}</style>}
    </div>
  );
};

export default Layout;
