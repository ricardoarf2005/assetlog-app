/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  userApi,
  equipmentApi,
  orderApi,
  subscribeApiStatus,
  resetLocalDemoData,
} from '../services/api';
import { RoleEnum } from '../constants/enums';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('assetlog_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [equipments, setEquipments] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stockNotifications, setStockNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [apiStatus, setApiStatus] = useState({
    mode: 'hybrid',
    lastEndpoint: null,
    lastSource: null,
  });

  useEffect(() => {
    return subscribeApiStatus((status) => setApiStatus(status));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const refreshAll = useCallback(
    async (targetUser = currentUser) => {
      try {
        const [usersList, eqList] = await Promise.all([
          userApi.getUsers(),
          equipmentApi.getAll(),
        ]);
        setUsers(usersList);
        setEquipments(eqList);

        if (targetUser) {
          const [myOrders, globalOrders, myNotifs, sNotifs] = await Promise.all([
            orderApi.getUserOrders(targetUser.id),
            orderApi.getAllOrders(),
            orderApi.getUserNotifications(targetUser.id),
            equipmentApi.getStockNotifications(),
          ]);
          setUserOrders(myOrders);
          setAllOrders(globalOrders);
          setNotifications(myNotifs);
          setStockNotifications(sNotifs);
        }
      } catch (err) {
        addToast(err.message || 'Erro ao carregar dados.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [currentUser, addToast]
  );

  useEffect(() => {
    refreshAll(currentUser);
  }, [currentUser, refreshAll]);

  const login = async (email, password) => {
    const res = await userApi.login(email, password);
    const user = res.user || res;
    setCurrentUser(user);
    localStorage.setItem('assetlog_current_user', JSON.stringify(user));
    addToast(`Bem-vindo(a), ${user.name}!`, 'success');
    await refreshAll(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('assetlog_current_user');
    localStorage.removeItem('assetlog_jwt');
    setCurrentUser(null);
    setCart([]);
    addToast('Sessão terminada com sucesso.', 'info');
  };

  const switchDemoUser = async (userId) => {
    const found = users.find((u) => u.id === Number(userId));
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('assetlog_current_user', JSON.stringify(found));
      addToast(
        `Perfil alterado para ${found.name} (${found.role})`,
        'info'
      );
      await refreshAll(found);
    }
  };

  const addToCart = (equipment, quantity = 1) => {
    if (!equipment.isActive) {
      addToast('Não é possível requisitar equipamento inativo.', 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.equipment.id === equipment.id);
      if (existing) {
        return prev.map((i) =>
          i.equipment.id === equipment.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { equipment, quantity }];
    });
    addToast(`"${equipment.name}" adicionado ao pedido.`, 'success');
  };

  const updateCartQty = (equipmentId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(equipmentId);
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.equipment.id === equipmentId ? { ...i, quantity: Number(quantity) } : i
      )
    );
  };

  const removeFromCart = (equipmentId) => {
    setCart((prev) => prev.filter((i) => i.equipment.id !== equipmentId));
  };

  const clearCart = () => setCart([]);

  const submitCartOrder = async (expectedDeliveryDate = null) => {
    if (!currentUser) return null;
    if (cart.length === 0) {
      addToast('Adicione pelo menos um equipamento ao pedido.', 'error');
      return null;
    }
    const created = await orderApi.createOrder({
      userId: currentUser.id,
      items: cart.map((c) => ({
        equipmentId: c.equipment.id,
        quantity: c.quantity,
      })),
      expectedDeliveryDate,
    });
    setCart([]);
    setIsCartOpen(false);
    addToast(`Pedido #${created.id} submetido com sucesso!`, 'success');
    await refreshAll(currentUser);
    return created;
  };

  const handleResetDemo = async () => {
    resetLocalDemoData();
    const freshUsers = await userApi.getUsers();
    const updatedCurrent =
      freshUsers.find((u) => u.id === currentUser?.id) || freshUsers[0];
    setCurrentUser(updatedCurrent);
    localStorage.setItem('assetlog_current_user', JSON.stringify(updatedCurrent));
    await refreshAll(updatedCurrent);
    addToast('Dados de demonstração restaurados para o estado inicial.', 'info');
  };

  const isManager = currentUser?.role === RoleEnum.MANAGER;
  const unreadOrderNotifsCount = notifications.filter((n) => !n.isRead).length;
  const unreadStockNotifsCount = isManager
    ? stockNotifications.filter((n) => !n.isRead).length
    : 0;
  const totalUnreadCount = unreadOrderNotifsCount + unreadStockNotifsCount;

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        isManager,
        equipments,
        userOrders,
        allOrders,
        notifications,
        stockNotifications,
        unreadOrderNotifsCount,
        unreadStockNotifsCount,
        totalUnreadCount,
        loading,
        cart,
        isCartOpen,
        setIsCartOpen,
        activeTab,
        setActiveTab,
        selectedOrderId,
        setSelectedOrderId,
        toasts,
        addToast,
        apiStatus,
        login,
        logout,
        switchDemoUser,
        refreshAll,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        submitCartOrder,
        handleResetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
