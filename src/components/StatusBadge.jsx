import {
  STATUS_META,
  CATEGORY_META,
  ROLE_META,
  DEPARTMENT_META,
} from '../constants/enums';

export function StatusBadge({ status, size = 'md' }) {
  const meta = STATUS_META[status] || {
    label: status || 'Desconhecido',
    color: 'slate',
  };

  return (
    <span
      className={`status-badge status-${meta.color} status-size-${size}`}
      title={meta.description || meta.enLabel}
    >
      <span className="status-dot" />
      {meta.label}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || { label: category };
  return <span className="category-pill">{meta.label}</span>;
}

export function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, badgeColor: 'slate' };
  return (
    <span className={`role-badge role-${meta.badgeColor}`}>{meta.label}</span>
  );
}

export function DepartmentBadge({ department }) {
  const meta = DEPARTMENT_META[department] || { label: department };
  return <span className="dept-badge">{meta.label}</span>;
}
