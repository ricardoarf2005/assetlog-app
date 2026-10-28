import {
  LayoutDashboard,
  BarChart3,
  PackageSearch,
  ClipboardList,
  Bell,
  Users,
  ShoppingBag,
  LogOut,
  RefreshCw,
  RotateCcw,
  Radio,
  Shield,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RoleBadge, DepartmentBadge } from './StatusBadge';

export function Layout({ children }) {
  const {
    users,
    currentUser,
    isManager,
    activeTab,
    setActiveTab,
    cart,
    setIsCartOpen,
    totalUnreadCount,
    unreadOrderNotifsCount,
    unreadStockNotifsCount,
    switchDemoUser,
    logout,
    refreshAll,
    handleResetDemo,
    apiStatus,
    toasts,
    loading,
  } = useApp();

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Colaborador',
      moduleNum: 'Mód. 5',
      icon: LayoutDashboard,
    },
    {
      id: 'manager-dashboard',
      label: 'Dashboard de Gestão',
      moduleNum: 'Mód. 6',
      icon: BarChart3,
      managerHighlight: true,
    },
    {
      id: 'catalog',
      label: 'Catálogo & Stock',
      moduleNum: 'Mód. 2',
      icon: PackageSearch,
    },
    {
      id: 'orders',
      label: 'Pedidos de Material',
      moduleNum: 'Mód. 3',
      icon: ClipboardList,
    },
    {
      id: 'notifications',
      label: 'Alertas & Tracking',
      moduleNum: 'Mód. 4',
      icon: Bell,
      badge: totalUnreadCount > 0 ? totalUnreadCount : null,
    },
    {
      id: 'users',
      label: 'Gestão de Utilizadores',
      moduleNum: 'Mód. 1',
      icon: Users,
    },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="brand-header">
          <div className="brand-logo">AL</div>
          <div className="brand-text">
            <span className="brand-title">AssetLog</span>
            <span className="brand-subtitle">Natixis IT Asset Portal</span>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="user-avatar">
            {currentUser?.name
              ?.split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="user-meta">
            <div className="user-name">{currentUser?.name}</div>
            <div className="user-email">{currentUser?.email}</div>
            <div className="user-badges">
              <RoleBadge role={currentUser?.role} />
              <DepartmentBadge department={currentUser?.department} />
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Módulos do Sistema</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} className="nav-icon" />
                <div className="nav-label-wrap">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-module-tag">{item.moduleNum}</span>
                </div>
                {item.badge && (
                  <span className="nav-badge-count">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="api-diagnostic-box">
            <div className="api-diag-header">
              <Radio
                size={14}
                className={
                  apiStatus.lastSource === 'api'
                    ? 'pulse-green'
                    : 'pulse-purple'
                }
              />
              <span>
                {apiStatus.lastSource === 'api'
                  ? 'API C# (.NET) Ligada'
                  : 'Modo Híbrido (API + Local)'}
              </span>
            </div>
            {apiStatus.lastEndpoint && (
              <div className="api-diag-endpoint" title={apiStatus.lastEndpoint}>
                <code>{apiStatus.lastEndpoint}</code>
              </div>
            )}
            <div className="api-diag-actions">
              <button
                type="button"
                className="diag-btn"
                onClick={() => refreshAll()}
                title="Sincronizar com a API"
              >
                <RefreshCw size={12} className={loading ? 'spin' : ''} /> Sync
              </button>
              <button
                type="button"
                className="diag-btn"
                onClick={handleResetDemo}
                title="Repor dados de demonstração iniciais"
              >
                <RotateCcw size={12} /> Reset Demo
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Topbar with Quick Role/User Switcher */}
        <header className="app-topbar">
          <div className="topbar-left">
            <div className="quick-switcher">
              <span className="switcher-label">
                {isManager ? <Shield size={15} /> : <UserCheck size={15} />}
                Simulador Rápido de Perfil / Utilizador:
              </span>
              <select
                className="switcher-select"
                value={currentUser?.id || 1}
                onChange={(e) => switchDemoUser(Number(e.target.value))}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    #{u.id} — {u.name} [{u.role} • {u.department}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-btn"
              onClick={() => setActiveTab('notifications')}
              title={`Notificações de Pedidos (${unreadOrderNotifsCount}) ${
                isManager ? `+ Alertas de Stock (${unreadStockNotifsCount})` : ''
              }`}
            >
              <Bell size={18} />
              <span>Alertas</span>
              {totalUnreadCount > 0 && (
                <span className="topbar-badge">{totalUnreadCount}</span>
              )}
            </button>

            <button
              type="button"
              className="topbar-btn primary"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag size={18} />
              <span>Cesto de Pedido</span>
              {cartCount > 0 && (
                <span className="topbar-badge light">{cartCount}</span>
              )}
            </button>

            <button
              type="button"
              className="icon-btn"
              onClick={logout}
              title="Terminar Sessão"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="app-content">{children}</main>
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'info' && <Info size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
