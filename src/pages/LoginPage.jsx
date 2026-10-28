import { useState } from 'react';
import { Shield, UserCheck, GraduationCap, ArrowRight, Lock, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RoleBadge, DepartmentBadge } from '../components/StatusBadge';

export function LoginPage() {
  const { users, login, addToast } = useApp();
  const [email, setEmail] = useState('ricardo.fernandes@natixis.com');
  const [password, setPassword] = useState('Natixis2026!');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      addToast(err.message || 'Credenciais inválidas.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (userEmail) => {
    setEmail(userEmail);
    setSubmitting(true);
    try {
      await login(userEmail, 'Natixis2026!');
    } catch (err) {
      addToast(err.message || 'Erro ao iniciar sessão demo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-hero-panel">
          <div className="login-brand">
            <div className="brand-logo lg">AL</div>
            <div>
              <h1>AssetLog</h1>
              <span>Sistema Interno de Pedidos de Material Informático</span>
            </div>
          </div>

          <div className="login-pitch">
            <h2>Gestão Integrada de Ativos IT • Projeto C# Natixis</h2>
            <p>
              Plataforma corporativa para requisição de equipamento informático,
              aprovação com reserva transacional de stock, máquina de estados e
              monitorização em tempo real.
            </p>

            <div className="login-features-grid">
              <div className="login-feature-item">
                <Shield size={18} />
                <div>
                  <strong>Máquina de Estados & Stock</strong>
                  <span>
                    Reserva automática na aprovação e bloqueio inteligente
                    (BLOCKED) quando o stock é insuficiente.
                  </span>
                </div>
              </div>
              <div className="login-feature-item">
                <UserCheck size={18} />
                <div>
                  <strong>Perfis Colaborador, Trainee & Gestor</strong>
                  <span>
                    Dashboards dedicados, histórico de tracking e alertas de
                    stock mínimo.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-footer-note">
            Backend: ASP.NET Core Web API • Frontend: React + Vite
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-header">
            <h2>Iniciar Sessão</h2>
            <p>
              Endpoint: <code>POST /api/auth/login</code>
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                <Mail size={14} /> E-mail Corporativo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.apelido@natixis.com"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={14} /> Palavra-passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              <span>{submitting ? 'A autenticar...' : 'Entrar no AssetLog'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="quick-login-divider">
            <span>Acesso Rápido para Apresentação (1-Click)</span>
          </div>

          <div className="quick-accounts-list">
            {users.slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                className="quick-account-card"
                onClick={() => handleQuickDemoLogin(u.email)}
              >
                <div className="qa-icon">
                  {u.role === 'MANAGER' ? (
                    <Shield size={18} />
                  ) : u.role === 'TRAINEE' ? (
                    <GraduationCap size={18} />
                  ) : (
                    <UserCheck size={18} />
                  )}
                </div>
                <div className="qa-info">
                  <div className="qa-name">
                    #{u.id} {u.name}
                  </div>
                  <div className="qa-email">{u.email}</div>
                  <div className="qa-badges">
                    <RoleBadge role={u.role} />
                    <DepartmentBadge department={u.department} />
                  </div>
                </div>
                <ArrowRight size={16} className="qa-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
