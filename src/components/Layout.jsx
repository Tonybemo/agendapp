import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Droplet, MapPin, BookOpen, Clock, Menu, X, BarChart2, Calendar as CalendarIcon, Database, ArrowLeft, LogOut, LogIn, Bell } from 'lucide-react';
import UniversalForm from './UniversalForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Layout.css';

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
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

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('aquapp_tratamientos')
        .select('*')
        .eq('recordatorio', true);
      
      if (data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pending = data.filter(t => {
          if (!t.fecha) return false;
          let f = t.fecha;
          if (f.includes('/')) {
            const parts = f.split('/');
            f = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          const treatDate = new Date(f);
          const dias = t.recordatorio_dias || 15;
          const dueDate = new Date(treatDate);
          dueDate.setDate(dueDate.getDate() + dias);
          return dueDate <= today;
        });
        setNotifications(pending);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
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
          
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <div style={{position: 'relative'}}>
              <button 
                className="notif-bell-btn"
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                style={{background: 'none', border: 'none', cursor: 'pointer', padding: '8px', position: 'relative'}}
              >
                <Bell size={22} color="#64748b" />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    background: '#ef4444', color: 'white', borderRadius: '999px',
                    fontSize: '0.65rem', fontWeight: '800', minWidth: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1
                  }}>{notifications.length}</span>
                )}
              </button>
            </div>
            <button className="menu-btn" onClick={toggleSidebar}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
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
        
        <div style={{padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              background: notifications.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              border: 'none', borderRadius: '12px', padding: '12px',
              cursor: 'pointer', color: notifications.length > 0 ? '#ef4444' : '#94a3b8',
              fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s'
            }}
          >
            <div style={{position: 'relative'}}>
              <Bell size={20} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-6px',
                  background: '#ef4444', color: 'white', borderRadius: '999px',
                  fontSize: '0.6rem', fontWeight: '800', minWidth: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px'
                }}>{notifications.length}</span>
              )}
            </div>
            <span>Recordatorios</span>
          </button>
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

      {showNotifPanel && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowNotifPanel(false)}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '24px',
            width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '1.2rem', fontWeight: '800', color: '#0f172a'}}>🔔 Recordatorios de Muestras</h2>
              <button onClick={() => setShowNotifPanel(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8'}}>&times;</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px 20px', color: '#94a3b8'}}>
                <Bell size={40} style={{marginBottom: '12px', opacity: 0.4}} />
                <p style={{fontWeight: '600'}}>No hay recordatorios pendientes</p>
                <p style={{fontSize: '0.85rem'}}>Cuando un tratamiento cumpla el plazo de muestras, aparecerá aquí.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {notifications.map((n, i) => {
                  let f = n.fecha;
                  if (f && f.includes('/')) {
                    const parts = f.split('/');
                    f = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
                  const treatDate = new Date(f);
                  const dueDate = new Date(treatDate);
                  dueDate.setDate(dueDate.getDate() + (n.recordatorio_dias || 15));
                  const diasPasados = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={n.id || i} style={{
                      padding: '16px', borderRadius: '14px',
                      background: '#fef2f2', border: '1px solid #fecaca',
                      borderLeft: '4px solid #ef4444'
                    }}>
                      <div style={{fontWeight: '700', color: '#0f172a', marginBottom: '4px'}}>
                        {n.cliente_nombre || 'Cliente'}
                      </div>
                      <div style={{fontSize: '0.82rem', color: '#475569', marginBottom: '6px'}}>
                        Tratamiento: <strong>{n.tipo_tratamiento}</strong> — {n.fecha}
                      </div>
                      <div style={{fontSize: '0.78rem', color: '#ef4444', fontWeight: '700'}}>
                        ⚠️ Muestra pendiente desde hace {diasPasados} día{diasPasados !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
