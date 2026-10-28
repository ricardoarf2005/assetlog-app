import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  ShieldCheck,
  Package,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { orderApi } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  StatusEnum,
  STATUS_META,
  getAvailableTransitions,
} from '../constants/enums';
import { StatusBadge, CategoryBadge } from './StatusBadge';

const WORKFLOW_STEPS = [
  StatusEnum.OPENED,
  StatusEnum.PENDING,
  StatusEnum.APPROVED,
  StatusEnum.ONGOING,
  StatusEnum.RETURNED,
  StatusEnum.CLOSED,
];

export function OrderDetailModal({ orderId, onClose }) {
  const { currentUser, isManager, refreshAll, addToast, equipments } = useApp();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Status transition form
  const [pendingTransition, setPendingTransition] = useState(null);
  const [comments, setComments] = useState('');

  // Expected delivery date form (Manager)
  const [editingDeliveryDate, setEditingDeliveryDate] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [deliveryComments, setDeliveryComments] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    async function fetchDetails() {
      try {
        const data = await orderApi.getOrderDetails(orderId);
        if (active) {
          setOrder(data);
          if (data?.expectedDeliveryDate) {
            setNewDeliveryDate(data.expectedDeliveryDate.slice(0, 10));
          }
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setLoading(false);
          addToast(err.message || 'Erro ao carregar detalhes do pedido.', 'error');
          onClose();
        }
      }
    }
    fetchDetails();

    return () => {
      active = false;
    };
  }, [orderId, addToast, onClose]);

  if (!orderId) return null;

  const transitions = order
    ? getAvailableTransitions(order.status, isManager)
    : [];

  const handleConfirmTransition = async (e) => {
    e.preventDefault();
    if (!pendingTransition) return;

    if (pendingTransition.requiresComment && !comments.trim()) {
      addToast(
        'Por favor indique uma justificação/comentário obrigatório para esta ação.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const updated = await orderApi.updateOrderStatus(order.id, {
        approverId: currentUser.id,
        status: pendingTransition.status,
        comments: comments.trim() || null,
      });
      setOrder(updated);
      setPendingTransition(null);
      setComments('');

      if (
        pendingTransition.status === StatusEnum.APPROVED &&
        updated.status === StatusEnum.BLOCKED
      ) {
        addToast(
          `Pedido #${order.id} passou automaticamente para BLOCKED por falta de stock disponível!`,
          'error'
        );
      } else {
        addToast(
          `Estado do Pedido #${order.id} atualizado para ${
            STATUS_META[updated.status]?.label || updated.status
          }.`,
          'success'
        );
      }
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar estado do pedido.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDeliveryDate = async (e) => {
    e.preventDefault();
    if (!newDeliveryDate) return;

    setSubmitting(true);
    try {
      const updated = await orderApi.updateExpectedDeliveryDate(order.id, {
        approverId: currentUser.id,
        expectedDeliveryDate: newDeliveryDate,
        comments: deliveryComments.trim() || null,
      });
      setOrder(updated);
      setEditingDeliveryDate(false);
      setDeliveryComments('');
      addToast(
        `Data de entrega expectável do Pedido #${order.id} atualizada.`,
        'success'
      );
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar data de entrega.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockForEquipment = (eqId) => {
    const found = equipments.find((e) => e.id === eqId);
    return found ? found.stock : null;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">
              GET /api/order/{orderId} • Detalhe Completo
            </div>
            <h2 className="modal-title">
              Pedido de Material #{orderId}{' '}
              {order && <StatusBadge status={order.status} />}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </div>

        {loading || !order ? (
          <div className="modal-body loading-state">
            <div className="spinner" />
            <p>A carregar detalhes do pedido #{orderId}...</p>
          </div>
        ) : (
          <div className="modal-body">
            {/* State Machine Visual Stepper */}
            <div className="workflow-stepper">
              {WORKFLOW_STEPS.map((step, index) => {
                const currentIdx = WORKFLOW_STEPS.indexOf(order.status);
                const isCompleted = currentIdx > index;
                const isCurrent = order.status === step;
                return (
                  <div
                    key={step}
                    className={`workflow-step ${
                      isCompleted ? 'completed' : ''
                    } ${isCurrent ? 'current' : ''}`}
                  >
                    <div className="step-circle">
                      {isCompleted ? <CheckCircle2 size={14} /> : index + 1}
                    </div>
                    <span className="step-label">
                      {STATUS_META[step]?.label}
                    </span>
                  </div>
                );
              })}
              {(order.status === StatusEnum.BLOCKED ||
                order.status === StatusEnum.REJECTED ||
                order.status === StatusEnum.RETURNREJECTED) && (
                <div className="workflow-step current exception">
                  <div className="step-circle">
                    <AlertTriangle size={14} />
                  </div>
                  <span className="step-label">
                    {STATUS_META[order.status]?.label}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="detail-meta-grid">
              <div className="meta-card">
                <span className="meta-label">
                  <User size={14} /> Requisitante
                </span>
                <strong>{order.userName || `Utilizador #${order.userId}`}</strong>
                <span className="meta-sub">User ID: {order.userId}</span>
              </div>

              <div className="meta-card">
                <span className="meta-label">
                  <ShieldCheck size={14} /> Gestor / Aprovador
                </span>
                <strong>
                  {order.approverName ||
                    (order.approverId
                      ? `Aprovador #${order.approverId}`
                      : 'Aguarda atribuição')}
                </strong>
                <span className="meta-sub">
                  {order.approverId
                    ? `Approver ID: ${order.approverId}`
                    : 'Sem gestor associado'}
                </span>
              </div>

              <div className="meta-card">
                <span className="meta-label">
                  <Clock size={14} /> Data de Criação
                </span>
                <strong>
                  {new Date(order.creationDate).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>
                <span className="meta-sub">
                  {new Date(order.creationDate).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="meta-card">
                <div className="meta-label-row">
                  <span className="meta-label">
                    <Calendar size={14} /> Entrega / Devolução Expectável
                  </span>
                  {isManager && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() =>
                        setEditingDeliveryDate(!editingDeliveryDate)
                      }
                    >
                      {editingDeliveryDate ? 'Cancelar' : 'Alterar'}
                    </button>
                  )}
                </div>
                <strong>
                  {new Date(order.expectedDeliveryDate).toLocaleDateString(
                    'pt-PT',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                </strong>
                <span className="meta-sub">
                  PUT /api/order/{order.id}/expected-delivery-date
                </span>
              </div>
            </div>

            {/* Edit Expected Delivery Date Form */}
            {editingDeliveryDate && (
              <form
                className="action-box delivery-box"
                onSubmit={handleUpdateDeliveryDate}
              >
                <h4>Atualizar Data de Entrega Expectável</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nova Data Expectável</label>
                    <input
                      type="date"
                      value={newDeliveryDate}
                      onChange={(e) => setNewDeliveryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Observação / Motivo da Alteração (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Atraso do fornecedor ou reagendamento com colaborador..."
                      value={deliveryComments}
                      onChange={(e) => setDeliveryComments(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    Guardar Data
                  </button>
                </div>
              </form>
            )}

            {/* Guided State Machine Actions */}
            {transitions.length > 0 && (
              <div className="action-box">
                <div className="action-box-header">
                  <div>
                    <h4>Ações Disponíveis na Máquina de Estados</h4>
                    <p className="text-muted">
                      Endpoint: <code>PUT /api/order/{order.id}/status</code>{' '}
                      (Approver/Actor ID: {currentUser?.id})
                    </p>
                  </div>
                  <div className="transition-buttons">
                    {transitions.map((t) => (
                      <button
                        key={t.status}
                        type="button"
                        className={`btn btn-${t.variant} ${
                          pendingTransition?.status === t.status ? 'active' : ''
                        }`}
                        onClick={() => {
                          setPendingTransition(t);
                          setComments('');
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {pendingTransition && (
                  <form
                    className="transition-confirm-form"
                    onSubmit={handleConfirmTransition}
                  >
                    <div className="form-group">
                      <label>
                        Comentário / Justificação para{' '}
                        <strong>{pendingTransition.label}</strong>
                        {pendingTransition.requiresComment ? (
                          <span className="required-tag"> * Obrigatório</span>
                        ) : (
                          <span className="optional-tag"> (Opcional)</span>
                        )}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={
                          pendingTransition.requiresComment
                            ? 'Indique o motivo detalhado (obrigatório)...'
                            : 'Adicione uma nota ao histórico de tracking (opcional)...'
                        }
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        required={pendingTransition.requiresComment}
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setPendingTransition(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className={`btn btn-${pendingTransition.variant}`}
                        disabled={submitting}
                      >
                        <Send size={15} /> Confirmar Transição para{' '}
                        {pendingTransition.status}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Order Items List */}
            <div className="detail-section">
              <h3 className="section-subtitle">
                <Package size={17} /> Equipamentos Requisitados (
                {order.items?.length || 0})
              </h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID Equipamento</th>
                      <th>Material Informático</th>
                      <th>Categoria</th>
                      <th>Qtd. Pedida</th>
                      {isManager && <th>Stock Atual</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item) => {
                      const currentStock = getStockForEquipment(
                        item.equipmentId
                      );
                      const isInsufficient =
                        currentStock !== null &&
                        currentStock < item.quantity &&
                        (order.status === StatusEnum.OPENED ||
                          order.status === StatusEnum.PENDING ||
                          order.status === StatusEnum.BLOCKED);
                      return (
                        <tr key={item.id || item.equipmentId}>
                          <td>
                            <code>#{item.equipmentId}</code>
                          </td>
                          <td>
                            <div className="cell-title">
                              {item.equipmentName}
                            </div>
                            {item.description && (
                              <div className="cell-sub">{item.description}</div>
                            )}
                          </td>
                          <td>
                            {item.category ? (
                              <CategoryBadge category={item.category} />
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <span className="qty-pill">{item.quantity} un.</span>
                          </td>
                          {isManager && (
                            <td>
                              {currentStock !== null ? (
                                <span
                                  className={`stock-indicator ${
                                    isInsufficient ? 'stock-danger' : 'stock-ok'
                                  }`}
                                >
                                  {currentStock} disp.
                                  {isInsufficient && ' (Insuficiente → BLOCKED)'}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tracking History Timeline */}
            <div className="detail-section">
              <h3 className="section-subtitle">
                <MessageSquare size={17} /> Histórico de Tracking & Auditoria (
                {order.trackings?.length || 0})
              </h3>
              {!order.trackings || order.trackings.length === 0 ? (
                <div className="empty-inline">
                  Ainda não existem eventos de tracking registados para este
                  pedido.
                </div>
              ) : (
                <div className="tracking-timeline">
                  {order.trackings.map((t) => (
                    <div key={t.id} className="timeline-item">
                      <div className="timeline-marker" />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <StatusBadge status={t.status} size="sm" />
                          <span className="timeline-actor">
                            por{' '}
                            <strong>
                              {t.approverName || `Utilizador #${t.approverId}`}
                            </strong>
                          </span>
                          <span className="timeline-date">
                            {new Date(t.date).toLocaleString('pt-PT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {t.comments && (
                          <p className="timeline-comment">{t.comments}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
