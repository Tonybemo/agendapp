import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Droplet, MapPin, BookOpen, Clock, Menu, X, BarChart2, Calendar as CalendarIcon, Database, ArrowLeft } from 'lucide-react';
import UniversalForm from './UniversalForm';
import './Layout.css';

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    { path: '/', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
    { path: '/calendario', label: 'Calendario Global', icon: <CalendarIcon size={20} /> },
    { path: '/tareas', label: 'Tareas Mensuales', icon: <CalendarCheck size={20} /> },
    { path: '/aquapp', label: 'Muestras y Tratamientos', icon: <Droplet size={20} /> },
    { path: '/avisomap', label: 'Avisos Mapfre', icon: <MapPin size={20} /> },
    { path: '/catalogo', label: 'Productos', icon: <BookOpen size={20} /> },
    { path: '/workapp', label: 'Resumen Jornada', icon: <Clock size={20} /> },
    { path: '/estadisticas', label: 'Estadísticas', icon: <BarChart2 size={20} /> }
  ];

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
          {navItems.map((item) => (
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

      {/* Formulario Universal Flotante */}
      <UniversalForm />
    </div>
  );
};

export default Layout;
