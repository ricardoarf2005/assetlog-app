import { useState } from 'react';
import {
  Search,
  Plus,
  ShoppingCart,
  Edit3,
  Power,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CategoryEnum, CATEGORY_META } from '../constants/enums';
import { CategoryBadge } from '../components/StatusBadge';
import { equipmentApi } from '../services/api';

export function CatalogPage() {
  const {
    equipments,
    isManager,
    addToCart,
    setIsCartOpen,
    cart,
    refreshAll,
    addToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showInactive, setShowInactive] = useState(true);

  // Create / Edit modal state (Manager)
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'stock'
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: CategoryEnum.LAPTOPS,
    stock: 10,
    minStock: 3,
  });

  const filtered = equipments.filter((e) => {
    if (!showInactive && !e.isActive) return false;
    if (onlyAvailable && (!e.isActive || e.stock <= 0)) return false;
    if (selectedCategory !== 'ALL' && e.category !== selectedCategory) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      category: CategoryEnum.LAPTOPS,
      stock: 10,
      minStock: 3,
    });
    setEditingEquipment(null);
    setModalMode('create');
  };

  const openEditModal = (eq) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name,
      description: eq.description || '',
      category: eq.category,
      stock: eq.stock,
      minStock: eq.minStock,
    });
    setModalMode('edit');
  };

  const openStockModal = (eq) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name,
      description: eq.description || '',
      category: eq.category,
      stock: eq.stock,
      minStock: eq.minStock,
    });
    setModalMode('stock');
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await equipmentApi.create(formData);
        addToast(
          `Equipamento "${formData.name}" adicionado ao catálogo.`,
          'success'
        );
      } else if (modalMode === 'edit' && editingEquipment) {
        await equipmentApi.updateDetails(editingEquipment.id, formData);
        addToast(
          `Descrição e detalhes de "${formData.name}" atualizados.`,
          'success'
        );
      } else if (modalMode === 'stock' && editingEquipment) {
        await equipmentApi.updateStock(
          editingEquipment.id,
          formData.stock,
          formData.minStock
        );
        addToast(
          `Stock de "${editingEquipment.name}" atualizado para ${formData.stock} un.`,
          'success'
        );
      }
      setModalMode(null);
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao guardar equipamento.', 'error');
    }
  };

  const handleToggleActive = async (eq) => {
    try {
      await equipmentApi.setActiveStatus(eq.id, !eq.isActive);
      addToast(
        `Equipamento "${eq.name}" foi ${
          !eq.isActive ? 'ativado' : 'desativado'
        }.`,
        'info'
      );
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao alterar estado do material.', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Módulo 2 • Catálogo e Gestão de Stock (EquipmentController)
          </span>
          <h1 className="page-title">Catálogo de Material Informático</h1>
          <p className="page-subtitle">
            Consulte disponibilidade em tempo real, filtre por categoria e
            adicione equipamentos ao seu pedido.
          </p>
        </div>

        <div className="page-actions">
          {cart.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={17} /> Ver Cesto ({cart.length})
            </button>
          )}
          {isManager && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              <Plus size={17} /> Adicionar Material (POST)
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar portátil, monitor, periférico, dock..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-tabs">
          <button
            type="button"
            className={`cat-tab ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            Todas ({equipments.length})
          </button>
          {Object.keys(CATEGORY_META).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>

        <div className="filter-toggles">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            <span>Apenas com stock disponível</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <span>Mostrar inativos</span>
          </label>
        </div>
      </div>

      {/* Equipment Grid */}
      {filtered.length === 0 ? (
        <div className="panel-card empty-state">
          <h4>Nenhum equipamento encontrado com estes filtros</h4>
          <p>Ajuste a categoria selecionada ou o termo de pesquisa.</p>
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((eq) => {
            const isCritical = eq.isActive && eq.stock > 0 && eq.stock <= eq.minStock;
            const isOut = eq.isActive && eq.stock === 0;

            return (
              <div
                key={eq.id}
                className={`equipment-card ${!eq.isActive ? 'inactive' : ''}`}
              >
                <div className="eq-card-top">
                  <CategoryBadge category={eq.category} />
                  <span className="eq-id-tag">ID #{eq.id}</span>
                </div>

                <h3 className="eq-title">{eq.name}</h3>
                <p className="eq-desc">{eq.description}</p>

                <div className="eq-stock-box">
                  {!eq.isActive ? (
                    <span className="eq-availability status-inactive">
                      <XCircle size={15} /> Desativado (Inativo)
                    </span>
                  ) : isOut ? (
                    <span className="eq-availability status-out">
                      <AlertTriangle size={15} /> Sem Stock (0 disp. / mín.{' '}
                      {eq.minStock})
                    </span>
                  ) : isCritical ? (
                    <span className="eq-availability status-critical">
                      <AlertTriangle size={15} /> Stock Crítico: {eq.stock} un.
                      (mín. {eq.minStock})
                    </span>
                  ) : (
                    <span className="eq-availability status-available">
                      <CheckCircle2 size={15} /> Disponível: {eq.stock} un. (mín.{' '}
                      {eq.minStock})
                    </span>
                  )}
                </div>

                <div className="eq-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={!eq.isActive}
                    onClick={() => addToCart(eq, 1)}
                  >
                    <ShoppingCart size={16} />
                    {!eq.isActive
                      ? 'Indisponível (Inativo)'
                      : isOut
                      ? 'Requisitar (Ficará em Lista/BLOCKED)'
                      : 'Adicionar ao Pedido'}
                  </button>

                  {isManager && (
                    <div className="eq-manager-toolbar">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openStockModal(eq)}
                        title="PUT /api/equipment/stock"
                      >
                        <PackagePlus size={14} /> Stock
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEditModal(eq)}
                        title="PUT /api/equipment/description"
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-sm ${
                          eq.isActive ? 'text-danger' : 'text-success'
                        }`}
                        onClick={() => handleToggleActive(eq)}
                        title={
                          eq.isActive
                            ? 'PUT /api/equipment/deactivate'
                            : 'PUT /api/equipment/activate'
                        }
                      >
                        <Power size={14} />
                        {eq.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Create / Edit / Stock */}
      {modalMode && (
        <div className="modal-backdrop" onClick={() => setModalMode(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">
                  {modalMode === 'create'
                    ? 'POST /api/equipment'
                    : modalMode === 'stock'
                    ? 'PUT /api/equipment/stock'
                    : 'PUT /api/equipment/description'}
                </div>
                <h2 className="modal-title">
                  {modalMode === 'create'
                    ? 'Adicionar Novo Material Informático'
                    : modalMode === 'stock'
                    ? `Atualizar Stock — ${editingEquipment?.name}`
                    : `Editar Material — ${editingEquipment?.name}`}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModalMode(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveModal}>
              {modalMode !== 'stock' && (
                <>
                  <div className="form-group">
                    <label>Nome do Equipamento *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Portátil Lenovo ThinkPad T14 Gen 4"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoria (CategoryEnum) *</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      {Object.keys(CATEGORY_META).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_META[cat].label} ({cat})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Descrição Técnica *</label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Especificações técnicas do material..."
                      required
                    />
                  </div>
                </>
              )}

              {(modalMode === 'create' || modalMode === 'stock') && (
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Quantidade em Stock *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Stock Mínimo de Alerta (MinStock) *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.minStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStock: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalMode(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
