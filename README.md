<div align="center">

# 🚀 TaskFlow - Project Management Tool
### *A Real-Time Trello / Asana Clone*

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Turso](https://img.shields.io/badge/Turso-Cloud_SQLite-blue?style=for-the-badge)](https://turso.tech/)

**Live Demo:** [https://taskflow-frontend-eight-sigma.vercel.app](https://taskflow-frontend-eight-sigma.vercel.app)

</div>

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Tech Stack & Architecture](#-tech-stack--architecture)
4. [Database Schema](#-database-schema)
5. [API Endpoints](#-api-endpoints)
6. [Real-Time Socket Events](#-real-time-socket-events)
7. [Environment Variables](#-environment-variables)
8. [Local Installation & Setup](#-local-installation--setup)
9. [Deployment](#-deployment)
10. [Developer](#-developer)

---

## 📌 Project Overview

**TaskFlow** is a highly scalable, real-time collaborative project management tool inspired by industry leaders like Trello and Asana. Developed as part of the **CodeAlpha Full Stack Development Internship** (Task 3), this application empowers teams to organize projects, assign tasks, collaborate via comments, and see updates in real-time without refreshing the page.

It is designed with a focus on **data privacy** (Role-Based Access Control) and **real-time responsiveness** (WebSockets), simulating a true production environment.

---

## ✨ Key Features

### 🔐 1. Authentication & Security
- Secure Login / Registration using **JWT (JSON Web Tokens)**.
- Passwords securely hashed using **bcrypt**.
- Protected API routes and strict Socket connection authentication.

### 📋 2. Collaborative Kanban Boards
- Create multiple projects.
- **Drag & Drop** tasks smoothly across columns (powered by `@hello-pangea/dnd`).
- Automatic position syncing in the database when tasks are moved.

### 👥 3. Role-Based Access Control (RBAC)
- **Owner:** Full control. Can delete projects, manage members, and edit tasks.
- **Editor:** Can create, edit, and move tasks, and post comments.
- **Viewer:** Read-only access. Cannot modify the board or post comments.
- *Access is strictly enforced on both Frontend UI and Backend Middleware.*

### 🔗 4. Team Invitation System
- **Direct Email Invite:** Add registered users directly by email.
- **Magic Link:** Generate a unique, shareable invite link. Anyone with the link can join the board instantly as an Editor.

### ⚡ 5. Real-Time Capabilities (Socket.io)
- **Live Task Sync:** When one user drags a task, it moves instantly on everyone else's screen.
- **Live Comments:** Discussions update in real-time.
- **Live Notifications:** Task assignments and new comments trigger a notification bell badge instantly.
- **Online Presence:** See real-time indicators of which team members are currently viewing the board.

---

## 🛠️ Tech Stack & Architecture

**Frontend:**
- **React.js (Vite):** For blazing-fast UI rendering.
- **Tailwind CSS:** For modern, responsive styling.
- **@hello-pangea/dnd:** Industry-standard library for Drag and Drop.
- **Socket.io-client:** For bidirectional real-time communication.
- **React Router DOM:** For client-side routing.
- **Axios:** For API requests with interceptors for JWT injection.

**Backend:**
- **Node.js & Express.js:** RESTful API architecture.
- **Socket.io:** Real-time event server (rooms per project).
- **JWT & bcrypt:** Secure authentication flow.

**Database:**
- **Turso (Cloud SQLite):** Serverless, globally distributed SQLite database using `@libsql/client`. Highly performant for read-heavy workloads.

---

## 🗄️ Database Schema

TaskFlow uses a relational schema (Turso/libSQL) consisting of 7 tables:

1. **`users`**: `id`, `name`, `email` (unique), `password` (hashed), `created_at`.
2. **`projects`**: `id`, `name`, `description`, `owner_id` (FK), `created_at`.
3. **`project_members`**: `project_id` (FK), `user_id` (FK), `role` (owner/editor/viewer), `joined_at`. *(Composite Primary Key)*
4. **`tasks`**: `id`, `project_id` (FK), `title`, `description`, `status` (todo/in-progress/done), `assigned_to` (FK), `position` (integer for drag-drop), `created_at`.
5. **`comments`**: `id`, `task_id` (FK), `user_id` (FK), `content`, `created_at`.
6. **`notifications`**: `id`, `user_id` (FK), `type`, `message`, `link`, `is_read`, `created_at`.
7. **`invite_tokens`**: `token` (PK), `project_id` (FK), `created_by` (FK), `created_at`.

---

## 📡 API Endpoints

### Auth (`/api/auth`)
- `POST /register` - Create a new user.
- `POST /login` - Authenticate and receive JWT.
- `GET /me` - Get current user profile.
- `POST /invite/:token/accept` - Accept a magic link invite.

### Projects (`/api/projects`)
- `GET /` - List all projects where user is a member.
- `POST /` - Create a project.
- `GET /:id` - Get project details.
- `PUT /:id` - Update project (Owner only).
- `DELETE /:id` - Delete project (Owner only).

### Members (`/api/projects/:id/members`)
- `GET /` - List members.
- `POST /` - Add member by email (Owner only).
- `DELETE /:userId` - Remove member (Owner only).
- `POST /invite-link` - Generate magic link (Editor/Owner).

### Tasks (`/api/tasks`)
- `GET /project/:projectId` - Get all tasks for a board.
- `POST /` - Create task (Editor/Owner).
- `PUT /:id/move` - Drag & Drop position update (Editor/Owner).
- `PUT /:id` - Edit task (Editor/Owner).
- `DELETE /:id` - Delete task (Editor/Owner).

### Comments (`/api/comments`)
- `GET /task/:taskId` - List comments.
- `POST /` - Add comment (Editor/Owner).
- `DELETE /:id` - Delete own comment.

### Notifications (`/api/notifications`)
- `GET /` - List recent notifications.
- `PUT /read-all` - Mark all as read.
- `PUT /:id/read` - Mark single as read.

---

## 📡 Real-Time Socket Events

- `project:join` - Join a specific project room.
- `project:leave` - Leave the room.
- `task:created` - Broadcast new task to the room.
- `task:moved` - Broadcast drag-and-drop coordinate changes.
- `task:updated` - Broadcast task edits.
- `comment:created` - Broadcast new comments.
- `notification:new` - Private event sent directly to a user's specific room.
- `presence:update` - Broadcast online users to the room.

---

## ⚙️ Environment Variables

You will need to set up two `.env` files.

**1. Backend (`server/.env`)**
```env
PORT=5000
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173

**2. Frontend ('client/.env')**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

** 💻 Local Installation & Setup
 - Prerequisites
 - Node.js (v18+)

 - npm or yarn

 - A Turso Database account

  Step 1: Clone the repository

  git clone https://github.com/praveenraj444/CodeAlpha_ProjectManagementTool.git
  cd CodeAlpha_ProjectManagementTool

  Step 2: Setup Backend

  cd server
  npm install
  # Create .env file and fill in Turso credentials and JWT Secret
  npm run dev

  Step 3: Setup Frontend

  # Open a new terminal
  cd client
  npm install
  # Create .env file
  npm run dev

 ** 🚀 Deployment

  This application is configured for easy deployment.

  Frontend: Hosted on Vercel (configured via client folder).

  Backend: Hosted on Render (Node.js web service via server folder).

  Database: Hosted on Turso.

Make sure to update CLIENT_URL in the Render backend dashboard after deploying the frontend to Vercel to prevent CORS errors.

** 👨‍💻 Developer

**[Your Name]**
- GitHub: [@praveenraj444](https://github.com/praveenraj444)
- LinkedIn: [Praveenraj M](https://linkedin.com/in/praveenrajm2021)

---