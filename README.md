# AssetLog — Sistema de Pedidos de Material Informático (Frontend)

Aplicação Frontend desenvolvida em **React + Vite** para o **Projeto C# Natixis — Sistema Interno de Pedidos de Material Informático**, integrada com o backend ASP.NET Core Web API (`assetlog-api`).

---

## Índice

1. [Visão Geral e Alterações Implementadas](#1-visão-geral-e-alterações-implementadas)
2. [Módulos da Aplicação (1 a 6)](#2-módulos-da-aplicação-1-a-6)
3. [Máquina de Estados e Regras de Negócio](#3-máquina-de-estados-e-regras-de-negócio)
4. [Arquitetura e Estrutura do Projeto](#4-arquitetura-e-estrutura-do-projeto)
5. [Listagem Completa de Endpoints da API](#5-listagem-completa-de-endpoints-da-api)
6. [Como Executar o Projeto](#6-como-executar-o-projeto)

---

## 1. Visão Geral e Alterações Implementadas

O template base do Vite foi transformado numa aplicação empresarial completa com identidade visual **Corporate Natixis** (`#581D74`), cobrindo todos os requisitos funcionais e técnicos definidos na documentação do projeto:

- **Integração Híbrida Inteligente (`src/services/api.js`)**:
  - Todas as ações invocam os endpoints reais da API (`https://localhost:7041/api/...` via proxy do Vite).
  - Caso um controller/endpoint ainda não esteja disponível na branch atual do backend (ex: `UserController`, `EquipmentController` ou `TrackingController`) ou o servidor da API esteja desligado, a aplicação ativa automaticamente um **motor local persistente (`localStorage`)** que replica exatamente a lógica do `OrderService.cs` (incluindo reserva de stock, bloqueio automático `BLOCKED` por falta de stock, alertas de stock mínimo e reposição na devolução).
  - Painel de diagnóstico em tempo real na barra lateral indicando o último endpoint chamado, o modo de ligação (`API C# Ligada` vs `Modo Híbrido`) e botões para sincronizar (`Sync`) ou repor os dados de demonstração (`Reset Demo`).
- **Autenticação + Simulador Rápido de Perfil**:
  - Ecrã de Login (`POST /api/auth/login`) com cartões de acesso rápido (1-Click) para demonstração.
  - Seletor rápido na barra superior que permite alternar instantaneamente entre perfis (**Gestor / `MANAGER`**, **Colaborador / `EMPLOYEE`** e **Estagiário / `TRAINEE`**) e respetivos `UserId` / `ApproverId` durante a apresentação.
- **Cesto de Requisição Multi-Item (`src/components/CartDrawer.jsx`)**:
  - Permite adicionar vários equipamentos do catálogo, definir quantidades, visualizar avisos preventivos de rutura de stock, indicar uma data de entrega pretendida (ou assumir o padrão de +7 dias da API) e submeter o pedido (`POST /api/order`).

---

## 2. Módulos da Aplicação (1 a 6)

| Módulo | Ficheiro Principal | Funcionalidades Implementadas |
| :--- | :--- | :--- |
| **Módulo 1 — Gestão de Utilizadores** | `src/pages/UsersPage.jsx` | Diretório de utilizadores com pesquisa e filtros por perfil (`RoleEnum`) e departamento (`DepartmentEnum`); criação e edição de utilizadores (`PUT /api/users/{id}`); consulta modal do material atualmente em posse de cada colaborador (`GET /api/users/{id}/material-em-posse`). |
| **Módulo 2 — Catálogo e Stock** | `src/pages/CatalogPage.jsx` | Catálogo de equipamentos com pesquisa, filtro por `CategoryEnum` e disponibilidade; indicadores semânticos (*Disponível*, *Stock Crítico*, *Sem Stock*, *Inativo*); ferramentas de Gestor para criar material (`POST /api/equipment`), atualizar stock e stock mínimo (`PUT /api/equipment/stock`), editar descrição e ativar/desativar. |
| **Módulo 3 — Pedidos** | `src/pages/OrdersPage.jsx` <br> `src/components/OrderDetailModal.jsx` | Abas dedicadas para cada endpoint do `OrderController` (*Meus Pedidos*, *Pedidos do Aprovador*, *Por Estado*, *Todos*); pesquisa direta por ID de pedido; modal de detalhe com barra de progresso da máquina de estados, botões de transição guiados por perfil, alteração da data de entrega expectável e timeline de tracking. |
| **Módulo 4 — Alertas, Notificações & Tracking** | `src/pages/NotificationsTrackingPage.jsx` | Centro de notificações de pedidos com filtro `isRead=true\|false`, marcação individual ou global como lida; separador de alertas de stock crítico (`StockNotification`) para gestores; explorador cronológico de eventos de `Tracking` filtrável por pedido. |
| **Módulo 5 — Dashboard do Colaborador** | `src/pages/EmployeeDashboard.jsx` | KPIs pessoais (pedidos ativos, unidades em posse, pedidos a aguardar aprovação e notificações não lidas); lista de *Material Informático em Sua Posse* com botão rápido de devolução (`RETURNED`); últimas notificações e histórico de pedidos do colaborador. |
| **Módulo 6 — Dashboard de Gestão** | `src/pages/ManagerDashboard.jsx` | KPIs executivos (total de pedidos, tempo médio de aprovação em horas, equipamentos em stock crítico e pedidos `BLOCKED`); 4 gráficos visuais (*Pedidos por Estado*, *Materiais Mais Requisitados*, *Pedidos por Departamento*, *Evolução de Pedidos por Mês*); tabela de reposição rápida de stock crítico (`+5 Stock`) e fila de decisão rápida. |

---

## 3. Máquina de Estados e Regras de Negócio

O frontend respeita todos os estados definidos em `StatusEnum.cs` na API (`OPENED`, `PENDING`, `APPROVED`, `ONGOING`, `REJECTED`, `BLOCKED`, `RETURNED`, `RETURNREJECTED`, `CLOSED`):

1. **Criação (`OPENED`)**: Todo o pedido submetido nasce no estado `OPENED`. Enquanto está `OPENED`, o colaborador pode cancelá-lo (passando a `CLOSED` com justificação).
2. **Triagem e Aprovação (`PENDING` / `APPROVED` / `REJECTED` / `BLOCKED`)**:
   - O Gestor pode colocar o pedido em análise (`PENDING`), rejeitá-lo (`REJECTED` — exige comentário obrigatório) ou aprová-lo (`APPROVED`).
   - Ao aprovar (`APPROVED`), se algum item tiver `Stock < Quantity`, o pedido transita automaticamente para **`BLOCKED`** e é gerada uma `StockNotification` para o gestor.
   - Se houver stock suficiente, o stock é descontado e, caso `Stock <= MinStock`, é gerado um alerta de stock mínimo.
3. **Entrega e Posse (`ONGOING`)**: Após aprovado, o gestor regista a entrega do equipamento (`ONGOING`), ficando o material contabilizado como *Material em Posse* do colaborador.
4. **Devolução e Fecho (`RETURNED` / `RETURNREJECTED` / `CLOSED`)**:
   - O colaborador ou o gestor pode registar a devolução (`RETURNED`), repondo automaticamente as unidades em stock, ou rejeitar a devolução (`RETURNREJECTED` com motivo obrigatório em caso de dano/anomalia).
   - O ciclo termina com o fecho do processo (`CLOSED`).

---

## 4. Arquitetura e Estrutura do Projeto

```text
assetlog-app/
├── index.html
├── package.json
├── vite.config.js                      # Proxy /api -> https://localhost:7041
└── src/
    ├── main.jsx
    ├── App.jsx                         # Roteamento entre Login e os 6 módulos
    ├── index.css                       # Variáveis CSS e tema Corporate Natixis
    ├── App.css                         # Estilos de layout, tabelas, gráficos e modais
    ├── constants/
    │   └── enums.js                    # StatusEnum, CategoryEnum, DepartmentEnum, RoleEnum, TypeOfContractEnum e transições
    ├── services/
    │   ├── mockData.js                 # Dados iniciais realistas alinhados com os DTOs C#
    │   └── api.js                      # Clientes REST (orderApi, userApi, equipmentApi, trackingApi) + fallback local
    ├── context/
    │   └── AppContext.jsx              # Estado global, sessão, cesto de compras, notificações e toasts
    ├── components/
    │   ├── Layout.jsx                  # Sidebar, Topbar com simulador de perfil e diagnóstico da API
    │   ├── StatusBadge.jsx             # Badges semânticos para Estado, Categoria, Perfil e Departamento
    │   ├── CartDrawer.jsx              # Gaveta lateral para submissão de pedidos multi-item
    │   └── OrderDetailModal.jsx        # Modal de detalhe do pedido, máquina de estados e timeline de tracking
    └── pages/
        ├── LoginPage.jsx               # Ecrã de autenticação + login rápido 1-Click
        ├── EmployeeDashboard.jsx       # Módulo 5: Dashboard do Colaborador
        ├── ManagerDashboard.jsx        # Módulo 6: Dashboard Administrativo / Gestão
        ├── CatalogPage.jsx             # Módulo 2: Catálogo e Gestão de Stock
        ├── OrdersPage.jsx              # Módulo 3: Gestão de Pedidos
        ├── NotificationsTrackingPage.jsx # Módulo 4: Alertas, Notificações e Auditoria de Tracking
        └── UsersPage.jsx               # Módulo 1: Gestão de Utilizadores
```

---

## 5. Listagem Completa de Endpoints da API

Abaixo encontram-se todos os endpoints que o frontend consome para operar de ponta a ponta com a `assetlog-api`:

### 5.1. `OrderController` — Pedidos e Notificações de Pedido *(Implementados em `AssetLog.Api`)*

| Método | Rota | Breve Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/order/user/{userId}` | Devolve a lista resumida de pedidos (`List<OrderSummaryDto>`) submetidos por um colaborador específico. |
| `GET` | `/api/order/approver/{approverId}` | Devolve os pedidos geridos/aprovados por um determinado gestor (`approverId`). |
| `GET` | `/api/order/status/{status}` | Filtra e devolve todos os pedidos que se encontram num determinado estado do `StatusEnum` (`OPENED`, `PENDING`, `APPROVED`, `ONGOING`, `REJECTED`, `BLOCKED`, `RETURNED`, `RETURNREJECTED`, `CLOSED`). |
| `GET` | `/api/order/{orderId}` <br> `/api/order/user/{userId}/{orderId}` | Devolve os detalhes completos de um pedido (`OrderDetailDto`), incluindo a lista de `Items` e o histórico cronológico de `Trackings`. |
| `POST` | `/api/order` | Cria um novo pedido no estado `OPENED`. Recebe `{ userId, items: [{ equipmentId, quantity }], expectedDeliveryDate? }`. |
| `PUT` | `/api/order/{orderId}/status` | Atualiza o estado do pedido na máquina de estados. Recebe `{ approverId, status, comments? }`. Na passagem para `APPROVED` valida e desconta o stock (ou passa para `BLOCKED` se não houver stock suficiente); na passagem para `RETURNED` repõe o stock. |
| `PUT` | `/api/order/{orderId}/expected-delivery-date` | Atualiza a data de entrega/devolução expectável de um pedido e gera registo de tracking + notificação. Recebe `{ approverId, expectedDeliveryDate, comments? }`. |
| `GET` | `/api/order/notification/user/{userId}?isRead={bool}` | Lista as notificações de pedidos (`TrackingNotificationDto`) de um utilizador, permitindo filtrar por lidas (`isRead=true`) ou não lidas (`isRead=false`). |
| `PUT` | `/api/order/notification/{notificationId}/read` | Marca uma notificação de pedido específica como lida (`IsRead = true`). |
| `PUT` | `/api/order/notification/user/{userId}/read` | Marca todas as notificações não lidas de um utilizador (ou uma lista opcional de IDs enviada no body) como lidas. |

### 5.2. `UserController` (e/ou `AuthController`) — Autenticação e Gestão de Utilizadores

| Método | Rota | Breve Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Autentica o utilizador com `{ email, password }`, valida a hash da password e devolve `{ token, user }` (com `id`, `name`, `email`, `role`, `department`, `isActive`, `typeOfContract`, `endDate`). |
| `GET` | `/api/auth/me` | Devolve os dados do utilizador autenticado a partir do token JWT enviado no header `Authorization: Bearer <token>`. |
| `GET` | `/api/users` | Lista todos os utilizadores registados (para o diretório de utilizadores, filtros por departamento nos gráficos e seletor rápido de perfil). |
| `POST` | `/api/users` | Cria um novo utilizador no sistema. Recebe `{ name, email, password?, role, department, typeOfContract, endDate, isActive }`. |
| `PUT` | `/api/users/{id}` | Atualiza os dados de um utilizador existente (perfil `RoleEnum`, departamento `DepartmentEnum`, tipo de contrato `TypeOfContractEnum`, `endDate` ou estado `isActive`). |
| `GET` | `/api/users/{id}/material-em-posse` | Devolve a lista de equipamentos atualmente na posse do colaborador (itens pertencentes a pedidos desse utilizador com estado `ONGOING` / entregue ou `APPROVED`). |

### 5.3. `EquipmentController` — Catálogo, Stock e Alertas de Stock

| Método | Rota | Breve Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/equipment?category={cat}&available={bool}` | Lista todos os equipamentos do catálogo (`id`, `name`, `description`, `category`, `isActive`, `stock`, `minStock`), permitindo filtrar opcionalmente por `CategoryEnum` e por disponibilidade (`stock > 0 && isActive`). |
| `POST` | `/api/equipment` | Adiciona um novo material informático ao catálogo. Recebe `{ name, description, category, stock, minStock }`. |
| `PUT` | `/api/equipment/stock` | Atualiza a quantidade disponível em stock (entrada/reposição de stock) e/ou o limite mínimo (`minStock`). Recebe `{ equipmentId, stock, minStock? }`. |
| `PUT` | `/api/equipment/description` | Atualiza os dados descritivos de um equipamento (`id`, `name`, `description`, `category`, `minStock`). |
| `PUT` | `/api/equipment/activate` | Reativa um equipamento no catálogo (`IsActive = true`). Recebe `{ id }` / `{ equipmentId }`. |
| `PUT` | `/api/equipment/deactivate` | Desativa um equipamento (`IsActive = false`), impedindo novos pedidos desse item. Recebe `{ id }` / `{ equipmentId }`. |
| `GET` | `/api/equipment/notification?isRead={bool}` | Lista os alertas de stock (`StockNotification`: rutura de stock em pedidos `BLOCKED` ou `Stock <= MinStock`), com filtro opcional `isRead`. |
| `POST` | `/api/equipment/notification` | Cria manualmente uma notificação/alerta de stock para os gestores. |
| `PUT` | `/api/equipment/notification/read` | Marca um alerta de stock (`StockNotification`) como lido (`IsRead = true`). Recebe `{ id }`. |

### 5.4. `TrackingController` — Auditoria e Histórico de Tracking

| Método | Rota | Breve Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/tracking/order/{orderId}` | Devolve todos os registos de tracking (`List<TrackingDto>`) associados a uma order específica, ordenados do mais recente para o mais antigo. |
| `GET` | `/api/tracking/{trackingId}` | Devolve o detalhe de um evento de tracking específico (`id`, `orderId`, `approverId`, `approverName`, `status`, `comments`, `date`). |
| `POST` | `/api/tracking` | Regista um novo evento de tracking num pedido (caso seja criado fora do fluxo automático do `OrderService`). |
| `GET` | `/api/tracking/notification` | Lista todas as notificações de tracking (complementar ao endpoint por utilizador já existente no `OrderController`). |
| `PUT` | `/api/tracking/notification/read` | Marca notificações de tracking como lidas. |

---

## 6. Como Executar o Projeto

### Pré-requisitos
- **Node.js** (v18+)
- *(Opcional)* **ASP.NET Core Web API (`assetlog-api`)** em execução em `https://localhost:7041`

### Instalação e Arranque

```bash
# 1. Instalar dependências
npm.cmd install

# 2. Iniciar servidor de desenvolvimento (Vite)
npm.cmd run dev

# 3. Validar lint e gerar build de produção
npm.cmd run lint
npm.cmd run build
```

> **Nota sobre o Proxy da API:** O ficheiro `vite.config.js` está configurado para encaminhar qualquer pedido iniciado por `/api` para `https://localhost:7041` com `secure: false` (para aceitar o certificado HTTPS de desenvolvimento do .NET).
