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
            <BookOpen size={28} color="#2563eb" />
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
            <CategoryIcon size={20} color="#0f172a" />
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
                    <span className="product-detail-badge">Lote: {selectedProduct.lote}</span>
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
                  style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(255,255,255,0.6)', color: '#2563eb', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', textDecoration: 'none'}}
                >
                  <FileText size={18} /> Ver Adjunto (SDS)
                </a>
              ) : (
                <div style={{color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px'}}>
                  <FileText size={18} /> Sin Ficha
                </div>
              )}
              
              <div style={{display: 'flex', gap: '12px'}}>
                <button 
                  style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'white', color: '#14b8a6', border: '1px solid #14b8a6', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'}}
                  onClick={() => alert('Editando producto...')}
                >
                  <Edit3 size={18} /> Editar
                </button>
                <button 
                  style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'}}
                  onClick={() => deleteProduct(selectedProduct.id)}
                >
                  <Trash2 size={18} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>Cargando catálogo...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No hay productos en esta categoría. Añade uno desde el botón central (+).</div>
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
                    <span style={{fontSize: '0.8rem', color: '#64748b'}}>Lote: <strong>{product.lote}</strong></span>
                    <span style={{fontSize: '0.8rem', color: '#64748b'}}>Nº Reg: <strong>{product.registro}</strong></span>
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


      </div>
    );
  }

  // Default view: Categories
  return (
    <div className="catalogo-container animate-fade-in">
      {/* Header */}
      <div className="catalogo-header-card">
        <div className="catalogo-title-row">
          <BookOpen size={28} color="#2563eb" />
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

      {/* Categories List */}
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
                style={{ background: `linear-gradient(135deg, ${category.color}, #334155)` }}
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
    </div>
  );
};

export default Catalogo;
