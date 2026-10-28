import { useState } from 'react';
import {
  Search,
  UserPlus,
  Edit3,
  Package,
  UserCheck,
  X,
  Calendar,
  Eye,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { userApi } from '../services/api';
import {
  RoleEnum,
  ROLE_META,
  DepartmentEnum,
  DEPARTMENT_META,
  TypeOfContractEnum,
  CONTRACT_META,
} from '../constants/enums';
import {
  RoleBadge,
  DepartmentBadge,
  StatusBadge,
} from '../components/StatusBadge';

export function UsersPage() {
  const {
    users,
    currentUser,
    isManager,
    switchDemoUser,
    setSelectedOrderId,
    refreshAll,
    addToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Create / Edit User modal
  const [editingUser, setEditingUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: RoleEnum.EMPLOYEE,
    department: DepartmentEnum.DEV,
    typeOfContract: TypeOfContractEnum.PERMANENT,
    endDate: '2029-12-31',
    isActive: true,
  });

  // Material em posse modal (GET /users/{id}/material-em-posse)
  const [possessionModalUser, setPossessionModalUser] = useState(null);
  const [possessionItems, setPossessionItems] = useState([]);
  const [loadingPossession, setLoadingPossession] = useState(false);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (deptFilter !== 'ALL' && u.department !== deptFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    }
    return true;
  });

  const openEditUser = (u) => {
    setIsCreating(false);
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      typeOfContract: u.typeOfContract,
      endDate: (u.endDate || '2029-12-31').slice(0, 10),
      isActive: u.isActive,
    });
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setIsCreating(true);
    setFormData({
      name: '',
      email: '',
      role: RoleEnum.EMPLOYEE,
      department: DepartmentEnum.DEV,
      typeOfContract: TypeOfContractEnum.PERMANENT,
      endDate: '2029-12-31',
      isActive: true,
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (isCreating) {
        await userApi.createUser({
          ...formData,
          endDate: new Date(formData.endDate).toISOString(),
        });
        addToast(`Utilizador "${formData.name}" criado com sucesso.`, 'success');
      } else if (editingUser) {
        await userApi.updateUser(editingUser.id, {
          ...formData,
          endDate: new Date(formData.endDate).toISOString(),
        });
        addToast(
          `Utilizador #${editingUser.id} (${formData.name}) atualizado.`,
          'success'
        );
      }
      setEditingUser(null);
      setIsCreating(false);
      await refreshAll();
    } catch (err) {
      addToast(err.message || 'Erro ao guardar utilizador.', 'error');
    }
  };

  const handleOpenPossession = async (u) => {
    setPossessionModalUser(u);
    setLoadingPossession(true);
    try {
      const items = await userApi.getMaterialEmPosse(u.id);
      setPossessionItems(items);
    } catch (err) {
      addToast(err.message || 'Erro ao consultar material em posse.', 'error');
    } finally {
      setLoadingPossession(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">
            Módulo 1 • Gestão de Utilizadores e Autenticação (UserController)
          </span>
          <h1 className="page-title">Diretório de Colaboradores & Perfis</h1>
          <p className="page-subtitle">
            Consulte os utilizadores da plataforma, atualize departamentos,
            contratos ou perfis de acesso e verifique o material em posse.
          </p>
        </div>

        <div className="page-actions">
          {isManager && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateUser}
            >
              <UserPlus size={17} /> Novo Utilizador
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-toggles">
          <select
            className="switcher-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Todos os Perfis (RoleEnum)</option>
            {Object.keys(ROLE_META).map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>

          <select
            className="switcher-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">Todos os Departamentos</option>
            {Object.keys(DEPARTMENT_META).map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_META[d].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="panel-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Colaborador</th>
                <th>Perfil (Role)</th>
                <th>Departamento</th>
                <th>Contrato & Fim</th>
                <th>Estado</th>
                <th>Ações (UserController)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className={isSelf ? 'highlight-row' : ''}>
                    <td>
                      <code>#{u.id}</code>
                    </td>
                    <td>
                      <div className="cell-title">
                        {u.name}{' '}
                        {isSelf && <span className="self-tag">Sessão Ativa</span>}
                      </div>
                      <div className="cell-sub">{u.email}</div>
                    </td>
                    <td>
                      <RoleBadge role={u.role} />
                    </td>
                    <td>
                      <DepartmentBadge department={u.department} />
                    </td>
                    <td>
                      <div className="cell-title">
                        {CONTRACT_META[u.typeOfContract]?.label ||
                          u.typeOfContract}
                      </div>
                      <div className="cell-sub">
                        Fim:{' '}
                        {u.endDate
                          ? new Date(u.endDate).toLocaleDateString('pt-PT')
                          : '—'}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`active-dot-badge ${
                          u.isActive ? 'active' : 'inactive'
                        }`}
                      >
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenPossession(u)}
                          title={`GET /api/users/${u.id}/material-em-posse`}
                        >
                          <Package size={14} /> Material em Posse
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditUser(u)}
                          title={`PUT /api/users/${u.id}`}
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => switchDemoUser(u.id)}
                          >
                            <UserCheck size={14} /> Usar Perfil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create User Modal */}
      {(editingUser || isCreating) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditingUser(null);
            setIsCreating(false);
          }}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">
                  {isCreating
                    ? 'POST /api/users'
                    : `PUT /api/users/${editingUser.id}`}
                </div>
                <h2 className="modal-title">
                  {isCreating
                    ? 'Criar Novo Utilizador'
                    : `Editar Utilizador #${editingUser.id}`}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setEditingUser(null);
                  setIsCreating(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSaveUser}>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>E-mail Corporativo *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Perfil (RoleEnum)</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    {Object.keys(ROLE_META).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label} ({r})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Departamento (DepartmentEnum)</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  >
                    {Object.keys(DEPARTMENT_META).map((d) => (
                      <option key={d} value={d}>
                        {DEPARTMENT_META[d].label} ({d})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Tipo de Contrato (TypeOfContractEnum)</label>
                  <select
                    value={formData.typeOfContract}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        typeOfContract: e.target.value,
                      })
                    }
                  >
                    {Object.keys(CONTRACT_META).map((c) => (
                      <option key={c} value={c}>
                        {CONTRACT_META[c].label} ({c})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Data de Fim de Contrato (EndDate)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  <span>Conta de utilizador ativa (IsActive)</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingUser(null);
                    setIsCreating(false);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Utilizador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material em Posse Modal */}
      {possessionModalUser && (
        <div
          className="modal-backdrop"
          onClick={() => setPossessionModalUser(null)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">
                  GET /api/users/{possessionModalUser.id}/material-em-posse
                </div>
                <h2 className="modal-title">
                  Material em Posse — {possessionModalUser.name}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPossessionModalUser(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingPossession ? (
                <div className="loading-state">
                  <div className="spinner" />
                </div>
              ) : possessionItems.length === 0 ? (
                <div className="empty-inline">
                  O colaborador {possessionModalUser.name} não possui material
                  entregue (ONGOING) ou reservado (APPROVED) neste momento.
                </div>
              ) : (
                <div className="possession-list">
                  {possessionItems.map((item, idx) => (
                    <div key={idx} className="possession-item">
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
                            {new Date(
                              item.expectedDeliveryDate
                            ).toLocaleDateString('pt-PT')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPossessionModalUser(null);
                          setSelectedOrderId(item.orderId);
                        }}
                      >
                        <Eye size={14} /> Abrir Pedido
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
