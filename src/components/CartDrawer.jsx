import { useState } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Send,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CategoryBadge } from './StatusBadge';

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    clearCart,
    submitCartOrder,
    currentUser,
    setSelectedOrderId,
  } = useApp();

  const [expectedDate, setExpectedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isCartOpen) return null;

  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await submitCartOrder(expectedDate || null);
      if (created?.id) {
        setExpectedDate('');
        setSelectedOrderId(created.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <div className="cart-title-wrap">
            <ShoppingBag size={20} />
            <div>
              <h3>Novo Pedido de Material</h3>
              <span className="cart-sub">
                POST /api/order • UserId: {currentUser?.id}
              </span>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setIsCartOpen(false)}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={42} className="empty-icon" />
              <h4>O seu cesto de requisição está vazio</h4>
              <p>
                Explore o Catálogo de Material Informático para adicionar
                equipamentos ao pedido.
              </p>
            </div>
          ) : (
            <>
              <div className="cart-items-list">
                {cart.map(({ equipment, quantity }) => {
                  const exceedsStock = quantity > equipment.stock;
                  return (
                    <div key={equipment.id} className="cart-item-card">
                      <div className="cart-item-info">
                        <CategoryBadge category={equipment.category} />
                        <h4>{equipment.name}</h4>
                        <span className="cart-stock-note">
                          Stock atual: <strong>{equipment.stock} un.</strong>
                        </span>
                        {exceedsStock && (
                          <div className="cart-stock-warning">
                            <AlertCircle size={13} /> Qtd superior ao stock: na
                            aprovação ficará em estado <strong>BLOCKED</strong>.
                          </div>
                        )}
                      </div>
                      <div className="cart-item-controls">
                        <div className="qty-stepper">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQty(equipment.id, quantity - 1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQty(equipment.id, quantity + 1)
                            }
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => removeFromCart(equipment.id)}
                          title="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form className="cart-footer-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    <Calendar size={14} /> Data de Entrega Pretendida (Opcional)
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                  <small className="field-hint">
                    Se omitida, a API define automaticamente +7 dias (
                    <code>DateTime.UtcNow.AddDays(7)</code>).
                  </small>
                </div>

                <div className="cart-summary-row">
                  <span>Total de artigos diferentes:</span>
                  <strong>{cart.length}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Total de unidades:</span>
                  <strong>{totalUnits} un.</strong>
                </div>

                <div className="cart-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={clearCart}
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={submitting}
                  >
                    <Send size={16} />
                    {submitting ? 'A submeter...' : 'Submeter Pedido'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
