import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Droplet, MapPin, BookOpen, Clock, Menu, X, BarChart2, Calendar as CalendarIcon, Database, ArrowLeft, LogOut, LogIn, Bell, CheckCircle2, Moon, Sun } from 'lucide-react';
import UniversalForm from './UniversalForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Layout.css';

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showResueltos, setShowResueltos] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();

  // Dark mode state with localStorage persistence
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('agendapp-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('agendapp-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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

  const parseFecha = (f) => {
    if (!f) return null;
    if (f.includes('/')) {
      const parts = f.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return f;
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('aquapp_tratamientos')
      .select('*')
      .eq('recordatorio', true);
    
    if (data) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = data.filter(t => {
        if (!t.fecha) return false;
        const f = parseFecha(t.fecha);
        const treatDate = new Date(f);
        const dias = t.recordatorio_dias || 15;
        const dueDate = new Date(treatDate);
        dueDate.setDate(dueDate.getDate() + dias);
        return dueDate <= today;
      });
      setAllNotifications(due);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const pendingNotifications = allNotifications.filter(n => !n.muestra_recogida);
  const resolvedNotifications = allNotifications.filter(n => n.muestra_recogida);

  const handleMarkCollected = async (id) => {
    await supabase.from('aquapp_tratamientos').update({ muestra_recogida: true }).eq('id', id);
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, muestra_recogida: true } : n));
  };

  const handleUnmarkCollected = async (id) => {
    await supabase.from('aquapp_tratamientos').update({ muestra_recogida: false }).eq('id', id);
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, muestra_recogida: false } : n));
  };

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

  const bottomNavItems = [
    { path: '/', label: 'Dashboard', icon: <BarChart2 size={24} /> },
    { path: '/inicio', label: 'Inicio', icon: <LayoutDashboard size={24} /> },
    { path: '/calendario', label: 'Calendario', icon: <CalendarIcon size={24} /> },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const BellButton = ({ size = 22 }) => (
    <button 
      onClick={() => setShowNotifPanel(!showNotifPanel)}
      style={{background: 'none', border: 'none', cursor: 'pointer', padding: '8px', position: 'relative'}}
    >
      <Bell size={size} color={pendingNotifications.length > 0 ? 'var(--color-error)' : 'var(--text-muted)'} />
      {pendingNotifications.length > 0 && (
        <span style={{
          position: 'absolute', top: '0px', right: '0px',
          background: 'var(--color-error)', color: 'var(--text-on-primary)', borderRadius: 'var(--radius-pill)',
          fontSize: '0.6rem', fontWeight: '800', minWidth: '18px', height: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', lineHeight: 1
        }}>{pendingNotifications.length}</span>
      )}
    </button>
  );

  const renderNotifCard = (n, isPending) => {
    const f = parseFecha(n.fecha);
    const treatDate = new Date(f);
    const dueDate = new Date(treatDate);
    dueDate.setDate(dueDate.getDate() + (n.recordatorio_dias || 15));
    const diasPasados = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));

    return (
      <div key={n.id} style={{
        padding: '14px 16px', borderRadius: 'var(--radius-md)',
        background: isPending ? 'var(--color-error-light)' : 'var(--color-success-light)',
        border: `1px solid ${isPending ? 'var(--color-error-border)' : 'var(--color-success-border)'}`,
        borderLeft: `4px solid ${isPending ? 'var(--color-error)' : 'var(--color-success)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
      }}>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px', fontSize: '0.92rem'}}>
            {n.cliente_nombre || 'Cliente'}
          </div>
          <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
            {n.tipo_tratamiento} · Hace {diasPasados} día{diasPasados !== 1 ? 's' : ''}
          </div>
        </div>
        {isPending ? (
          <button 
            onClick={() => handleMarkCollected(n.id)}
            style={{
              background: 'var(--color-success)', color: 'var(--text-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)',
              padding: '8px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0
            }}
          >
            <CheckCircle2 size={16} /> Listo
          </button>
        ) : (
          <button 
            onClick={() => handleUnmarkCollected(n.id)}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
              width: '32px', height: '32px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-faint)',
              fontSize: '0.85rem'
            }}
            title="Desmarcar"
          >
            ↺
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="layout-container">
      {/* Mobile Top Bar */}
      {isMobile && (
        <header className="mobile-header">
          {location.pathname !== '/' ? (
            <button onClick={() => navigate(-1)} style={{background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div className="logo-container">
              <div className="logo-icon">A</div>
              <h1 style={{margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)'}}>Agendapp</h1>
            </div>
          )}
          
          <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
            <BellButton size={22} />
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
            <div style={{marginLeft: 'auto'}}>
              <BellButton size={20} />
            </div>
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
        
        <div style={{ padding: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Dark Mode Toggle */}
          <button 
            onClick={() => setIsDark(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px',
              background: isDark ? 'var(--bg-card-hover)' : 'var(--bg-card-hover)',
              color: 'var(--text-muted)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600',
              transition: 'all var(--transition-normal)'
            }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          {isAdmin ? (
            <button 
              onClick={() => { signOut(); isMobile && setSidebarOpen(false); navigate('/'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'var(--color-error-light)', color: 'var(--color-error)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600' }}
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <button 
              onClick={() => { isMobile && setSidebarOpen(false); navigate('/login'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600' }}
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

      {/* Panel de Notificaciones */}
      {showNotifPanel && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowNotifPanel(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px',
            width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)'}}>🔔 Avisos de Muestra</h2>
              <button onClick={() => setShowNotifPanel(false)} style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-faint)'}}>&times;</button>
            </div>

            {/* Pendientes */}
            {pendingNotifications.length === 0 ? (
              <div style={{textAlign: 'center', padding: '24px 16px', color: 'var(--color-success)', background: 'var(--color-success-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px'}}>
                <p style={{fontWeight: '700', fontSize: '0.95rem', margin: 0}}>Sin pendientes.</p>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px'}}>
                {pendingNotifications.map(n => renderNotifCard(n, true))}
              </div>
            )}

            {/* Resueltos */}
            {resolvedNotifications.length > 0 && (
              <div>
                <button 
                  onClick={() => setShowResueltos(!showResueltos)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 0', width: '100%'
                  }}
                >
                  {showResueltos ? '▾' : '▸'} {showResueltos ? 'Ocultar' : 'Mostrar'} resueltos ({resolvedNotifications.length})
                </button>
                {showResueltos && (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px'}}>
                    {resolvedNotifications.map(n => renderNotifCard(n, false))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
