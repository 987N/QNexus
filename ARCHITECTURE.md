# Project Architecture

## Overview
QBWebUI is a modern, responsive web interface for managing qBittorrent, built with a React frontend and an Express backend. It aims to provide a premium user experience with features like multi-instance management, advanced filtering, and a polished UI.

## Tech Stack

### Frontend
-   **Framework**: React (with TypeScript)
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Charts**: Recharts
-   **Localization**: i18next / react-i18next
-   **State Management**: React Context API (`QBContext`, `ThemeContext`)

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express
-   **Database**: SQLite (via `sqlite3`)
-   **API Proxy**: `axios` (for communicating with qBittorrent Web API)

## Folder Structure

```
QBWebUI/
├── backend/                 # Express backend
│   ├── src/
│   │   ├── routes/          # API routes (torrents, containers, etc.)
│   │   ├── services/        # Business logic (QBClient, Database)
│   │   └── index.js         # Entry point
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Modals/      # Modal dialogs (AddTorrent, Settings, etc.)
│   │   │   ├── Sidebar/     # Navigation and filters
│   │   │   ├── TopBar.tsx   # Header and search
│   │   │   └── ...
│   │   ├── context/         # Global state (QBContext, ThemeContext)
│   │   ├── locales/         # Translation files (en.json, zh.json)
│   │   ├── pages/           # Main views (Dashboard)
│   │   └── main.tsx         # Entry point
│   └── package.json
└── README.md                # Project documentation
```

## Key Components

### Frontend
-   **Dashboard**: The main view, orchestrating the Sidebar, TopBar, and TorrentTable. Handles data fetching and polling.
-   **Sidebar**: Displays connection status, speed charts, and filters (Status, Categories, Tags, Trackers).
-   **TorrentTable**: A virtualized table displaying torrents with sorting and context menu support.
-   **Modals**:
    -   `AddTorrentModal`: Interface for adding new torrents (file or magnet) with category/tag selection.
    -   `SettingsModal`: Manages qBittorrent instances and UI preferences.
    -   `SetCategoryModal` / `SetTagsModal`: Quick actions for selected torrents.

### Backend
-   **QBClient**: A wrapper around the qBittorrent Web API, handling authentication and request forwarding.
-   **Database**: Stores configuration for multiple qBittorrent instances (containers).
-   **Routes**:
    -   `/api/qb-containers`: Manage qBittorrent instances.
    -   `/api/torrents`: Proxy requests to the active qBittorrent instance.

## Data Flow
1.  **Initialization**: Frontend loads and fetches the list of configured qBittorrent containers.
2.  **Selection**: User selects a container. Frontend updates `QBContext`.
3.  **Polling**: `Dashboard` polls `/api/torrents/info` every few seconds to get real-time data.
4.  **Actions**: User actions (pause, resume, delete) are sent to the backend, which forwards them to the qBittorrent API.
