import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Bug, Mouse, ShieldAlert, CalendarClock, Plus, 
  CheckCircle2, AlertTriangle, BookOpen, FileText, Edit3, 
  Trash2, X, Package, Target, Layers, FlaskConical, ExternalLink,
  Calendar, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Catalogo.css';

const CATEGORIES_DEF = [
  {
    id: 'todos',
    title: 'Todos',
    icon: BookOpen,
    color: '#4f46e5',
    bgBadge: '#ede9fe',
    badgeText: '#4338ca'
  },
  {
    id: 'insecticidas',
    title: 'Insecticidas',
    icon: Bug,
    color: '#10b981',
    bgBadge: '#d1fae5',
    badgeText: '#065f46',
    veil: 'linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(209, 250, 229, 0.6))',
    border: '#a7f3d0'
  },
  {
    id: 'rodenticidas',
    title: 'Rodenticidas',
    icon: Mouse,
    color: '#f59e0b',
    bgBadge: '#fef3c7',
    badgeText: '#92400e',
    veil: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(253, 230, 138, 0.6))',
    border: '#fde68a'
  },
  {
    id: 'biocidas',
    title: 'Biocidas y Otros',
    icon: ShieldAlert,
    color: '#0ea5e9',
    bgBadge: '#e0f2fe',
    badgeText: '#075985',
    veil: 'linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(186, 230, 253, 0.6))',
    border: '#bae6fd'
  },
  {
    id: 'caducar',
    title: 'Próx. a Caducar',
    icon: CalendarClock,
    color: '#ef4444',
    bgBadge: '#fee2e2',
    badgeText: '#991b1b',
    veil: 'linear-gradient(135deg, rgba(254, 226, 226, 0.95), rgba(254, 205, 211, 0.6))',
    border: '#fecaca'
  }
];

const Catalogo = () => {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState({});

  useEffect(() => {
    fetchProducts();
    
    const handleRefresh = () => fetchProducts();
    window.addEventListener('refresh-catalogo', handleRefresh);
    
    return () => {
      window.removeEventListener('refresh-catalogo', handleRefresh);
    };
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });
      
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      const mapped = (data || []).map(p => ({
        id: p.id,
        name: p.nombre,
        categoryId: p.categoria_id,
        image: p.image_url,
        materiaActiva: p.materia_activa,
        plagaDiana: p.plaga_diana,
        metodoAplicacion: p.metodo_aplicacion,
        caducidad: p.caducidad,
        registro: p.registro,
        plazoSeguridad: p.plazo_seguridad,
        lote: p.lote,
        hasWarning: p.has_warning || (p.plazo_seguridad && p.plazo_seguridad.toLowerCase() !== 'no aplica' && p.plazo_seguridad !== '0'),
        badge: p.badge || 'PRO',
        pdfUrl: p.ficha_sds_url || p.pdf_url
      }));
      setProducts(mapped);
    }
    setLoading(false);
  };

  const isExpiringSoon = (caducidadStr) => {
    if (!caducidadStr) return false;
    let expDate = null;
    if (caducidadStr.includes('-')) {
      expDate = new Date(caducidadStr);
    } else if (caducidadStr.includes('/')) {
      const parts = caducidadStr.split('/');
      if (parts.length === 2) {
        expDate = new Date(parseInt(parts[1], 10), parseInt(parts[0], 10), 0);
      } else if (parts.length === 3) {
        expDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    if (!expDate || isNaN(expDate.getTime())) return false;
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expDate <= in30Days;
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      todos: products.length,
      insecticidas: 0,
      rodenticidas: 0,
      biocidas: 0,
      caducar: 0
    };

    products.forEach(p => {
      if (p.categoryId && counts[p.categoryId] !== undefined) {
        counts[p.categoryId]++;
      }
      if (isExpiringSoon(p.caducidad)) {
        counts.caducar++;
      }
    });

    return counts;
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory === 'caducar') {
      list = list.filter(p => isExpiringSoon(p.caducidad));
    } else if (selectedCategory !== 'todos') {
      list = list.filter(p => p.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.materiaActiva || '').toLowerCase().includes(q) ||
        (p.lote || '').toLowerCase().includes(q) ||
        (p.registro || '').toLowerCase().includes(q) ||
        (p.plagaDiana || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, selectedCategory, searchQuery]);

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    setIsSavingProduct(true);
    const { error } = await supabase.from('productos').update({
      nombre: editingProduct.name,
      badge: editingProduct.badge,
      registro: editingProduct.registro,
      lote: editingProduct.lote,
      materia_activa: editingProduct.materiaActiva,
      plaga_diana: editingProduct.plagaDiana,
      metodo_aplicacion: editingProduct.metodoAplicacion,
      caducidad: editingProduct.caducidad,
      plazo_seguridad: editingProduct.plazoSeguridad,
      has_warning: editingProduct.hasWarning
    }).eq('id', editingProduct.id);
    
    setIsSavingProduct(false);
    if (!error) {
      setSelectedProduct(editingProduct);
      setEditingProduct(null);
      fetchProducts();
      window.__toast?.success("Producto actualizado correctamente");
    } else {
      window.__toast?.error("Error al guardar el producto");
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este producto del catálogo?')) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) {
        if (selectedProduct && selectedProduct.id === id) {
          setSelectedProduct(null);
        }
        fetchProducts();
        window.__toast?.success("Producto eliminado");
      } else {
        window.__toast?.error("Error al eliminar: " + error.message);
      }
    }
  };

  const getCategoryTheme = (catId, caducidad) => {
    if (isExpiringSoon(caducidad)) {
      return CATEGORIES_DEF.find(c => c.id === 'caducar');
    }
    const found = CATEGORIES_DEF.find(c => c.id === catId);
    return found || CATEGORIES_DEF[1];
  };

  return (
    <div className="cat-container animate-fade-in">
      {/* 1. Header principal */}
      <div className="cat-header-block">
        <div className="cat-title-group">
          <div className="cat-icon-badge">
            <BookOpen size={26} color="#ffffff" />
          </div>
          <div>
            <h1>Catálogo de Productos</h1>
            <p>Fichas técnicas, registros oficiales, lotes y plazos de seguridad</p>
          </div>
        </div>

        {/* Buscador integrado */}
        <div className="cat-search-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por producto, materia activa, lote o registro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="cat-search-clear"
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Píldoras de Categoría */}
      <div className="cat-pills-row">
        {CATEGORIES_DEF.map(cat => {
          const Icon = cat.icon;
          const count = categoryCounts[cat.id] || 0;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill ${isActive ? `active cat-${cat.id}` : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <Icon size={16} />
              <span>{cat.title}</span>
              <span className={`cat-pill-badge ${cat.id === 'caducar' && count > 0 ? 'badge-alert' : ''}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Barra de resumen y métricas */}
      <div className="cat-toolbar-metrics">
        <span className="cat-metrics-count">
          Mostrando <strong>{filteredProducts.length}</strong> de {products.length} productos
        </span>

        {selectedCategory === 'caducar' && categoryCounts.caducar > 0 && (
          <span className="cat-warning-chip">
            <AlertTriangle size={14} /> {categoryCounts.caducar} productos con caducidad próxima o vencida
          </span>
        )}
      </div>

      {/* 4. Cuadrícula Bento de Tarjetas de Producto */}
      {loading ? (
        <div className="cat-empty-state">
          <p>Cargando catálogo de productos...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="cat-empty-state animate-fade-in">
          <BookOpen size={44} color="var(--text-faint)" />
          <h3>No se encontraron productos</h3>
          <p>
            {searchQuery 
              ? `No hay coincidencias para "${searchQuery}". Prueba con otro término.` 
              : 'No hay productos en esta categoría. Puedes añadir nuevos productos desde el botón central (+).'}
          </p>
        </div>
      ) : (
        <div className="cat-cards-grid animate-fade-in">
          {filteredProducts.map(prod => {
            const theme = getCategoryTheme(prod.categoryId, prod.caducidad);
            const expiring = isExpiringSoon(prod.caducidad);
            const hasImgError = imageErrorMap[prod.id];
            const showImg = prod.image && !hasImgError;

            return (
              <div key={prod.id} className="cat-card">
                {/* Cabecera con Velo de Color y Foto del Producto */}
                <div 
                  className="cat-card-top"
                  style={{ background: theme.veil, borderBottom: `1px solid ${theme.border}` }}
                >
                  <div className="cat-top-layout">
                    {/* Contenedor de la Foto del Producto */}
                    <div 
                      className="cat-thumb-box"
                      onClick={() => setSelectedProduct(prod)}
                      title="Ver detalle del producto"
                    >
                      {showImg ? (
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="cat-thumb-img" 
                          onError={() => setImageErrorMap(prev => ({ ...prev, [prod.id]: true }))}
                        />
                      ) : (
                        <div 
                          className="cat-thumb-placeholder" 
                          style={{ background: theme.bgBadge, color: theme.badgeText }}
                        >
                          {prod.name ? prod.name.charAt(0).toUpperCase() : 'P'}
                        </div>
                      )}
                    </div>

                    {/* Información Principal */}
                    <div className="cat-top-info">
                      <div className="cat-badges-row">
                        <span 
                          className="cat-badge-cat" 
                          style={{ background: theme.bgBadge, color: theme.badgeText }}
                        >
                          {theme.title}
                        </span>
                        {prod.badge && (
                          <span className="cat-badge-tag">{prod.badge}</span>
                        )}
                        {expiring && (
                          <span className="cat-badge-expiring">
                            <CalendarClock size={11} /> ¡Caduca pronto!
                          </span>
                        )}
                      </div>
                      
                      <h3 
                        className="cat-prod-title" 
                        onClick={() => setSelectedProduct(prod)}
                        title="Ver detalle del producto"
                      >
                        {prod.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Cuerpo de la Tarjeta con Chips Técnicos */}
                <div className="cat-card-body">
                  {/* Materia Activa */}
                  {prod.materiaActiva && (
                    <div className="cat-field-row">
                      <span className="cat-field-icon"><FlaskConical size={14} color="#0284c7" /></span>
                      <div className="cat-field-content">
                        <span className="cat-field-label">Materia Activa</span>
                        <strong className="cat-field-val">{prod.materiaActiva}</strong>
                      </div>
                    </div>
                  )}

                  {/* Plaga Diana */}
                  {prod.plagaDiana && (
                    <div className="cat-field-row">
                      <span className="cat-field-icon"><Target size={14} color="#e11d48" /></span>
                      <div className="cat-field-content">
                        <span className="cat-field-label">Plaga Diana</span>
                        <span className="cat-field-text">{prod.plagaDiana}</span>
                      </div>
                    </div>
                  )}

                  {/* Método de Aplicación */}
                  {prod.metodoAplicacion && (
                    <div className="cat-field-row">
                      <span className="cat-field-icon"><Layers size={14} color="#7c3aed" /></span>
                      <div className="cat-field-content">
                        <span className="cat-field-label">Aplicación</span>
                        <span className="cat-field-text">{prod.metodoAplicacion}</span>
                      </div>
                    </div>
                  )}

                  {/* Grid de 2 Columnas para Lote y Registro */}
                  <div className="cat-meta-grid">
                    {prod.lote && (
                      <div className="cat-meta-pill">
                        <span className="meta-k">Lote</span>
                        <strong className="meta-v">{prod.lote}</strong>
                      </div>
                    )}
                    {prod.registro && (
                      <div className="cat-meta-pill">
                        <span className="meta-k">Nº Reg.</span>
                        <strong className="meta-v">{prod.registro}</strong>
                      </div>
                    )}
                  </div>

                  {/* Caducidad y Plazo de Seguridad */}
                  <div className="cat-safety-row">
                    {prod.caducidad && (
                      <div className={`cat-caducidad-chip ${expiring ? 'alert' : ''}`}>
                        <Calendar size={13} />
                        <span>Cad: <strong>{prod.caducidad}</strong></span>
                      </div>
                    )}

                    <div className={`cat-plazo-chip ${prod.hasWarning ? 'warning' : 'safe'}`}>
                      {prod.hasWarning ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                      <span>Plazo: <strong>{prod.plazoSeguridad || 'No aplica'}</strong></span>
                    </div>
                  </div>

                  {/* Pie de Tarjeta: Adjunto SDS + Acciones */}
                  <div className="cat-card-footer">
                    <div>
                      {prod.pdfUrl ? (
                        <a 
                          href={prod.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="cat-btn-sds"
                          title="Abrir Ficha de Datos de Seguridad (PDF)"
                        >
                          <FileText size={14} /> Ficha SDS
                        </a>
                      ) : (
                        <span className="cat-no-sds">Sin Ficha</span>
                      )}
                    </div>

                    <div className="cat-card-actions">
                      <button 
                        type="button" 
                        className="cat-action-icon view"
                        onClick={() => setSelectedProduct(prod)}
                        title="Ver ficha completa"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        type="button" 
                        className="cat-action-icon edit"
                        onClick={() => setEditingProduct(prod)}
                        title="Editar producto"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        type="button" 
                        className="cat-action-icon delete"
                        onClick={() => deleteProduct(prod.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: DETALLE COMPLETO DEL PRODUCTO                         */}
      {/* ────────────────────────────────────────────────────────────── */}
      {selectedProduct && (
        <div className="cat-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="cat-modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="cat-modal-header">
              <div className="cat-modal-title-row">
                <h2>{selectedProduct.name}</h2>
                <button 
                  type="button" 
                  className="cat-btn-close" 
                  onClick={() => setSelectedProduct(null)}
                >
                  <X size={22} />
                </button>
              </div>
              <div className="cat-modal-badges">
                <span className="cat-badge-cat-modal">{selectedProduct.badge}</span>
                <span className="cat-modal-reg">Reg: {selectedProduct.registro}</span>
                <span className="cat-modal-lote">Lote: {selectedProduct.lote}</span>
              </div>
            </div>

            <div className="cat-modal-body">
              {/* Foto destacada si existe */}
              {selectedProduct.image && (
                <div className="cat-modal-img-wrap">
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="cat-modal-img" />
                </div>
              )}

              <div className="cat-modal-grid">
                <div className="cat-modal-field">
                  <span className="lbl">MATERIA ACTIVA</span>
                  <strong className="val">{selectedProduct.materiaActiva || 'No especificada'}</strong>
                </div>

                <div className="cat-modal-field">
                  <span className="lbl">PLAGA DIANA</span>
                  <strong className="val">{selectedProduct.plagaDiana || 'No especificada'}</strong>
                </div>

                <div className="cat-modal-field">
                  <span className="lbl">MÉTODO DE APLICACIÓN</span>
                  <strong className="val">{selectedProduct.metodoAplicacion || 'No especificado'}</strong>
                </div>

                <div className="cat-modal-field">
                  <span className="lbl">FECHA DE CADUCIDAD</span>
                  <strong className="val">{selectedProduct.caducidad || 'Sin fecha'}</strong>
                </div>
              </div>

              {/* Plazo de Seguridad */}
              <div className={`cat-modal-plazo ${selectedProduct.hasWarning ? 'warn' : 'ok'}`}>
                {selectedProduct.hasWarning ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <div>
                  <strong>Plazo de Seguridad: </strong>
                  <span>{selectedProduct.plazoSeguridad || 'No aplica'}</span>
                </div>
              </div>

              {/* Acciones del Modal */}
              <div className="cat-modal-footer">
                <div>
                  {selectedProduct.pdfUrl ? (
                    <a 
                      href={selectedProduct.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="cat-btn-sds large"
                    >
                      <FileText size={16} /> Ver Ficha Técnica / SDS <ExternalLink size={14} />
                    </a>
                  ) : (
                    <span className="cat-no-sds">Sin Ficha Adjunta</span>
                  )}
                </div>

                <div className="cat-modal-actions-right">
                  <button 
                    type="button" 
                    className="cat-btn-edit-modal"
                    onClick={() => {
                      setEditingProduct(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    <Edit3 size={16} /> Editar
                  </button>
                  <button 
                    type="button" 
                    className="cat-btn-del-modal"
                    onClick={() => deleteProduct(selectedProduct.id)}
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: FORMULARIO DE EDICIÓN RÁPIDA                          */}
      {/* ────────────────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="cat-modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="cat-modal-content edit-mode animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="cat-modal-header">
              <div className="cat-modal-title-row">
                <h2>Editar Producto</h2>
                <button type="button" className="cat-btn-close" onClick={() => setEditingProduct(null)}>
                  <X size={22} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProductEdit} className="cat-edit-form">
              <div className="cat-form-group">
                <label>Nombre del Producto</label>
                <input 
                  type="text" 
                  value={editingProduct.name || ''} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="cat-form-row">
                <div className="cat-form-group">
                  <label>Distintivo / Tag (PRO, INS, etc.)</label>
                  <input 
                    type="text" 
                    value={editingProduct.badge || ''} 
                    onChange={e => setEditingProduct({...editingProduct, badge: e.target.value})} 
                  />
                </div>
                <div className="cat-form-group">
                  <label>Fecha de Caducidad</label>
                  <input 
                    type="text" 
                    placeholder="ej. 12/2027 o 2027-12-31" 
                    value={editingProduct.caducidad || ''} 
                    onChange={e => setEditingProduct({...editingProduct, caducidad: e.target.value})} 
                  />
                </div>
              </div>

              <div className="cat-form-row">
                <div className="cat-form-group">
                  <label>Nº de Registro Oficial</label>
                  <input 
                    type="text" 
                    value={editingProduct.registro || ''} 
                    onChange={e => setEditingProduct({...editingProduct, registro: e.target.value})} 
                  />
                </div>
                <div className="cat-form-group">
                  <label>Lote</label>
                  <input 
                    type="text" 
                    value={editingProduct.lote || ''} 
                    onChange={e => setEditingProduct({...editingProduct, lote: e.target.value})} 
                  />
                </div>
              </div>

              <div className="cat-form-group">
                <label>Materia Activa</label>
                <input 
                  type="text" 
                  value={editingProduct.materiaActiva || ''} 
                  onChange={e => setEditingProduct({...editingProduct, materiaActiva: e.target.value})} 
                />
              </div>

              <div className="cat-form-group">
                <label>Plaga Diana</label>
                <input 
                  type="text" 
                  value={editingProduct.plagaDiana || ''} 
                  onChange={e => setEditingProduct({...editingProduct, plagaDiana: e.target.value})} 
                />
              </div>

              <div className="cat-form-group">
                <label>Método de Aplicación</label>
                <input 
                  type="text" 
                  value={editingProduct.metodoAplicacion || ''} 
                  onChange={e => setEditingProduct({...editingProduct, metodoAplicacion: e.target.value})} 
                />
              </div>

              <div className="cat-form-group">
                <label>Plazo de Seguridad</label>
                <input 
                  type="text" 
                  placeholder="ej. No aplica, 12 horas, 24 horas..." 
                  value={editingProduct.plazoSeguridad || ''} 
                  onChange={e => setEditingProduct({...editingProduct, plazoSeguridad: e.target.value})} 
                />
              </div>

              <div className="cat-checkbox-row">
                <input 
                  type="checkbox" 
                  id="warningCheck"
                  checked={editingProduct.hasWarning || false} 
                  onChange={e => setEditingProduct({...editingProduct, hasWarning: e.target.checked})} 
                />
                <label htmlFor="warningCheck">Marcar si requiere aviso o plazo de seguridad relevante</label>
              </div>

              <div className="cat-form-actions">
                <button 
                  type="button" 
                  className="cat-btn-cancel" 
                  onClick={() => setEditingProduct(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="cat-btn-submit" 
                  disabled={isSavingProduct}
                >
                  {isSavingProduct ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogo;
