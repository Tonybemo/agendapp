import React, { useState, useEffect } from 'react';
import { Search, Bug, Mouse, ShieldAlert, CalendarClock, ArrowLeft, Plus, CheckCircle2, AlertTriangle, BookOpen, FileText, Edit3, Trash2, X } from 'lucide-react';
import { categories } from '../data/mockCatalogo';
import { supabase } from '../lib/supabase';
import './Catalogo.css';

const IconMap = {
  bug: Bug,
  mouse: Mouse,
  shield: ShieldAlert,
  calendar: CalendarClock
};

const Catalogo = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

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
    } else {
      alert("Error al guardar el producto");
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Listen for new product additions from the UniversalForm
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
      .select('*');
      
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      // Map snake_case to camelCase for the UI
      const mapped = data.map(p => ({
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
        pdfUrl: p.pdf_url
      }));
      setProducts(mapped);
    }
    setLoading(false);
  };

  const deleteProduct = async (id) => {
    if(window.confirm('¿Seguro que deseas eliminar este producto?')) {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (!error) {
        setSelectedProduct(null);
        fetchProducts();
      }
    }
  };

  // If a category is selected, show the products for that category
  if (selectedCategory) {
    const categoryInfo = categories.find(c => c.id === selectedCategory);
    const CategoryIcon = IconMap[categoryInfo.iconType];
    
    let filteredProducts = [];
    if (selectedCategory === 'caducar') {
      const hoy = new Date();
      const limite = new Date(hoy.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 días
      filteredProducts = products.filter(p => {
        if (!p.caducidad) return false;
        const fechaCad = new Date(p.caducidad);
        return fechaCad <= limite;
      });
    } else {
      filteredProducts = products.filter(p => p.categoryId === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.materiaActiva || '').toLowerCase().includes(q) ||
        (p.lote || '').toLowerCase().includes(q)
      );
    }

    filteredProducts.sort((a,b) => (a.name || '').localeCompare(b.name || ''));

    return (
      <div className="catalogo-container animate-fade-in">
        {/* Header inside category view */}
        <div className="catalogo-header-card">
          <div className="catalogo-title-row">
            <BookOpen size={28} color="var(--primary)" />
            <h1>Catálogo</h1>
            <div className="brand-icon">A</div>
          </div>
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Buscar producto, materia activa, lote..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Back button and Category Title */}
        <div className="category-header">
          <button className="btn-volver" onClick={() => setSelectedCategory(null)}>
            <ArrowLeft size={18} /> Volver
          </button>
          <div className="category-title-inline">
            <CategoryIcon size={20} color="var(--text-main)" />
            <h2>{categoryInfo.title}</h2>
          </div>
        </div>

        {/* Product List or Detail */}
        {selectedProduct ? (
          <div className="product-detail-view animate-fade-in">
            <div className="product-detail-header">
              <div className="product-detail-info-row">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="product-detail-img" />
                <div>
                  <h2 className="product-detail-name">{selectedProduct.name}</h2>
                  <div className="product-detail-badges">
                    <span className="badge-ins">{selectedProduct.badge}</span>
                    <span className="product-detail-badge">Registro: {selectedProduct.registro}</span>
                    <span className="product-detail-badge" style={{color: 'var(--primary)', borderColor: 'var(--primary-light)', background: 'var(--primary-light)'}}>Lote: {selectedProduct.lote}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="btn-close-product"><X size={28}/></button>
            </div>
            
            <div className="product-detail-grid">
              <div>
                <p className="product-detail-label">MATERIA ACTIVA</p>
                <p className="product-detail-value">{selectedProduct.materiaActiva}</p>
              </div>
              <div>
                <p className="product-detail-label">PLAGA DIANA</p>
                <p className="product-detail-value">{selectedProduct.plagaDiana}</p>
              </div>
              <div>
                <p className="product-detail-label">MÉTODO APLICACIÓN</p>
                <p className="product-detail-value">{selectedProduct.metodoAplicacion}</p>
              </div>
              <div>
                <p className="product-detail-label">CADUCIDAD</p>
                <p className="product-detail-value">{selectedProduct.caducidad}</p>
              </div>
            </div>

            <div className={`product-status ${selectedProduct.hasWarning ? 'warning' : 'safe'}`} style={{justifyContent: 'flex-start', padding: '12px'}}>
              {selectedProduct.hasWarning ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span style={{fontSize: '0.9rem'}}>Plazo de seguridad: <strong>{selectedProduct.plazoSeguridad}</strong></span>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.8)'}}>
              {selectedProduct.pdfUrl ? (
                <a 
                  href={selectedProduct.pdfUrl} target="_blank" rel="noopener noreferrer"
                  style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'var(--bg-card-glass)', color: 'var(--primary)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', textDecoration: 'none'}}
                >
                  <FileText size={18} /> Ver Adjunto (SDS)
                </a>
              ) : (
                <div style={{color: 'var(--text-faint)', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px'}}>
                  <FileText size={18} /> Sin Ficha
                </div>
              )}
              
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'var(--bg-card)', color: 'var(--color-success)', border: '1px solid var(--color-success)', borderRadius: '10px', cursor: 'pointer'}}
                  onClick={() => setEditingProduct(selectedProduct)}
                  title="Editar"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'var(--bg-card)', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: '10px', cursor: 'pointer'}}
                  onClick={() => deleteProduct(selectedProduct.id)}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>Cargando catálogo...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>No hay productos en esta categoría. Añade uno desde el botón central (+).</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
                <div style={{height: '140px', background: `linear-gradient(135deg, ${categoryInfo.bgColor}, ${categoryInfo.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '2rem'}}>
                  {/* Si la imagen no carga, mostramos esto como placeholder premium */}
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-img" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = product.name?.charAt(0) || 'A'; }} />
                  ) : (product.name?.charAt(0) || 'A')}
                </div>
                <div className="product-content">
                  <span className="badge-ins">{product.badge}</span>
                  <h3>{product.name}</h3>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', flex: 1}}>
                    <span style={{fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700'}}>Lote: <strong>{product.lote}</strong></span>
                    <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Nº Reg: <strong>{product.registro}</strong></span>
                  </div>

                  <div className={`product-status ${product.hasWarning ? 'warning' : 'safe'}`}>
                    {product.hasWarning ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    <span>Plazo seg.: {product.plazoSeguridad}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {editingProduct && (
          <div className="uf-overlay" onClick={() => setEditingProduct(null)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-modal-overlay)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="uf-modal animate-fade-in" onClick={e => e.stopPropagation()} style={{background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h2 style={{margin: 0}}>Editar Producto</h2>
                <X size={24} color="var(--text-muted)" style={{cursor: 'pointer'}} onClick={() => setEditingProduct(null)} />
              </div>
              <form onSubmit={handleSaveProductEdit} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>NOMBRE</label>
                  <input type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} required />
                </div>
                <div style={{display: 'flex', gap: '12px'}}>
                  <div style={{flex: 1}}>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>TIPO (PRO, BASICO, etc)</label>
                    <input type="text" value={editingProduct.badge || ''} onChange={e => setEditingProduct({...editingProduct, badge: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>CADUCIDAD</label>
                    <input type="date" value={editingProduct.caducidad || ''} onChange={e => setEditingProduct({...editingProduct, caducidad: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                  </div>
                </div>
                <div style={{display: 'flex', gap: '12px'}}>
                  <div style={{flex: 1}}>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>Nº REGISTRO</label>
                    <input type="text" value={editingProduct.registro || ''} onChange={e => setEditingProduct({...editingProduct, registro: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>LOTE</label>
                    <input type="text" value={editingProduct.lote || ''} onChange={e => setEditingProduct({...editingProduct, lote: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                  </div>
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>MATERIA ACTIVA</label>
                  <input type="text" value={editingProduct.materiaActiva || ''} onChange={e => setEditingProduct({...editingProduct, materiaActiva: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>PLAGA DIANA</label>
                  <input type="text" value={editingProduct.plagaDiana || ''} onChange={e => setEditingProduct({...editingProduct, plagaDiana: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>MÉTODO APLICACIÓN</label>
                  <input type="text" value={editingProduct.metodoAplicacion || ''} onChange={e => setEditingProduct({...editingProduct, metodoAplicacion: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                </div>
                <div>
                  <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)'}}>PLAZO DE SEGURIDAD</label>
                  <input type="text" value={editingProduct.plazoSeguridad || ''} onChange={e => setEditingProduct({...editingProduct, plazoSeguridad: e.target.value})} style={{width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-input)'}} />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px'}}>
                  <input type="checkbox" checked={editingProduct.hasWarning || false} onChange={e => setEditingProduct({...editingProduct, hasWarning: e.target.checked})} id="hasWarningCheck" />
                  <label htmlFor="hasWarningCheck" style={{fontSize: '0.9rem', color: 'var(--text-main)'}}>Marca si tiene alerta / plazo de seguridad alto</label>
                </div>
                
                <button type="submit" disabled={isSavingProduct} style={{padding: '12px', background: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', marginTop: '16px'}}>
                  {isSavingProduct ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default view: Categories
  return (
    <div className="catalogo-container animate-fade-in">
      {/* Header */}
      <div className="catalogo-header-card">
        <div className="catalogo-title-row">
          <BookOpen size={28} color="var(--primary)" />
          <h1>Catálogo</h1>
          <div className="brand-icon">A</div>
        </div>
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Buscar producto, materia activa, lote..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories or Search Results */}
      {searchQuery ? (
        <div className="catalogo-products-grid">
          {(() => {
            const q = searchQuery.toLowerCase();
            const results = products.filter(p => 
              (p.name || '').toLowerCase().includes(q) ||
              (p.materiaActiva || '').toLowerCase().includes(q) ||
              (p.lote || '').toLowerCase().includes(q) ||
              (p.plagaDiana || '').toLowerCase().includes(q)
            );
            if (results.length === 0) return <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)', gridColumn: '1/-1'}}>No se encontraron productos para "{searchQuery}"</div>;
            return results.map(p => (
              <div key={p.id} className="product-card" onClick={() => { setSelectedCategory(p.categoryId); setSelectedProduct(p); setSearchQuery(''); }}>
                <h4>{p.name}</h4>
                {p.badge && <span className="product-badge">{p.badge}</span>}
                {p.materiaActiva && <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0'}}>{p.materiaActiva}</p>}
              </div>
            ));
          })()}
        </div>
      ) : (
        <div className="categories-list">
          {categories.map(category => {
            const Icon = IconMap[category.iconType];

            return (
              <div 
                key={category.id} 
                className="category-card"
                onClick={() => setSelectedCategory(category.id)}
                style={{ borderLeft: `6px solid ${category.color}` }}
              >
                <div 
                  className="category-icon" 
                  style={{ background: `linear-gradient(135deg, ${category.color}, var(--text-secondary))` }}
                >
                  <Icon size={28} color="white" />
                </div>
                <div className="category-info">
                  <h3>{category.title}</h3>
                  <span>
                    {category.id === 'caducar' 
                      ? products.filter(p => p.caducidad && (new Date(p.caducidad) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))).length 
                      : products.filter(p => p.categoryId === category.id).length} productos
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Catalogo;
