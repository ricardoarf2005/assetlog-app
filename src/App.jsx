import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { CatalogPage } from './pages/CatalogPage';
import { OrdersPage } from './pages/OrdersPage';
import { NotificationsTrackingPage } from './pages/NotificationsTrackingPage';
import { UsersPage } from './pages/UsersPage';
import { CartDrawer } from './components/CartDrawer';
import { OrderDetailModal } from './components/OrderDetailModal';
import './App.css';

function MainRouter() {
  const {
    currentUser,
    activeTab,
    selectedOrderId,
    setSelectedOrderId,
  } = useApp();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Layout>
      {activeTab === 'dashboard' && <EmployeeDashboard />}
      {activeTab === 'manager-dashboard' && <ManagerDashboard />}
      {activeTab === 'catalog' && <CatalogPage />}
      {activeTab === 'orders' && <OrdersPage />}
      {activeTab === 'notifications' && <NotificationsTrackingPage />}
      {activeTab === 'users' && <UsersPage />}

      <CartDrawer />
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
