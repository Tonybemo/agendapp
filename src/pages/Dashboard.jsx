import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Droplet, MapPin, Briefcase, BookOpen, CalendarCheck, ChevronRight, BarChart2, Calendar, LayoutDashboard, Settings } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const accessCards = [
    {
      id: 'aquapp',
      title: 'Aquapp',
      description: 'Gestión integral de muestras, torres y tratamientos.',
      icon: <Droplet size={28} color="#0284c7" />,
      path: '/aquapp',
      bgColor: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      featured: true
    },
    {
      id: 'tareas',
        adminOnly: true,
      title: 'Tareas',
      description: 'Visitas mensuales.',
      icon: <CalendarCheck size={28} color="#e11d48" />,
      path: '/tareas',
      bgColor: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
      featured: true
    },
    {
      id: 'workapp',
        adminOnly: true,
      title: 'Workapp',
      description: 'Jornada laboral y descansos.',
      icon: <Briefcase size={28} color="#7c3aed" />,
      path: '/workapp',
      bgColor: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
      featured: true
    },
    {
      id: 'avisomap',
      title: 'Avisomap',
      description: 'Registro de avisos de plagas.',
      icon: <MapPin size={24} color="#059669" />,
      path: '/avisomap',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    },
    {
      id: 'catalogo',
        adminOnly: true,
      title: 'Catálogo',
      description: 'Fichas y productos.',
      icon: <BookOpen size={24} color="#d97706" />,
      path: '/catalogo',
      bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    },
    {
      id: 'estadisticas',
        adminOnly: true,
      title: 'Estadísticas',
      description: 'Métricas globales.',
      icon: <BarChart2 size={24} color="#4f46e5" />,
      path: '/estadisticas',
      bgColor: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    },
    {
      id: 'calendario',
      title: 'Calendario',
      description: 'Agenda global.',
      icon: <Calendar size={24} color="#db2777" />,
      path: '/calendario',
      bgColor: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    }
  ];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header" style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start'}}>
        <button 
          onClick={() => navigate('/gestor')}
          style={{
            background: 'white', 
            border: '1px solid #e2e8f0', 
            borderRadius: '12px', 
            padding: '10px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            color: '#64748b',
            transition: 'all 0.2s'
          }}
          title="Gestor Global (Avanzado)"
          onMouseOver={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
        >
          <Settings size={24} />
        </button>
      </div>

      <div className="dashboard-grid">
        {accessCards.map((card) => (
          <div 
            key={card.id} 
            className={`dash-card ${card.featured ? 'featured' : ''}`} 
            onClick={() => navigate(card.path)}
          >
            <div className="dash-card-icon-wrapper" style={{ background: card.bgColor }}>
              {card.icon}
            </div>
            <div className="dash-card-content">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            {card.featured && (
              <div className="dash-card-arrow">
                <ChevronRight size={20} color="#64748b" strokeWidth={3} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
