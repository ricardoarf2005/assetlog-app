import { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Eye,
  Filter,
  User,
  ShieldCheck,
  Layers,
  Hash,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { orderApi } from '../services/api';
import { StatusEnum, STATUS_META } from '../constants/enums';
import { StatusBadge } from '../components/StatusBadge';

export function OrdersPage() {
  const {
    currentUser,
    isManager,
    userOrders,
    allOrders,
    setSelectedOrderId,
    setActiveTab,
    addToast,
  } = useApp();

  // 'user' | 'approver' | 'status' | 'all'
  const [viewMode, setViewMode] = useState(isManager ? 'all' : 'user');
  const [statusFilter, setStatusFilter] = useState(StatusEnum.OPENED);
  const [search, setSearch] = useState('');
  const [directOrderId, setDirectOrderId] = useState('');

  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [fetchingView, setFetchingView] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadOrdersForView() {
      if (!currentUser) return;
      setFetchingView(true);
      try {
        if (viewMode === 'user') {
          const data = await orderApi.getUserOrders(currentUser.id);
          if (active) setDisplayedOrders(data);
        } else if (viewMode === 'approver') {
          const data = await orderApi.getApproverOrders(currentUser.id);
          if (active) setDisplayedOrders(data);
        } else if (viewMode === 'status') {
          const data = await orderApi.getOrdersByStatus(statusFilter);
          if (active) setDisplayedOrders(data);
        } else {
          if (active) setDisplayedOrders(allOrders);
        }
      } catch (err) {
        addToast(err.message || 'Erro ao consultar pedidos.', 'error');
      } finally {
        if (active) setFetchingView(false);
      }
    }
    loadOrdersForView();
    return () => {
      active = false;
    };
  }, [viewMode, statusFilter, currentUser, userOrders, allOrders, addToast]);

  const filtered = displayedOrders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchId = String(o.id).includes(q);
    const matchUser = (o.userName || '').toLowerCase().includes(q);
    const matchApprover = (o.approverName || '').toLowerCase().includes(q);
    const matchItem = (o.items || []).some((i) =>
      (i.equipmentName || '').toLowerCase().includes(q)
    );
    return matchId || matchUser || matchApprover || matchItem;
  });

  const handleDirectLookup = (e) => {
    e.preventDefault();
    if (!directOrderId.trim()) return;
    setSelectedOrderId(Number(directOrderId));
    setDirectOrderId('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Módulo 3 • Gestão de Pedidos & Máquina de Estados (OrderController)
          </span>
          <h1 className="page-title">Pedidos de Material Informático</h1>
          <p className="page-subtitle">
            Consulte pedidos por utilizador, aprovador ou estado, acompanhe o
            histórico de tracking e execute transições de aprovação ou devolução.
          </p>
        </div>

        <div className="page-actions">
          <form className="direct-id-lookup" onSubmit={handleDirectLookup}>
            <Hash size={15} />
            <input
              type="number"
              min={1}
              placeholder="Ir para ID #"
              value={directOrderId}
              onChange={(e) => setDirectOrderId(e.target.value)}
            />
            <button type="submit" className="btn btn-ghost btn-sm">
              Abrir
            </button>
          </form>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveTab('catalog')}
          >
            <PlusCircle size={17} /> Novo Pedido (POST /api/order)
          </button>
        </div>
      </div>

      {/* Endpoint View Selector Tabs */}
      <div className="endpoint-tabs-bar">
        <button
          type="button"
          className={`endpoint-tab ${viewMode === 'user' ? 'active' : ''}`}
          onClick={() => setViewMode('user')}
        >
          <User size={16} />
          <div>
            <strong>Meus Pedidos</strong>
            <code>GET /api/order/user/{currentUser?.id}</code>
          </div>
        </button>

        <button
          type="button"
          className={`endpoint-tab ${viewMode === 'approver' ? 'active' : ''}`}
          onClick={() => setViewMode('approver')}
        >
          <ShieldCheck size={16} />
          <div>
            <strong>Pedidos do Aprovador</strong>
            <code>GET /api/order/approver/{currentUser?.id}</code>
          </div>
        </button>

        <button
          type="button"
          className={`endpoint-tab ${viewMode === 'status' ? 'active' : ''}`}
          onClick={() => setViewMode('status')}
        >
          <Filter size={16} />
          <div>
            <strong>Por Estado ({statusFilter})</strong>
            <code>GET /api/order/status/{statusFilter}</code>
          </div>
        </button>

        <button
          type="button"
          className={`endpoint-tab ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          <Layers size={16} />
          <div>
            <strong>Todos os Pedidos ({allOrders.length})</strong>
            <code>Visão Global</code>
          </div>
        </button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Filtrar por nº pedido, colaborador, gestor ou equipamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {viewMode === 'status' && (
          <div className="category-tabs">
            {Object.values(StatusEnum).map((st) => (
              <button
                key={st}
                type="button"
                className={`cat-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {STATUS_META[st]?.label || st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="panel-card">
        {fetchingView ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>A consultar endpoint do OrderController...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h4>Nenhum pedido encontrado nesta vista</h4>
            <p>
              Experimente alterar o filtro de estado ou alternar para outra
              vista de endpoint acima.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Pedido</th>
                  <th>Requisitante</th>
                  <th>Equipamentos Requisitados</th>
                  <th>Data Criação</th>
                  <th>Entrega Expectável</th>
                  <th>Gestor / Aprovador</th>
                  <th>Estado Atual</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code className="order-id-code">#{order.id}</code>
                    </td>
                    <td>
                      <div className="cell-title">
                        {order.userName || `User #${order.userId}`}
                      </div>
                      <div className="cell-sub">UserId: {order.userId}</div>
                    </td>
                    <td>
                      <div className="items-summary-chips">
                        {(order.items || []).map((item) => (
                          <span
                            key={item.id || item.equipmentId}
                            className="item-chip"
                          >
                            <strong>{item.quantity}x</strong>{' '}
                            {item.equipmentName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {new Date(order.creationDate).toLocaleDateString(
                        'pt-PT',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </td>
                    <td>
                      {new Date(order.expectedDeliveryDate).toLocaleDateString(
                        'pt-PT',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </td>
                    <td>
                      {order.approverName ? (
                        <div>
                          <div className="cell-title">{order.approverName}</div>
                          <div className="cell-sub">
                            ApproverId: {order.approverId}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">Não atribuído</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={order.status} size="sm" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <Eye size={14} />{' '}
                        {isManager ? 'Gerir / Estado' : 'Ver Detalhes'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
