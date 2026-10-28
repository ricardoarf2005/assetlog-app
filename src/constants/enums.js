// Exact match with AssetLog.Api.Models.Enums

export const StatusEnum = {
  OPENED: 'OPENED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ONGOING: 'ONGOING',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
  RETURNED: 'RETURNED',
  RETURNREJECTED: 'RETURNREJECTED',
  CLOSED: 'CLOSED',
};

export const STATUS_META = {
  OPENED: {
    label: 'Aberto',
    enLabel: 'Opened',
    color: 'blue',
    description: 'Pedido criado pelo colaborador, aguarda triagem.',
  },
  PENDING: {
    label: 'Pendente',
    enLabel: 'Pending',
    color: 'amber',
    description: 'Em análise pelo gestor de material.',
  },
  APPROVED: {
    label: 'Aprovado',
    enLabel: 'Approved',
    color: 'emerald',
    description: 'Aprovado e stock reservado na base de dados.',
  },
  ONGOING: {
    label: 'Entregue / Em Uso',
    enLabel: 'Ongoing',
    color: 'purple',
    description: 'Material entregue e atualmente na posse do colaborador.',
  },
  REJECTED: {
    label: 'Rejeitado',
    enLabel: 'Rejected',
    color: 'red',
    description: 'Pedido recusado pelo gestor com justificação.',
  },
  BLOCKED: {
    label: 'Bloqueado (Sem Stock)',
    enLabel: 'Blocked',
    color: 'orange',
    description: 'Bloqueado automaticamente por falta de stock disponível.',
  },
  RETURNED: {
    label: 'Devolvido',
    enLabel: 'Returned',
    color: 'teal',
    description: 'Material devolvido pelo colaborador e reposto em stock.',
  },
  RETURNREJECTED: {
    label: 'Devolução Rejeitada',
    enLabel: 'Return Rejected',
    color: 'rose',
    description: 'Devolução recusada (ex: equipamento danificado ou incompleto).',
  },
  CLOSED: {
    label: 'Fechado',
    enLabel: 'Closed',
    color: 'slate',
    description: 'Processo de pedido concluído e arquivado.',
  },
};

export const CategoryEnum = {
  PERIPHERALS: 'PERIPHERALS',
  MONITORS: 'MONITORS',
  AUDIO: 'AUDIO',
  LAPTOPS: 'LAPTOPS',
  SMARTPHONES: 'SMARTPHONES',
  CONECTIVITY: 'CONECTIVITY', // Matches spelling in CategoryEnum.cs
  OTHERS: 'OTHERS',
};

export const CATEGORY_META = {
  PERIPHERALS: { label: 'Periféricos', enLabel: 'Peripherals' },
  MONITORS: { label: 'Monitores', enLabel: 'Monitors' },
  AUDIO: { label: 'Áudio & Headsets', enLabel: 'Audio' },
  LAPTOPS: { label: 'Portáteis', enLabel: 'Laptop' },
  SMARTPHONES: { label: 'Smartphones', enLabel: 'Smartphones' },
  CONECTIVITY: { label: 'Conectividade & Docks', enLabel: 'Connectivity' },
  OTHERS: { label: 'Outros', enLabel: 'Others' },
};

export const DepartmentEnum = {
  IT: 'IT',
  DEV: 'DEV',
  HR: 'HR',
  ACCOUNTING: 'ACCOUNTING',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
};

export const DEPARTMENT_META = {
  IT: { label: 'IT & Infraestrutura' },
  DEV: { label: 'Engenharia / DEV' },
  HR: { label: 'Recursos Humanos (HR)' },
  ACCOUNTING: { label: 'Contabilidade & Finanças' },
  SALES: { label: 'Comercial / Sales' },
  MARKETING: { label: 'Marketing & Comunicação' },
};

export const RoleEnum = {
  TRAINEE: 'TRAINEE',
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
};

export const ROLE_META = {
  TRAINEE: { label: 'Trainee (Estagiário)', badgeColor: 'blue' },
  EMPLOYEE: { label: 'Colaborador (Employee)', badgeColor: 'purple' },
  MANAGER: { label: 'Gestor de Material (Manager)', badgeColor: 'emerald' },
};

export const TypeOfContractEnum = {
  TEMPORARY: 'TEMPORARY',
  PERMANENT: 'PERMANENT',
};

export const CONTRACT_META = {
  TEMPORARY: { label: 'Temporário / Termo Certo' },
  PERMANENT: { label: 'Permanente / Efetivo' },
};

/**
 * Guided state machine transitions per role
 * Aligns with OrderService.UpdateOrderStatusAsync in AssetLog.Api
 */
export function getAvailableTransitions(currentStatus, isManager) {
  if (isManager) {
    switch (currentStatus) {
      case StatusEnum.OPENED:
        return [
          { status: StatusEnum.PENDING, label: 'Marcar Em Análise', variant: 'secondary', requiresComment: false },
          { status: StatusEnum.APPROVED, label: 'Aprovar Pedido', variant: 'success', requiresComment: false },
          { status: StatusEnum.REJECTED, label: 'Rejeitar Pedido', variant: 'danger', requiresComment: true },
        ];
      case StatusEnum.PENDING:
        return [
          { status: StatusEnum.APPROVED, label: 'Aprovar Pedido', variant: 'success', requiresComment: false },
          { status: StatusEnum.REJECTED, label: 'Rejeitar Pedido', variant: 'danger', requiresComment: true },
        ];
      case StatusEnum.BLOCKED:
        return [
          { status: StatusEnum.APPROVED, label: 'Reaprovar (Verificar Stock)', variant: 'success', requiresComment: false },
          { status: StatusEnum.REJECTED, label: 'Rejeitar Pedido', variant: 'danger', requiresComment: true },
        ];
      case StatusEnum.APPROVED:
        return [
          { status: StatusEnum.ONGOING, label: 'Registar Entrega (Em Uso)', variant: 'primary', requiresComment: false },
          { status: StatusEnum.CLOSED, label: 'Fechar Pedido', variant: 'secondary', requiresComment: false },
        ];
      case StatusEnum.ONGOING:
        return [
          { status: StatusEnum.RETURNED, label: 'Confirmar Devolução (Repor Stock)', variant: 'success', requiresComment: false },
          { status: StatusEnum.RETURNREJECTED, label: 'Rejeitar Devolução (Avaria/Falta)', variant: 'danger', requiresComment: true },
        ];
      case StatusEnum.RETURNED:
      case StatusEnum.RETURNREJECTED:
        return [
          { status: StatusEnum.CLOSED, label: 'Fechar Processo', variant: 'secondary', requiresComment: false },
        ];
      default:
        return [];
    }
  } else {
    // Employee / Trainee actions
    switch (currentStatus) {
      case StatusEnum.OPENED:
        return [
          { status: StatusEnum.CLOSED, label: 'Cancelar Pedido', variant: 'danger', requiresComment: true },
        ];
      case StatusEnum.ONGOING:
        return [
          { status: StatusEnum.RETURNED, label: 'Devolver Material', variant: 'primary', requiresComment: false },
        ];
      default:
        return [];
    }
  }
}
