# ⚡ Sprinto — Multi-Role Project Management System

A full-stack Jira/Trello-like project management app built with React, Node.js, Express, MongoDB, and WebSockets.

---

## 🏗️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| Backend | Node.js, Express, WebSocket (ws) |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | WebSocket (ws library) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# backend/.env (already created, edit as needed)
PORT=5000
MONGO_URI=mongodb://localhost:27017/sprinto
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates demo users:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sprinto.com | admin123 |
| Manager | manager@sprinto.com | manager123 |
| User | sam@sprinto.com | password123 |
| User | morgan@sprinto.com | password123 |

### 4. Start Both Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev   # or: npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## 📁 Project Structure

```
sprinto/
├── backend/
│   ├── server.js              # Express + WebSocket server
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── seed.js            # Demo data seeder
│   ├── models/
│   │   ├── User.js            # User model (name, email, role, avatar, color)
│   │   ├── Project.js         # Project model (name, members, manager)
│   │   ├── Task.js            # Task model (title, status, priority, assignee)
│   │   └── Log.js             # Activity log model
│   ├── controllers/
│   │   ├── authController.js  # Login, register, me, password update
│   │   ├── userController.js  # CRUD users, stats
│   │   ├── projectController.js # CRUD projects, members
│   │   ├── taskController.js  # CRUD tasks, stats, filters
│   │   └── logController.js   # Paginated activity logs
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   └── logs.js
│   └── middleware/
│       ├── auth.js            # protect, authorize, projectMember
│       └── errorHandler.js    # asyncHandler, ApiError, global handler
│
└── frontend/
    └── src/
        ├── App.jsx            # Router + providers
        ├── main.jsx           # React entry point
        ├── index.css          # Tailwind + global styles
        ├── api/
        │   ├── client.js      # Axios instance with JWT interceptors
        │   └── services.js    # Auth, users, projects, tasks, logs APIs
        ├── context/
        │   ├── AuthContext.jsx # Login/logout, JWT persistence
        │   ├── WSContext.jsx   # WebSocket connection + pub/sub
        │   └── ToastContext.jsx # Global toast notifications
        ├── utils/
        │   └── helpers.js     # Date utils, config maps, constants
        ├── components/
        │   ├── ui.jsx         # Avatar, Badge, Button, Input, Modal, Card, etc.
        │   ├── Sidebar.jsx    # Nav sidebar with WS indicator
        │   ├── Layout.jsx     # Shell with sidebar + main content
        │   ├── ProtectedRoute.jsx  # Auth guard with role check
        │   ├── TaskCard.jsx   # Draggable task card with inline actions
        │   └── TaskForm.jsx   # Create/edit task modal
        └── pages/
            ├── LoginPage.jsx  # Login with demo quick-access
            ├── DashboardPage.jsx  # Stats, charts, activity feed
            ├── BoardPage.jsx  # Kanban board with drag & drop
            ├── ProjectsPage.jsx   # Project grid with progress bars
            ├── TasksPage.jsx  # Filterable task list
            ├── TeamPage.jsx   # Team management (admin/manager)
            └── LogsPage.jsx   # Paginated activity logs
```

---

## 🔐 Role Permissions

| Feature | Admin | Manager | User |
|---------|-------|---------|------|
| View all projects | ✅ | ❌ (own) | ❌ (member of) |
| Create projects | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |
| Create tasks | ✅ | ✅ | ❌ |
| Update any task | ✅ | ✅ | ❌ |
| Update own task status | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | ❌ |
| View team page | ✅ | ✅ | ❌ |
| Edit user roles | ✅ | ❌ | ❌ |
| Deactivate users | ✅ | ❌ | ❌ |

---

## ⚡ WebSocket Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `task_created` | task, user, projectName | New task created |
| `task_updated` | task, user, change | Task status/fields changed |
| `task_deleted` | taskId, taskTitle, user | Task removed |
| `project_created` | project, user | New project created |
| `project_updated` | project, user | Project edited |
| `project_deleted` | projectId, projectName, user | Project removed |

---

## 🌐 API Endpoints

### Auth
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
PUT    /api/auth/password
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId
```

### Tasks
```
GET    /api/tasks?project=&status=&priority=&assignee=&search=
GET    /api/tasks/stats
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Users
```
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/stats
```

### Logs
```
GET    /api/logs?project=&limit=&page=
```
