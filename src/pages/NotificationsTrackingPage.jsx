import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  History,
  CheckCheck,
  CheckCircle2,
  Eye,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { orderApi, equipmentApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export function NotificationsTrackingPage() {
  const {
    currentUser,
    allOrders,
    stockNotifications,
    setSelectedOrderId,
    refreshAll,
    addToast,
  } = useApp();

  // 'order-notifs' | 'stock-notifs' | 'tracking-log'
  const [subTab, setSubTab] = useState('order-notifs');
  // 'ALL' | 'UNREAD' | 'READ'
  const [readFilter, setReadFilter] = useState('ALL');
  const [filteredOrderNotifs, setFilteredOrderNotifs] = useState([]);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState('ALL');

  useEffect(() => {
    if (!currentUser) return;
    const isReadParam =
      readFilter === 'ALL' ? null : readFilter === 'READ' ? true : false;
    orderApi
      .getUserNotifications(currentUser.id, isReadParam)
      .then(setFilteredOrderNotifs)
      .catch(() => {});
  }, [currentUser, readFilter, allOrders]);

  const handleMarkOneRead = async (notifId) => {
    try {
      await orderApi.markNotificationAsRead(notifId);
      addToast(`Notificação #${notifId} marcada como lida.`, 'success');
      await refreshAll();
      const isReadParam =
        readFilter === 'ALL' ? null : readFilter === 'READ' ? true : false;
      const updated = await orderApi.getUserNotifications(
        currentUser.id,
        isReadParam
      );
      setFilteredOrderNotifs(updated);
    } catch (err) {
      addToast(err.message || 'Erro ao marcar notificação.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await orderApi.markAllUserNotificationsAsRead(currentUser.id);
      addToast(
        `${res?.updatedCount ?? 'Todas as'} notificações marcadas como lidas.`,
        'success'
      );
      await refreshAll();
      const isReadParam =
        readFilter === 'ALL' ? null : readFilter === 'READ' ? true : false;
      const updated = await orderApi.getUserNotifications(
        currentUser.id,
        isReadParam
      );
      setFilteredOrderNotifs(updated);
    } catch (err) {
      addToast(err.message || 'Erro ao atualizar notificações.', 'error');
    }
  };

  const handleMarkStockNotifRead = async (id) => {
    await equipmentApi.markStockNotificationRead(id);
    addToast(`Alerta de stock #${id} marcado como lido.`, 'success');
    await refreshAll();
  };

  const filteredStockNotifs = stockNotifications.filter((n) => {
    if (readFilter === 'UNREAD') return !n.isRead;
    if (readFilter === 'READ') return n.isRead;
    return true;
  });

  // Flatten all trackings across orders for TrackingController view
  const allTrackings = allOrders
    .flatMap((o) =>
      (o.trackings || []).map((t) => ({
        ...t,
        orderId: o.id,
        requesterName: o.userName,
      }))
    )
    .filter((t) =>
      selectedTrackingOrder === 'ALL'
        ? true
        : t.orderId === Number(selectedTrackingOrder)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Módulo 4 • Sistema de Alertas, Notificações & Tracking
          </span>
          <h1 className="page-title">Centro de Notificações e Auditoria</h1>
          <p className="page-subtitle">
            Notificações internas de mudança de estado, alertas de stock mínimo
            e registo cronológico de tracking.
          </p>
        </div>

        {subTab === 'order-notifs' && (
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={16} /> Marcar Todas como Lidas (PUT)
            </button>
          </div>
        )}
      </div>

      {/* Sub-navigation tabs */}
      <div className="endpoint-tabs-bar">
        <button
          type="button"
          className={`endpoint-tab ${
            subTab === 'order-notifs' ? 'active' : ''
          }`}
          onClick={() => setSubTab('order-notifs')}
        >
          <Bell size={16} />
          <div>
            <strong>Notificações de Pedidos</strong>
            <code>
              GET /api/order/notification/user/{currentUser?.id}
            </code>
          </div>
        </button>

        <button
          type="button"
          className={`endpoint-tab ${
            subTab === 'stock-notifs' ? 'active' : ''
          }`}
          onClick={() => setSubTab('stock-notifs')}
        >
          <AlertTriangle size={16} />
          <div>
            <strong>Alertas de Stock Mínimo ({stockNotifications.length})</strong>
            <code>GET /api/equipment/notification</code>
          </div>
        </button>

        <button
          type="button"
          className={`endpoint-tab ${
            subTab === 'tracking-log' ? 'active' : ''
          }`}
          onClick={() => setSubTab('tracking-log')}
        >
          <History size={16} />
          <div>
            <strong>Registo de Tracking ({allTrackings.length})</strong>
            <code>GET /api/tracking/order</code>
          </div>
        </button>
      </div>

      {/* Filter bar */}
      <div className="filters-bar">
        {subTab !== 'tracking-log' ? (
          <div className="category-tabs">
            <span className="filter-inline-label">
              <Filter size={14} /> Filtrar estado de leitura (
              <code>?isRead=...</code>):
            </span>
            <button
              type="button"
              className={`cat-tab ${readFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setReadFilter('ALL')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`cat-tab ${readFilter === 'UNREAD' ? 'active' : ''}`}
              onClick={() => setReadFilter('UNREAD')}
            >
              Não Lidas (isRead=false)
            </button>
            <button
              type="button"
              className={`cat-tab ${readFilter === 'READ' ? 'active' : ''}`}
              onClick={() => setReadFilter('READ')}
            >
              Lidas (isRead=true)
            </button>
          </div>
        ) : (
          <div className="category-tabs">
            <span className="filter-inline-label">
              Filtrar Trackings por Pedido:
            </span>
            <select
              className="switcher-select"
              value={selectedTrackingOrder}
              onChange={(e) => setSelectedTrackingOrder(e.target.value)}
            >
              <option value="ALL">Todos os Pedidos</option>
              {allOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  Pedido #{o.id} — {o.userName} ({o.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Order Notifications */}
      {subTab === 'order-notifs' && (
        <div className="panel-card">
          {filteredOrderNotifs.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} className="empty-icon" />
              <h4>Sem notificações de pedido para este filtro</h4>
              <p>
                Utilizador ativo: #{currentUser?.id} ({currentUser?.name})
              </p>
            </div>
          ) : (
            <div className="notifications-full-list">
              {filteredOrderNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`notification-row-card ${
                    n.isRead ? 'read' : 'unread'
                  }`}
                >
                  <div className="notif-row-left">
                    <div className="notif-row-header">
                      <span className="notif-id-code">Notif #{n.id}</span>
                      <StatusBadge status={n.status} size="sm" />
                      <span className="notif-order-tag">
                        Pedido #{n.orderId}
                      </span>
                      <span className="notif-date">
                        {new Date(n.date).toLocaleString('pt-PT')}
                      </span>
                      {!n.isRead && <span className="unread-pill">Nova</span>}
                    </div>
                    <p className="notif-row-message">{n.message}</p>
                  </div>
                  <div className="notif-row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedOrderId(n.orderId)}
                    >
                      <Eye size={14} /> Ver Pedido
                    </button>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkOneRead(n.id)}
                        title={`PUT /api/order/notification/${n.id}/read`}
                      >
                        <CheckCircle2 size={14} /> Marcar Lida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Stock Notifications */}
      {subTab === 'stock-notifs' && (
        <div className="panel-card">
          {filteredStockNotifs.length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={40} className="empty-icon" />
              <h4>Nenhum alerta de stock encontrado</h4>
            </div>
          ) : (
            <div className="notifications-full-list">
              {filteredStockNotifs.map((sn) => (
                <div
                  key={sn.id}
                  className={`notification-row-card ${
                    sn.isRead ? 'read' : 'unread stock-alert'
                  }`}
                >
                  <div className="notif-row-left">
                    <div className="notif-row-header">
                      <span className="notif-id-code">StockAlert #{sn.id}</span>
                      <span className="notif-order-tag">
                        Equipamento #{sn.equipmentId}
                      </span>
                      {sn.date && (
                        <span className="notif-date">
                          {new Date(sn.date).toLocaleString('pt-PT')}
                        </span>
                      )}
                      {!sn.isRead && (
                        <span className="unread-pill danger">Stock Crítico</span>
                      )}
                    </div>
                    <p className="notif-row-message">{sn.message}</p>
                  </div>
                  <div className="notif-row-actions">
                    {!sn.isRead && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkStockNotifRead(sn.id)}
                      >
                        <CheckCircle2 size={14} /> Marcar Lida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tracking Log */}
      {subTab === 'tracking-log' && (
        <div className="panel-card">
          {allTrackings.length === 0 ? (
            <div className="empty-state">
              <h4>Sem registos de tracking disponíveis</h4>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Pedido</th>
                    <th>Requisitante</th>
                    <th>Estado Registado</th>
                    <th>Responsável / Gestor</th>
                    <th>Data & Hora</th>
                    <th>Comentário / Justificação</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {allTrackings.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <code>#{t.id}</code>
                      </td>
                      <td>
                        <strong>#{t.orderId}</strong>
                      </td>
                      <td>{t.requesterName}</td>
                      <td>
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td>{t.approverName || `Approver #${t.approverId}`}</td>
                      <td>
                        {new Date(t.date).toLocaleString('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{t.comments || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedOrderId(t.orderId)}
                        >
                          <Eye size={14} /> Pedido
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
