import {
  INITIAL_USERS,
  INITIAL_EQUIPMENTS,
  INITIAL_ORDERS,
  INITIAL_TRACKING_NOTIFICATIONS,
  INITIAL_STOCK_NOTIFICATIONS,
} from './mockData';
import { StatusEnum } from '../constants/enums';

const STORAGE_KEYS = {
  USERS: 'assetlog_users_v1',
  EQUIPMENTS: 'assetlog_equipments_v1',
  ORDERS: 'assetlog_orders_v1',
  TRACKING_NOTIFS: 'assetlog_tracking_notifs_v1',
  STOCK_NOTIFS: 'assetlog_stock_notifs_v1',
};

function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return structuredClone(fallback);
    }
    return JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

function saveStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function resetLocalDemoData() {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.EQUIPMENTS, JSON.stringify(INITIAL_EQUIPMENTS));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
  localStorage.setItem(
    STORAGE_KEYS.TRACKING_NOTIFS,
    JSON.stringify(INITIAL_TRACKING_NOTIFICATIONS)
  );
  localStorage.setItem(
    STORAGE_KEYS.STOCK_NOTIFS,
    JSON.stringify(INITIAL_STOCK_NOTIFICATIONS)
  );
}

// Connection diagnostics observer
let connectionListeners = [];
let lastApiStatus = {
  mode: 'hybrid', // 'connected' | 'hybrid' | 'fallback'
  lastEndpoint: null,
  lastSource: null, // 'api' | 'fallback'
};

export function subscribeApiStatus(cb) {
  connectionListeners.push(cb);
  cb(lastApiStatus);
  return () => {
    connectionListeners = connectionListeners.filter((x) => x !== cb);
  };
}

function notifyApiStatus(endpoint, source) {
  lastApiStatus = {
    mode: source === 'api' ? 'connected' : 'hybrid',
    lastEndpoint: endpoint,
    lastSource: source,
  };
  connectionListeners.forEach((cb) => cb(lastApiStatus));
}

async function tryFetchApi(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const token = localStorage.getItem('assetlog_jwt');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      notifyApiStatus(`${options.method || 'GET'} ${url}`, 'api');
      const text = await response.text();
      return { ok: true, data: text ? JSON.parse(text) : null };
    }

    // If 400 BadRequest or 404 with explicit API error message from OrderController
    if (response.status === 400) {
      const errBody = await response.json().catch(() => ({}));
      if (errBody?.message) {
        throw new Error(errBody.message);
      }
    }

    return { ok: false, status: response.status };
  } catch (err) {
    clearTimeout(timeout);
    if (err.message && !err.message.includes('fetch') && err.name !== 'AbortError') {
      // Rethrow business validation errors from API
      if (err.message.startsWith('Cannot order') || err.message.startsWith('Order must')) {
        throw err;
      }
    }
    return { ok: false, error: err };
  }
}

// ============================================================================
// 1. USER & AUTH CONTROLLER (/api/auth, /api/users) - Joana
// ============================================================================
export const userApi = {
  async login(email, password) {
    const res = await tryFetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.ok && res.data) {
      if (res.data.token) localStorage.setItem('assetlog_jwt', res.data.token);
      return res.data;
    }

    notifyApiStatus('POST /api/auth/login', 'fallback');
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const user =
      users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ||
      users[0];

    if (!user.isActive) {
      throw new Error('Esta conta de utilizador encontra-se desativada.');
    }

    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-${user.id}-${user.role}`;
    localStorage.setItem('assetlog_jwt', fakeToken);
    return { token: fakeToken, user };
  },

  async getMe(currentUserId = 1) {
    const res = await tryFetchApi('/api/auth/me');
    if (res.ok && res.data) return res.data;

    notifyApiStatus('GET /api/auth/me', 'fallback');
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    return users.find((u) => u.id === Number(currentUserId)) || users[0];
  },

  async getUsers() {
    const res = await tryFetchApi('/api/users');
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus('GET /api/users', 'fallback');
    return loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  async updateUser(id, payload) {
    const res = await tryFetchApi(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus(`PUT /api/users/${id}`, 'fallback');
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const idx = users.findIndex((u) => u.id === Number(id));
    if (idx === -1) throw new Error(`Utilizador #${id} não encontrado.`);
    users[idx] = { ...users[idx], ...payload, id: Number(id) };
    saveStore(STORAGE_KEYS.USERS, users);
    return users[idx];
  },

  async createUser(payload) {
    const res = await tryFetchApi('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus('POST /api/users', 'fallback');
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    const newUser = {
      id: nextId,
      name: payload.name,
      email: payload.email,
      role: payload.role || 'EMPLOYEE',
      department: payload.department || 'DEV',
      isActive: payload.isActive ?? true,
      typeOfContract: payload.typeOfContract || 'PERMANENT',
      endDate: payload.endDate || '2029-12-31T00:00:00Z',
    };
    users.push(newUser);
    saveStore(STORAGE_KEYS.USERS, users);
    return newUser;
  },

  async getMaterialEmPosse(userId) {
    const res = await tryFetchApi(`/api/users/${userId}/material-em-posse`);
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(`GET /api/users/${userId}/material-em-posse`, 'fallback');
    // Derive from orders in ONGOING or APPROVED state for this user
    const orders = await orderApi.getUserOrders(userId);
    const activeOrders = orders.filter(
      (o) => o.status === StatusEnum.ONGOING || o.status === StatusEnum.APPROVED
    );
    const itemsInPossession = [];
    activeOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        itemsInPossession.push({
          orderId: order.id,
          status: order.status,
          expectedDeliveryDate: order.expectedDeliveryDate,
          creationDate: order.creationDate,
          equipmentId: item.equipmentId,
          equipmentName: item.equipmentName,
          quantity: item.quantity,
        });
      });
    });
    return itemsInPossession;
  },
};

// ============================================================================
// 2. EQUIPMENT & STOCK CONTROLLER (/api/equipment) - Beatriz
// ============================================================================
export const equipmentApi = {
  async getAll({ category, onlyAvailable } = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (onlyAvailable !== undefined) params.set('available', String(onlyAvailable));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await tryFetchApi(`/api/equipment${qs}`);
    if (res.ok && Array.isArray(res.data)) {
      return res.data.map((e) => ({
        ...e,
        description: e.description ?? e.descritpion ?? '',
      }));
    }

    notifyApiStatus(`GET /api/equipment${qs}`, 'fallback');
    let list = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    if (category && category !== 'ALL') {
      list = list.filter((e) => e.category === category);
    }
    if (onlyAvailable) {
      list = list.filter((e) => e.isActive && e.stock > 0);
    }
    return list;
  },

  async create(payload) {
    const res = await tryFetchApi('/api/equipment', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        descritpion: payload.description, // support typo in Equipment.cs model
      }),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus('POST /api/equipment', 'fallback');
    const list = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const nextId = list.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const item = {
      id: nextId,
      name: payload.name,
      description: payload.description || '',
      category: payload.category,
      isActive: true,
      minStock: Number(payload.minStock ?? 3),
      stock: Number(payload.stock ?? 0),
    };
    list.push(item);
    saveStore(STORAGE_KEYS.EQUIPMENTS, list);
    return item;
  },

  async updateStock(equipmentId, newStock, minStock) {
    const res = await tryFetchApi('/api/equipment/stock', {
      method: 'PUT',
      body: JSON.stringify({ equipmentId, stock: Number(newStock), minStock }),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus('PUT /api/equipment/stock', 'fallback');
    const list = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const idx = list.findIndex((e) => e.id === Number(equipmentId));
    if (idx === -1) throw new Error('Equipamento não encontrado.');
    list[idx].stock = Math.max(0, Number(newStock));
    if (minStock !== undefined) {
      list[idx].minStock = Math.max(0, Number(minStock));
    }
    saveStore(STORAGE_KEYS.EQUIPMENTS, list);
    return list[idx];
  },

  async updateDetails(equipmentId, { name, description, category, minStock }) {
    const res = await tryFetchApi('/api/equipment/description', {
      method: 'PUT',
      body: JSON.stringify({
        id: equipmentId,
        name,
        description,
        descritpion: description,
        category,
        minStock,
      }),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus('PUT /api/equipment/description', 'fallback');
    const list = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const idx = list.findIndex((e) => e.id === Number(equipmentId));
    if (idx === -1) throw new Error('Equipamento não encontrado.');
    list[idx] = {
      ...list[idx],
      name: name ?? list[idx].name,
      description: description ?? list[idx].description,
      category: category ?? list[idx].category,
      minStock: minStock !== undefined ? Number(minStock) : list[idx].minStock,
    };
    saveStore(STORAGE_KEYS.EQUIPMENTS, list);
    return list[idx];
  },

  async setActiveStatus(equipmentId, isActive) {
    const endpoint = isActive ? '/api/equipment/activate' : '/api/equipment/deactivate';
    const res = await tryFetchApi(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ id: equipmentId, equipmentId }),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus(`PUT ${endpoint}`, 'fallback');
    const list = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const idx = list.findIndex((e) => e.id === Number(equipmentId));
    if (idx === -1) throw new Error('Equipamento não encontrado.');
    list[idx].isActive = Boolean(isActive);
    saveStore(STORAGE_KEYS.EQUIPMENTS, list);
    return list[idx];
  },

  async getStockNotifications(isRead) {
    const qs = isRead !== undefined && isRead !== null ? `?isRead=${isRead}` : '';
    const res = await tryFetchApi(`/api/equipment/notification${qs}`);
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(`GET /api/equipment/notification${qs}`, 'fallback');
    let list = loadStore(STORAGE_KEYS.STOCK_NOTIFS, INITIAL_STOCK_NOTIFICATIONS);
    if (isRead !== undefined && isRead !== null) {
      list = list.filter((n) => n.isRead === Boolean(isRead));
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  },

  async markStockNotificationRead(notificationId) {
    const res = await tryFetchApi('/api/equipment/notification/read', {
      method: 'PUT',
      body: JSON.stringify({ id: notificationId }),
    });
    if (res.ok && res.data) return res.data;

    notifyApiStatus('PUT /api/equipment/notification/read', 'fallback');
    const list = loadStore(STORAGE_KEYS.STOCK_NOTIFS, INITIAL_STOCK_NOTIFICATIONS);
    const idx = list.findIndex((n) => n.id === Number(notificationId));
    if (idx !== -1) {
      list[idx].isRead = true;
      saveStore(STORAGE_KEYS.STOCK_NOTIFS, list);
      return list[idx];
    }
    return null;
  },
};

// ============================================================================
// 3. ORDER CONTROLLER (/api/order) - Ricardo (Implemented in AssetLog.Api!)
// ============================================================================
export const orderApi = {
  // GET /api/order/user/{userId}
  async getUserOrders(userId) {
    const res = await tryFetchApi(`/api/order/user/${userId}`);
    if (res.ok && Array.isArray(res.data)) {
      // If the real DB is connected and has orders (or even empty), return them;
      // If empty on initial demo, we still return API response unless user wants local demo
      return res.data;
    }

    notifyApiStatus(`GET /api/order/user/${userId}`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return orders
      .filter((o) => o.userId === Number(userId))
      .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
  },

  // GET /api/order/approver/{approverId}
  async getApproverOrders(approverId) {
    const res = await tryFetchApi(`/api/order/approver/${approverId}`);
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(`GET /api/order/approver/${approverId}`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return orders
      .filter((o) => o.approverId === Number(approverId))
      .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
  },

  // GET /api/order/status/{status}
  async getOrdersByStatus(status) {
    const res = await tryFetchApi(`/api/order/status/${status}`);
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(`GET /api/order/status/${status}`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return orders
      .filter((o) => o.status === status)
      .sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
  },

  // Helper to fetch all orders across statuses for Manager Dashboard / Global view
  async getAllOrders() {
    const statuses = Object.values(StatusEnum);
    // Try fetching OPENED from API first to check if real API is up
    const probe = await tryFetchApi(`/api/order/status/${StatusEnum.OPENED}`);
    if (probe.ok && Array.isArray(probe.data)) {
      const restPromises = statuses
        .filter((s) => s !== StatusEnum.OPENED)
        .map((s) => tryFetchApi(`/api/order/status/${s}`));
      const restResults = await Promise.all(restPromises);
      const combined = [
        ...probe.data,
        ...restResults.flatMap((r) => (r.ok && Array.isArray(r.data) ? r.data : [])),
      ];
      const unique = Array.from(new Map(combined.map((o) => [o.id, o])).values());
      return unique.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
    }

    notifyApiStatus('GET /api/order/status/*', 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return orders.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
  },

  // GET /api/order/{orderId} & GET /api/order/user/{userId}/{orderId}
  async getOrderDetails(orderId, userId = null) {
    const url = userId
      ? `/api/order/user/${userId}/${orderId}`
      : `/api/order/${orderId}`;
    const res = await tryFetchApi(url);
    if (res.ok && res.data) return res.data;

    notifyApiStatus(`GET ${url}`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const found = orders.find((o) => o.id === Number(orderId));
    if (!found) throw new Error(`Order with ID ${orderId} was not found.`);
    if (userId && found.userId !== Number(userId)) {
      throw new Error(`Order #${orderId} does not belong to User #${userId}.`);
    }
    return found;
  },

  // POST /api/order
  async createOrder({ userId, items, expectedDeliveryDate }) {
    const payload = {
      userId: Number(userId),
      items: items.map((i) => ({
        equipmentId: Number(i.equipmentId),
        quantity: Number(i.quantity),
      })),
      ...(expectedDeliveryDate ? { expectedDeliveryDate } : {}),
    };

    const res = await tryFetchApi('/api/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) return res.data;

    // Fallback implementation mirroring OrderService.CreateOrderAsync
    notifyApiStatus('POST /api/order', 'fallback');
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const equipments = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    const user = users.find((u) => u.id === Number(userId)) || users[0];
    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const grouped = new Map();
    for (const item of items) {
      const eqId = Number(item.equipmentId);
      grouped.set(eqId, (grouped.get(eqId) || 0) + Number(item.quantity));
    }

    const orderItems = [];
    let nextItemId =
      orders.flatMap((o) => o.items || []).reduce((m, i) => Math.max(m, i.id || 0), 0) + 1;

    for (const [eqId, qty] of grouped.entries()) {
      const eq = equipments.find((e) => e.id === eqId);
      if (!eq) throw new Error(`Equipment not found: ${eqId}`);
      if (!eq.isActive) {
        throw new Error(`Cannot order inactive equipment(s): ${eq.name}.`);
      }
      orderItems.push({
        id: nextItemId++,
        equipmentId: eq.id,
        equipmentName: eq.name,
        description: eq.description,
        category: eq.category,
        quantity: qty,
      });
    }

    const now = new Date();
    const defaultExpected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextOrderId = orders.reduce((max, o) => Math.max(max, o.id), 100) + 1;

    const newOrder = {
      id: nextOrderId,
      userId: user.id,
      userName: user.name,
      approverId: null,
      approverName: null,
      creationDate: now.toISOString(),
      status: StatusEnum.OPENED,
      expectedDeliveryDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate).toISOString()
        : defaultExpected.toISOString(),
      items: orderItems,
      trackings: [],
    };

    orders.unshift(newOrder);
    saveStore(STORAGE_KEYS.ORDERS, orders);
    return newOrder;
  },

  // PUT /api/order/{orderId}/status
  async updateOrderStatus(orderId, { approverId, status, comments }) {
    const payload = {
      approverId: Number(approverId),
      status,
      comments: comments || null,
    };

    const res = await tryFetchApi(`/api/order/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.ok && res.data) return res.data;

    // Fallback mirroring exact OrderService.UpdateOrderStatusAsync logic!
    notifyApiStatus(`PUT /api/order/${orderId}/status`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const equipments = loadStore(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trackingNotifs = loadStore(
      STORAGE_KEYS.TRACKING_NOTIFS,
      INITIAL_TRACKING_NOTIFICATIONS
    );
    const stockNotifs = loadStore(
      STORAGE_KEYS.STOCK_NOTIFS,
      INITIAL_STOCK_NOTIFICATIONS
    );

    const orderIdx = orders.findIndex((o) => o.id === Number(orderId));
    if (orderIdx === -1) throw new Error(`Order with ID ${orderId} was not found.`);

    const order = orders[orderIdx];
    const approver =
      users.find((u) => u.id === Number(approverId)) || users[0];

    const previousStatus = order.status;
    let targetStatus = status;
    order.approverId = approver.id;
    order.approverName = approver.name;

    let notificationMessage;
    const nowIso = new Date().toISOString();

    if (targetStatus === StatusEnum.APPROVED && previousStatus !== StatusEnum.APPROVED) {
      // Check stock availability just like OrderService.cs lines 112-132
      const insufficientItems = [];
      for (const item of order.items) {
        const eq = equipments.find((e) => e.id === item.equipmentId);
        const available = eq ? eq.stock : 0;
        if (available < item.quantity) {
          insufficientItems.push({ item, eq, available });
        }
      }

      if (insufficientItems.length > 0) {
        targetStatus = StatusEnum.BLOCKED;
        const itemNames = insufficientItems
          .map(
            ({ item, available }) =>
              `${item.equipmentName} (requested: ${item.quantity}, available: ${available})`
          )
          .join(', ');
        notificationMessage = `Order #${order.id} was blocked due to insufficient stock for: ${itemNames}.`;

        let nextStockNotifId =
          stockNotifs.reduce((m, n) => Math.max(m, n.id), 400) + 1;
        for (const { item, available } of insufficientItems) {
          stockNotifs.unshift({
            id: nextStockNotifId++,
            approverId: approver.id,
            equipmentId: item.equipmentId,
            equipmentName: item.equipmentName,
            isRead: false,
            date: nowIso,
            message: `Insufficient stock for '${item.equipmentName}' on Order #${order.id}. Requested: ${item.quantity}, Available: ${available}.`,
          });
        }
      } else {
        // Deduct stock and check MinStock just like OrderService.cs lines 135-149
        let nextStockNotifId =
          stockNotifs.reduce((m, n) => Math.max(m, n.id), 400) + 1;
        for (const item of order.items) {
          const eq = equipments.find((e) => e.id === item.equipmentId);
          if (eq) {
            eq.stock -= item.quantity;
            if (eq.stock <= eq.minStock) {
              stockNotifs.unshift({
                id: nextStockNotifId++,
                approverId: approver.id,
                equipmentId: eq.id,
                equipmentName: eq.name,
                isRead: false,
                date: nowIso,
                message: `Low stock alert for '${eq.name}'. Current stock: ${eq.stock} (MinStock: ${eq.minStock}).`,
              });
            }
          }
        }
        notificationMessage = `Order #${order.id} status updated to ${targetStatus} by ${approver.name}.`;
      }
    } else if (
      targetStatus === StatusEnum.RETURNED &&
      previousStatus !== StatusEnum.RETURNED
    ) {
      // Restore stock just like OrderService.cs lines 154-162
      for (const item of order.items) {
        const eq = equipments.find((e) => e.id === item.equipmentId);
        if (eq) {
          eq.stock += item.quantity;
        }
      }
      notificationMessage = `Order #${order.id} items were returned and status updated to ${targetStatus}.`;
    } else {
      notificationMessage = `Order #${order.id} status updated to ${targetStatus} by ${approver.name}.`;
    }

    if (comments && comments.trim()) {
      notificationMessage += ` Comments: ${comments.trim()}`;
    }

    order.status = targetStatus;

    const nextTrackingId =
      orders
        .flatMap((o) => o.trackings || [])
        .reduce((m, t) => Math.max(m, t.id || 0), 200) + 1;

    const newTracking = {
      id: nextTrackingId,
      approverId: approver.id,
      approverName: approver.name,
      date: nowIso,
      status: targetStatus,
      comments: comments || null,
    };

    order.trackings = [newTracking, ...(order.trackings || [])];

    const nextNotifId =
      trackingNotifs.reduce((m, n) => Math.max(m, n.id), 300) + 1;
    trackingNotifs.unshift({
      id: nextNotifId,
      userId: order.userId,
      trackingId: nextTrackingId,
      orderId: order.id,
      status: targetStatus,
      message: notificationMessage,
      date: nowIso,
      isRead: false,
    });

    saveStore(STORAGE_KEYS.EQUIPMENTS, equipments);
    saveStore(STORAGE_KEYS.ORDERS, orders);
    saveStore(STORAGE_KEYS.TRACKING_NOTIFS, trackingNotifs);
    saveStore(STORAGE_KEYS.STOCK_NOTIFS, stockNotifs);

    return order;
  },

  // PUT /api/order/{orderId}/expected-delivery-date
  async updateExpectedDeliveryDate(
    orderId,
    { approverId, expectedDeliveryDate, comments }
  ) {
    const payload = {
      approverId: Number(approverId),
      expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
      comments: comments || null,
    };

    const res = await tryFetchApi(
      `/api/order/${orderId}/expected-delivery-date`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    if (res.ok && res.data) return res.data;

    notifyApiStatus(
      `PUT /api/order/${orderId}/expected-delivery-date`,
      'fallback'
    );
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    const users = loadStore(STORAGE_KEYS.USERS, INITIAL_USERS);
    const trackingNotifs = loadStore(
      STORAGE_KEYS.TRACKING_NOTIFS,
      INITIAL_TRACKING_NOTIFICATIONS
    );

    const orderIdx = orders.findIndex((o) => o.id === Number(orderId));
    if (orderIdx === -1) throw new Error(`Order with ID ${orderId} was not found.`);

    const order = orders[orderIdx];
    const approver =
      users.find((u) => u.id === Number(approverId)) || users[0];

    const formattedDate = new Date(expectedDeliveryDate)
      .toISOString()
      .slice(0, 10);
    order.expectedDeliveryDate = new Date(expectedDeliveryDate).toISOString();
    if (!order.approverId) {
      order.approverId = approver.id;
      order.approverName = approver.name;
    }

    const nowIso = new Date().toISOString();
    let message = `Order #${order.id} expected delivery date updated to ${formattedDate} by ${approver.name}.`;
    if (comments && comments.trim()) {
      message += ` Comments: ${comments.trim()}`;
    }

    const nextTrackingId =
      orders
        .flatMap((o) => o.trackings || [])
        .reduce((m, t) => Math.max(m, t.id || 0), 200) + 1;

    order.trackings = [
      {
        id: nextTrackingId,
        approverId: approver.id,
        approverName: approver.name,
        date: nowIso,
        status: order.status,
        comments:
          comments?.trim() ||
          `Expected delivery date changed to ${formattedDate}`,
      },
      ...(order.trackings || []),
    ];

    const nextNotifId =
      trackingNotifs.reduce((m, n) => Math.max(m, n.id), 300) + 1;
    trackingNotifs.unshift({
      id: nextNotifId,
      userId: order.userId,
      trackingId: nextTrackingId,
      orderId: order.id,
      status: order.status,
      message,
      date: nowIso,
      isRead: false,
    });

    saveStore(STORAGE_KEYS.ORDERS, orders);
    saveStore(STORAGE_KEYS.TRACKING_NOTIFS, trackingNotifs);
    return order;
  },

  // GET /api/order/notification/user/{userId}?isRead=true|false
  async getUserNotifications(userId, isRead = null) {
    const qs =
      isRead !== null && isRead !== undefined ? `?isRead=${isRead}` : '';
    const res = await tryFetchApi(
      `/api/order/notification/user/${userId}${qs}`
    );
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(
      `GET /api/order/notification/user/${userId}${qs}`,
      'fallback'
    );
    let list = loadStore(
      STORAGE_KEYS.TRACKING_NOTIFS,
      INITIAL_TRACKING_NOTIFICATIONS
    ).filter((n) => n.userId === Number(userId));

    if (isRead !== null && isRead !== undefined) {
      list = list.filter((n) => n.isRead === Boolean(isRead));
    }
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // PUT /api/order/notification/{notificationId}/read
  async markNotificationAsRead(notificationId) {
    const res = await tryFetchApi(
      `/api/order/notification/${notificationId}/read`,
      { method: 'PUT' }
    );
    if (res.ok && res.data) return res.data;

    notifyApiStatus(
      `PUT /api/order/notification/${notificationId}/read`,
      'fallback'
    );
    const list = loadStore(
      STORAGE_KEYS.TRACKING_NOTIFS,
      INITIAL_TRACKING_NOTIFICATIONS
    );
    const idx = list.findIndex((n) => n.id === Number(notificationId));
    if (idx !== -1) {
      list[idx].isRead = true;
      saveStore(STORAGE_KEYS.TRACKING_NOTIFS, list);
      return list[idx];
    }
    return null;
  },

  // PUT /api/order/notification/user/{userId}/read
  async markAllUserNotificationsAsRead(userId, notificationIds = null) {
    const res = await tryFetchApi(
      `/api/order/notification/user/${userId}/read`,
      {
        method: 'PUT',
        body: JSON.stringify(notificationIds),
      }
    );
    if (res.ok && res.data) return res.data;

    notifyApiStatus(
      `PUT /api/order/notification/user/${userId}/read`,
      'fallback'
    );
    const list = loadStore(
      STORAGE_KEYS.TRACKING_NOTIFS,
      INITIAL_TRACKING_NOTIFICATIONS
    );
    let updatedCount = 0;
    list.forEach((n) => {
      if (
        n.userId === Number(userId) &&
        !n.isRead &&
        (!notificationIds || notificationIds.includes(n.id))
      ) {
        n.isRead = true;
        updatedCount++;
      }
    });
    saveStore(STORAGE_KEYS.TRACKING_NOTIFS, list);
    return { updatedCount };
  },
};

// ============================================================================
// 4. TRACKING CONTROLLER (/api/tracking) - Francisca
// ============================================================================
export const trackingApi = {
  async getOrderTrackings(orderId) {
    const res = await tryFetchApi(`/api/tracking/order/${orderId}`);
    if (res.ok && Array.isArray(res.data)) return res.data;

    notifyApiStatus(`GET /api/tracking/order/${orderId}`, 'fallback');
    const order = await orderApi.getOrderDetails(orderId);
    return order.trackings || [];
  },

  async getTrackingDetails(trackingId) {
    const res = await tryFetchApi(`/api/tracking/${trackingId}`);
    if (res.ok && res.data) return res.data;

    notifyApiStatus(`GET /api/tracking/${trackingId}`, 'fallback');
    const orders = loadStore(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    for (const o of orders) {
      const found = (o.trackings || []).find((t) => t.id === Number(trackingId));
      if (found) return { ...found, orderId: o.id, userName: o.userName };
    }
    return null;
  },
};
