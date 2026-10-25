import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Droplet, MapPin, BookOpen, Clock, Menu, X, BarChart2, Calendar as CalendarIcon, Database, ArrowLeft, LogOut, LogIn, Bell, CheckCircle2, Moon, Sun, Calculator, QrCode, Type } from 'lucide-react';
import UniversalForm from './UniversalForm';
import OfflineBanner from './OfflineBanner';
import BarcodeScannerModal from './BarcodeScannerModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './Layout.css';

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', desc: 'Neutra y equilibrada (Original)', family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
  { id: 'jakarta', name: 'Plus Jakarta Sans', desc: 'Moderna, nítida y elegante', family: "'Plus Jakarta Sans', sans-serif" },
  { id: 'outfit', name: 'Outfit', desc: 'Redondeada, suave y muy legible en móvil', family: "'Outfit', sans-serif" },
  { id: 'poppins', name: 'Poppins', desc: 'Con más cuerpo y presencia en títulos', family: "'Poppins', sans-serif" },
  { id: 'montserrat', name: 'Montserrat', desc: 'Geométrica clásica con carácter', family: "'Montserrat', sans-serif" },
  { id: 'space', name: 'Space Grotesk', desc: 'Estilo técnico de laboratorio y analíticas', family: "'Space Grotesk', sans-serif" },
  { id: 'jetbrains', name: 'JetBrains Mono', desc: 'Pantalla digital / consola de instrumentos', family: "'JetBrains Mono', monospace" },
  { id: 'merriweather', name: 'Merriweather', desc: 'Estilo editorial clásico (con serifa)', family: "'Merriweather', serif" },
];

const FONT_SIZE_OPTIONS = [
  { id: 'small', label: 'Compacto', sub: '90%' },
  { id: 'normal', label: 'Normal', sub: '100%' },
  { id: 'large', label: 'Grande', sub: '110%' },
  { id: 'xlarge', label: 'Extra', sub: '120%' },
];

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showResueltos, setShowResueltos] = useState(false);
  const [showGlobalScanner, setShowGlobalScanner] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();

  useEffect(() => {
    const handleOpenQr = () => setShowGlobalScanner(true);
    window.addEventListener('open-qr-scanner', handleOpenQr);
    return () => window.removeEventListener('open-qr-scanner', handleOpenQr);
  }, []);

  // Dark mode state with localStorage persistence
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('agendapp-theme');
    return saved === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('agendapp-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Font family & font size state with localStorage persistence
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('agendapp-font') || 'inter';
  });

  const [selectedFontSize, setSelectedFontSize] = useState(() => {
    return localStorage.getItem('agendapp-font-size') || 'normal';
  });

  useEffect(() => {
    const fontObj = FONT_OPTIONS.find(f => f.id === selectedFont) || FONT_OPTIONS[0];
    document.documentElement.style.setProperty('--font-main', fontObj.family);
    localStorage.setItem('agendapp-font', selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', selectedFontSize);
    localStorage.setItem('agendapp-font-size', selectedFontSize);
  }, [selectedFontSize]);

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
    let clean = f;
    if (clean.includes('T')) clean = clean.split('T')[0];
    if (clean.includes('/')) {
      const parts = clean.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return clean;
  };

  const getDiasPasados = (n) => {
    if (!n || !n.fecha) return 0;
    const f = parseFecha(n.fecha);
    const treatDate = new Date(f);
    const dueDate = new Date(treatDate);
    dueDate.setDate(dueDate.getDate() + (n.recordatorio_dias || 15));
    return Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('aquapp_tratamientos')
      .select('*')
      .eq('recordatorio', true)
      .order('fecha', { ascending: false });
    
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

  const pendingNotifications = allNotifications
    .filter(n => !n.muestra_recogida)
    .sort((a, b) => {
      const fa = parseFecha(a.fecha);
      const fb = parseFecha(b.fecha);
      return new Date(fa) - new Date(fb);
    });

  // Solo mostrar resueltos en los últimos 60 días para no saturar
  const resolvedNotifications = allNotifications
    .filter(n => {
      if (!n.muestra_recogida) return false;
      const dias = getDiasPasados(n);
      return dias <= 60;
    })
    .sort((a, b) => {
      const fa = parseFecha(a.fecha);
      const fb = parseFecha(b.fecha);
      return new Date(fb) - new Date(fa);
    });

  const handleMarkCollected = async (id) => {
    await supabase.from('aquapp_tratamientos').update({ muestra_recogida: true }).eq('id', id);
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, muestra_recogida: true } : n));
  };

  const handleUnmarkCollected = async (id) => {
    await supabase.from('aquapp_tratamientos').update({ muestra_recogida: false }).eq('id', id);
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, muestra_recogida: false } : n));
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, public: true },
    { path: '/calendario', label: 'Calendario Global', icon: <CalendarIcon size={20} />, public: true },
    { path: '/aquapp', label: 'Muestras y Tratamientos', icon: <Droplet size={20} />, public: true },
    { path: '/avisomap', label: 'Avisos Mapfre', icon: <MapPin size={20} />, public: true },
    { path: '/calculadora', label: 'Calculadora Técnica', icon: <Calculator size={20} />, public: true },
    { path: '/tareas', label: 'Tareas Mensuales', icon: <CalendarCheck size={20} />, public: false },
    { path: '/catalogo', label: 'Productos', icon: <BookOpen size={20} />, public: false },
    { path: '/workapp', label: 'Resumen Jornada', icon: <Clock size={20} />, public: false },
    { path: '/estadisticas', label: 'Estadísticas', icon: <BarChart2 size={20} />, public: false },
    { path: '/gestor', label: 'Gestor Global', icon: <Database size={20} />, public: false }
  ];

  const visibleNavItems = isAdmin ? navItems : navItems.filter(item => item.public);

  const bottomNavItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
    { path: '/aquapp', label: 'Aquapp', icon: <Droplet size={24} /> },
    { path: '/calculadora', label: 'Calculadora', icon: <Calculator size={24} /> },
    { path: '/calendario', label: 'Calendario', icon: <CalendarIcon size={24} /> },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const ScannerButton = ({ size = 22 }) => (
    <button 
      type="button"
      onClick={() => setShowGlobalScanner(true)}
      style={{
        background: 'none', 
        border: 'none', 
        cursor: 'pointer', 
        padding: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--text-secondary)'
      }}
      title="Lector QR y Código de Barras (Google Sheets, Forms, etc.)"
    >
      <QrCode size={size} />
    </button>
  );

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
    const diasPasados = getDiasPasados(n);

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
            {n.tipo_tratamiento} · {isPending ? `Hace ${diasPasados} día${diasPasados !== 1 ? 's' : ''}` : `Recogido · Hace ${diasPasados} día${diasPasados !== 1 ? 's' : ''}`}
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
          
          <div style={{display: 'flex', alignItems: 'center', gap: '2px'}}>
            <ScannerButton size={22} />
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
            <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px'}}>
              <ScannerButton size={20} />
              <BellButton size={20} />
            </div>
          </div>
        )}
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div style={{ padding: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Selector de Fuente y Tamaño */}
          <button 
            onClick={() => { setShowFontModal(true); isMobile && setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px',
              background: 'var(--bg-card-hover)',
              color: 'var(--text-muted)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600',
              transition: 'all var(--transition-normal)'
            }}
          >
            <Type size={20} />
            <span>Fuente y Tamaño</span>
          </button>

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
              end={item.path === '/'}
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

      {/* Banner flotante de Modo Offline y Sincronización */}
      <OfflineBanner />

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
                  {showResueltos ? '▾' : '▸'} {showResueltos ? 'Ocultar' : 'Mostrar'} resueltos últimos 60 días ({resolvedNotifications.length})
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

      {/* Modal Lector QR / Código de Barras Global */}
      <BarcodeScannerModal
        isOpen={showGlobalScanner}
        onClose={() => setShowGlobalScanner(false)}
        mode="general"
        title="Lector QR y Código de Barras"
      />

      {/* Modal de Tipografía y Tamaño de Letra */}
      {showFontModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '16px'
        }} onClick={() => setShowFontModal(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px',
            width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Type size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Apariencia de Texto</h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Elige la fuente y el tamaño para toda la app</p>
                </div>
              </div>
              <button onClick={() => setShowFontModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-faint)', lineHeight: 1 }}>&times;</button>
            </div>

            {/* Selector de Tamaño */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Tamaño de letra
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {FONT_SIZE_OPTIONS.map(sizeOpt => {
                  const active = selectedFontSize === sizeOpt.id;
                  return (
                    <button
                      key={sizeOpt.id}
                      onClick={() => setSelectedFontSize(sizeOpt.id)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary-light)' : 'var(--bg-body)',
                        color: active ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: active ? '800' : '600',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem' }}>{sizeOpt.label}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>{sizeOpt.scale}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Fuente */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Tipografía (8 fuentes)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {FONT_OPTIONS.map(font => {
                  const active = selectedFont === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font.id)}
                      style={{
                        fontFamily: font.family,
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary-light)' : 'var(--bg-body)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: '700', color: active ? 'var(--primary)' : 'var(--text-main)' }}>
                            {font.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            · {font.desc}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Orovalle Mina Boinas · 0,46 mS = 460 µS/cm · 123456
                        </div>
                      </div>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: active ? '6px solid var(--primary)' : '2px solid var(--border)',
                        background: 'var(--bg-card)', flexShrink: 0
                      }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowFontModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
