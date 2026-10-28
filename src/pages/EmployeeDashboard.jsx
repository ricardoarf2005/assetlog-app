import {
  Package,
  ClipboardList,
  Clock,
  Bell,
  PlusCircle,
  Eye,
  RotateCcw,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusEnum } from '../constants/enums';
import { StatusBadge } from '../components/StatusBadge';
import { orderApi } from '../services/api';

export function EmployeeDashboard() {
  const {
    currentUser,
    userOrders,
    notifications,
    setActiveTab,
    setSelectedOrderId,
    refreshAll,
    addToast,
  } = useApp();

  const activeOrders = userOrders.filter(
    (o) =>
      o.status === StatusEnum.OPENED ||
      o.status === StatusEnum.PENDING ||
      o.status === StatusEnum.APPROVED ||
      o.status === StatusEnum.ONGOING ||
      o.status === StatusEnum.BLOCKED
  );

  // Material em posse (Pedidos no estado ONGOING / Entregue ou APPROVED / Reservado)
  const ongoingOrders = userOrders.filter(
    (o) => o.status === StatusEnum.ONGOING || o.status === StatusEnum.APPROVED
  );

  const itemsInPossession = ongoingOrders.flatMap((order) =>
    (order.items || []).map((item) => ({
      ...item,
      orderId: order.id,
      status: order.status,
      expectedDeliveryDate: order.expectedDeliveryDate,
      creationDate: order.creationDate,
    }))
  );

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handleQuickReturn = async (orderId) => {
    try {
      await orderApi.updateOrderStatus(orderId, {
        approverId: currentUser.id,
        status: StatusEnum.RETURNED,
        comments: `Devolução efetuada pelo colaborador ${currentUser.name}.`,
      });
      addToast(
        `Material do Pedido #${orderId} devolvido e reposto em stock!`,
        'success'
      );
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao devolver material.', 'error');
    }
  };

  const handleMarkRead = async (notifId) => {
    await orderApi.markNotificationAsRead(notifId);
    await refreshAll();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Módulo 5 • Dashboard do Colaborador
          </span>
          <h1 className="page-title">Olá, {currentUser?.name}</h1>
          <p className="page-subtitle">
            Consulte os seus pedidos ativos, material informático em sua posse e
            próximas datas de entrega ou devolução.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveTab('catalog')}
          >
            <PlusCircle size={17} /> Requisitar Novo Material
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon purple">
            <ClipboardList size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pedidos Ativos</span>
            <strong className="kpi-value">{activeOrders.length}</strong>
            <span className="kpi-sub">
              De {userOrders.length} pedidos totais submetidos
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald">
            <Package size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Material em Minha Posse</span>
            <strong className="kpi-value">
              {itemsInPossession.reduce((acc, i) => acc + i.quantity, 0)} un.
            </strong>
            <span className="kpi-sub">
              GET /api/users/{currentUser?.id}/material-em-posse
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Aguardam Aprovação / Stock</span>
            <strong className="kpi-value">
              {
                userOrders.filter(
                  (o) =>
                    o.status === StatusEnum.OPENED ||
                    o.status === StatusEnum.PENDING ||
                    o.status === StatusEnum.BLOCKED
                ).length
              }
            </strong>
            <span className="kpi-sub">Abertos, pendentes ou bloqueados</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <Bell size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Notificações Não Lidas</span>
            <strong className="kpi-value">{unreadNotifs.length}</strong>
            <span className="kpi-sub">
              GET /api/order/notification/user/{currentUser?.id}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-two-col">
        {/* Material em Posse */}
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Material Informático em Sua Posse</h3>
              <span className="panel-sub">
                Equipamentos entregues (ONGOING) ou aprovados para levantamento
                (APPROVED)
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('orders')}
            >
              Ver Todos
            </button>
          </div>

          {itemsInPossession.length === 0 ? (
            <div className="empty-inline">
              Não tem atualmente nenhum equipamento em sua posse para o
              utilizador #{currentUser?.id}.
            </div>
          ) : (
            <div className="possession-list">
              {itemsInPossession.map((item, idx) => (
                <div
                  key={`${item.orderId}-${item.equipmentId}-${idx}`}
                  className="possession-item"
                >
                  <div className="possession-main">
                    <div className="possession-title-row">
                      <strong>{item.equipmentName}</strong>
                      <span className="qty-pill">{item.quantity} un.</span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <div className="possession-meta">
                      <span>Pedido #{item.orderId}</span>
                      <span>•</span>
                      <span>
                        <Calendar size={13} /> Data Expectável:{' '}
                        <strong>
                          {new Date(
                            item.expectedDeliveryDate
                          ).toLocaleDateString('pt-PT')}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="possession-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedOrderId(item.orderId)}
                    >
                      <Eye size={14} /> Detalhes
                    </button>
                    {item.status === StatusEnum.ONGOING && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleQuickReturn(item.orderId)}
                      >
                        <RotateCcw size={14} /> Devolver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Últimas Notificações */}
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Notificações Recentes</h3>
              <span className="panel-sub">
                Atualizações de estado dos seus pedidos
              </span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveTab('notifications')}
            >
              Centro de Alertas
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="empty-inline">
              Sem notificações registadas para este utilizador.
            </div>
          ) : (
            <div className="notif-mini-list">
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={`notif-mini-card ${n.isRead ? 'read' : 'unread'}`}
                >
                  <div className="notif-mini-top">
                    <StatusBadge status={n.status} size="sm" />
                    <span className="notif-date">
                      {new Date(n.date).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="notif-msg">{n.message}</p>
                  <div className="notif-mini-actions">
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSelectedOrderId(n.orderId)}
                    >
                      Abrir Pedido #{n.orderId}
                    </button>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <CheckCircle2 size={13} /> Marcar lida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Tabela de Pedidos do Utilizador */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Meus Pedidos de Material</h3>
            <span className="panel-sub">
              Endpoint: <code>GET /api/order/user/{currentUser?.id}</code>
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('orders')}
          >
            Gerir Todos os Pedidos
          </button>
        </div>

        {userOrders.length === 0 ? (
          <div className="empty-inline">
            Ainda não submeteu nenhum pedido de material informático.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Pedido</th>
                  <th>Equipamentos</th>
                  <th>Criado em</th>
                  <th>Entrega Expectável</th>
                  <th>Aprovador</th>
                  <th>Estado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code>#{order.id}</code>
                    </td>
                    <td>
                      <div className="items-summary-chips">
                        {(order.items || []).map((i) => (
                          <span key={i.id || i.equipmentId} className="item-chip">
                            {i.quantity}x {i.equipmentName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {new Date(order.creationDate).toLocaleDateString('pt-PT')}
                    </td>
                    <td>
                      {new Date(order.expectedDeliveryDate).toLocaleDateString(
                        'pt-PT'
                      )}
                    </td>
                    <td>{order.approverName || '—'}</td>
                    <td>
                      <StatusBadge status={order.status} size="sm" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <Eye size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
