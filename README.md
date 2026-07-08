# TaskPilot 🚀
> **An Advanced, AI-Powered Project Management & Collaboration Platform**

TaskPilot is a next-generation workspace that combines traditional project management tools (Kanban boards, real-time chats, meeting rooms, shared calendars) with state-of-the-art **AI Agent capabilities**. Built on a high-performance modern web stack with curated aesthetics (dark mode support, glassmorphism, micro-animations), it empowers teams to streamline execution, balance workloads, and intelligently analyze schedule risks.

---

## 🌟 Key Features

### 1. 🤖 AI Agent Suite (AI Workspace)
* **Interactive AI Chat (`/ai`)**: Brainstorm plans, formulate task checklists, or interactively command your workspace to generate milestones using the DeepSeek-powered assistant.
* **AI Project Creator (`/ai-project-creator`)**: Provide a simple text description of your project goal (e.g., "Build a React-based e-commerce platform"), and the AI will auto-generate complete timelines, milestones, descriptions, and tasks.
* **AI Workload Balancer (`/ai-workload-balancer`)**: Analyzes workload distribution across team members and offers smart reallocation suggestions to prevent burnout.
* **AI Project Risk Predictor (`/ai-risk-predictor`)**: Evaluates blocker chains, dependency cycles, and team speed to calculate potential project delivery delays.

### 2. 📂 Project & Task Tracking
* **Dynamic Kanban Board**: Drag-and-drop tasks, adjust statuses (To Do, In Progress, In Review, Done), and visualize progress directly inside the [Project Details](file:///d:/Nishant%20Jangra/Coding/CodSoft/TaskPilot/frontend/src/pages/ProjectDetails.jsx) view.
* **Smart Dependency Manager**: Prevents circular dependencies, maps blockers, and helps teams prioritize the most critical tasks first.
* **Rich Task Details**: Attach files, comment, track logs, assign ownership, and set deadlines.

### 3. 💬 Real-Time Collaboration
* **Real-time Chat & Direct Messaging (`/messages`)**: Stay aligned with team members through instant messaging powered by Socket.io.
* **Collaboration Invites & Networks (`/network`)**: Manage connection requests and view recommendations to build your professional network.
* **Project Meetings (`/projects/:projectId/meeting`)**: Dedicated digital meeting spaces featuring integration capabilities for video/audio sync.

### 4. 📅 Scheduling & Organization
* **Interactive Calendar (`/calendar`)**: Drag-and-drop tasks to adjust deadlines, view scheduled milestones, and stay ahead of deadlines.
* **Real-time Notifications**: Custom toasts bridge real-time socket events directly into the UI, ensuring you never miss a collaborator's invite, meeting ping, or task update.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (v19), React Router (v7), Vite (v7), Tailwind CSS, Lucide Icons, Sonner (Toasts) |
| **Backend** | Node.js, Express, MongoDB (Mongoose), Socket.io, Firebase SDK |
| **AI Processing** | DeepSeek API (OpenAI Compatible Integration), Rate-Limited AI Middleware |
| **Auth & Security** | Firebase Authentication, Google OAuth Integration, JWT Session Management |
| **Deployment** | Vercel (Frontend with SPA rewrite routing), Render (Backend services) |

---

## 📂 Project Structure

```bash
TaskPilot/
├── frontend/                  # React Single Page Application (SPA)
│   ├── public/                # Static public assets
│   ├── src/
│   │   ├── config/            # Firebase, Google Calendar, and central API client setup
│   │   ├── context/           # AppContext, AuthContext, ThemeProvider (State Management)
│   │   ├── services/          # AI Service, Smart Dependency Manager, Risk Engines
│   │   ├── components/        # Reusable UI components (Kanban, AIAssistant, Layouts, etc.)
│   │   ├── pages/             # Route-level pages (Dashboard, AIWorkspace, Projects, etc.)
│   │   ├── App.jsx            # Router and Provider structure
│   │   └── index.css          # Core CSS stylesheet
│   ├── package.json           # Frontend dependencies & configurations
│   └── vercel.json            # Vercel deployment configuration for client-side routing
│
├── backend/                   # Node.js + Express REST API Server
│   ├── src/
│   │   ├── models/            # Mongoose schemas (User, Task, Project, Connection, etc.)
│   │   ├── routes/            # Express routers (Auth, Tasks, Projects, AI, etc.)
│   │   ├── controllers/       # Route handlers (Business logic)
│   │   ├── middleware/        # Authentication, AI rate-limiters
│   │   ├── services/          # DeepSeek / AI provider integration engines
│   │   ├── utils/             # Helper utilities (Network control)
│   │   └── server.js          # Server entrypoint and Socket.io setups
│   └── package.json           # Backend dependencies
```

---

## 🚀 Local Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [MongoDB](https://www.mongodb.com/) (Local or Atlas database instance)

### Setup Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nishantjangra18/TaskPilot.git
   cd TaskPilot
   ```

2. **Configure Backend Environment Variables**:
   Navigate to the `backend` directory, create a `.env` file, and fill in the required credentials:
   ```env
   # C:\Users\Nishant Jangra\Coding\CodSoft\TaskPilot\backend\.env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/taskpilot
   JWT_SECRET=your_jwt_secret_key_here
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

3. **Configure Frontend Environment Variables**:
   Navigate to the `frontend` directory, create a `.env` file, and configure the variables:
   ```env
   # C:\Users\Nishant Jangra\Coding\CodSoft\TaskPilot\frontend\.env
   VITE_API_URL=http://localhost:5000
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Install Dependencies**:
   From the repository root, install dependencies for the monorepo:
   ```bash
   npm install
   ```

5. **Run in Development Mode**:
   Launch both frontend and backend concurrently:
   ```bash
   # From root directory:
   # Start frontend
   npm run dev
   
   # Start backend (in a separate terminal)
   npm run start
   ```

---

## 🌐 Production Deployment

### Frontend (Vercel)
The React Router SPA configuration requires rewrite handling to prevent `404` errors when reloading subroutes (e.g., `/dashboard` or `/projects`). 
We have configured a `vercel.json` file in the root containing:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
* **Production Environment Variable**:
  Add `VITE_API_URL` set to `https://taskpilot-698t.onrender.com` in your Vercel Dashboard project settings.

### Backend (Render)
* Built and served using Node.js.
* Add backend environment variables (`MONGO_URI`, `JWT_SECRET`, `DEEPSEEK_API_KEY`) to the Render environment settings.

---

## 📄 License
This project is developed as part of CodSoft web dev tasks and is licensed under the MIT License.
