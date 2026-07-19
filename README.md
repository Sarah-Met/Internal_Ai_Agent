# ZUNO: Internal AI Agent & Operations Portal

ZUNO is a comprehensive, multi-role internal operations portal and workflow automation platform designed to streamline organization management. It bridges the gap between HR administration, IT project tracking, employee session monitoring, and AI-driven internal support.

---

## 🚀 Key Features

### 1. 🤖 ZUNO AI (Conversational Assistant)
* **Intelligent Chatbot**: Fully integrated AI assistant available to all staff roles.
* **Grounded Knowledge**: Connected directly to a custom, live-editable FAQ knowledge base to answer company-specific queries accurately.

### 2. 📋 HR Center & Staff Management
* **Interactive Dashboard**: Direct overview of staff count, role distribution, and onboarding status.
* **Staff Directory**: Add, edit, delete, and view comprehensive records for all organization employees.
* **Role-Based Access**: Granular permission control tailored for different roles:
  * **System Admin (Role 1)**: Full access to all panels (Dashboard, Staff List, AI Chat, Logs, FAQ Editor, IT Projects).
  * **HR Manager (Role 2)**: Operations management including Staff Lists, Logs, and FAQ Editing.
  * **IT Support (Role 3)**: Tailored access to IT Project Kanban boards, chat, and system logs.
  * **General Staff (Role 4)**: Basic access limited to ZUNO AI assistant.

### 3. 🛠️ IT Project Management
* **Kanban Board**: Drag-and-drop task tracking split across `To Do`, `In Progress`, and `Completed` columns.
* **Scheduling**: Custom date and time selectors (including All-Day events) to set clear deadlines.
* **Collaboration**: Multi-assignee support with custom check list, departmental badges, and initials-based color gradients.
* **Work Logging**: Interactive task editing allowing updates, notes logging, and task summaries.

### 4. 📈 Log History & Audit Trails
* **Session Tracking**: Automatic logging of employee login times, logout times, active status, and total time spent working.
* **Advanced Filters**: Query, filter, and sort session logs by Employee ID, name, email, role, department, password changes, or login times.

### 5. ✎ FAQ Editor
* **Knowledge Management**: Simple interface for Admins and HR personnel to create, edit, update, or remove articles from the chatbot’s database.

---

## 🛠️ Technology Stack

### Frontend
* **Core**: React 19, JavaScript (ES6+), HTML5, CSS3 (Vanilla design style)
* **Build Tool**: Vite 7
* **Styling**: Tailored responsive layouts, gradients, animations, and custom UI components (e.g. datepickers, check lists).

### Backend
* **Framework**: NestJS (Node.js progressive framework), TypeScript
* **Database**: MongoDB & Mongoose ODM
* **Authentication**: Session-based login, password expirations, and audit log middleware.

### Automation & Workflows
* **Workflow Engine**: **n8n** integration for webhook triggers and staff data retrieval.

---

## 📂 Project Structure

```
├── Project/
│   ├── System folder/
│   │   ├── backend/             # NestJS Server & API routes
│   │   │   ├── src/
│   │   │   │   ├── auth/        # Login, logout, session logging
│   │   │   │   ├── chat/        # AI chatbot communications
│   │   │   │   └── it-tasks/    # IT Project board endpoints
│   │   ├── frontend/            # React + Vite application
│   │   │   ├── src/
│   │   │   │   ├── ChatInterface.jsx
│   │   │   │   ├── FAQEditor.jsx
│   │   │   │   ├── HRPanel.jsx
│   │   │   │   ├── ITProjectManager.jsx
│   │   │   │   ├── Layout.jsx
│   │   │   │   └── Login.jsx
│   └── HR workflow.json         # n8n workflow definition
```

---

## 🏃 Run the Project Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [MongoDB](https://www.mongodb.com/) (running instance or cloud URI)
* [n8n](https://n8n.io/) (for webhook workflows)

### 1. Database Setup
1. Configure your MongoDB instance.
2. In `Project/System folder/backend/.env`, set your connection URI:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   ```

### 2. Run the Backend Server
Navigate to the backend directory and launch the server:
```bash
cd "Project/System folder/backend"
npm install
npm run start:dev
```
The API server will run at `http://localhost:3000`.

### 3. Run the Frontend App
Navigate to the frontend directory and launch the dev environment:
```bash
cd "Project/System folder/frontend"
npm install
npm run dev
```
The application will open at `http://localhost:5173`.

### 4. Setup n8n
Import the `Project/HR workflow.json` workflow file into your local n8n instance to enable the automated HR pipelines and employee data webhooks.