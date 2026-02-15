# Agent OS Web UI

A web-based user interface for Agent OS, featuring real-time chat with Claude, workflow execution, and project management.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Claude Code CLI** installed and configured (for chat and workflow features)

## Project Structure

```
agent-os-ui/
├── src/server/           # Express backend server
│   ├── index.ts          # Server entry point
│   ├── websocket.ts      # WebSocket handler
│   ├── projects.ts       # Project management
│   ├── claude-handler.ts # Claude Code integration
│   ├── workflow-executor.ts # Workflow execution
│   └── specs-reader.ts   # Spec and kanban reader
├── ui/                   # Lit frontend application
│   ├── src/
│   │   ├── app.ts        # Main app shell
│   │   ├── gateway.ts    # WebSocket client
│   │   ├── views/        # View components
│   │   ├── components/   # Reusable components
│   │   └── styles/       # CSS theme
│   └── index.html
└── config.json           # Project configuration
```

## Installation

```bash
# Clone the repository (if not already done)
cd agent-os-ui

# Install dependencies
npm install
```

## Configuration

Create or edit `config.json` in the root of `agent-os-ui/`:

```json
{
  "projects": [
    {
      "name": "my-project",
      "path": "/absolute/path/to/my-project"
    }
  ]
}
```

Each project entry requires:
- `name`: Display name for the project
- `path`: Absolute path to the project directory (must contain `.claude/` folder for workflows)

## Quick Start

### Development Mode

Run frontend and backend in development mode with hot-reload:

```bash
# Terminal 1: Start backend server (watches for changes)
npm run dev:backend

# Terminal 2: Start frontend dev server
npm run dev:ui
```

- Backend runs on: `http://localhost:3001`
- Frontend runs on: `http://localhost:5173` (with HMR)

### Production Mode

Build and run the production version:

```bash
# Build everything
npm run build

# Start the server
npm start
```

Production server runs on: `http://localhost:3001`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:backend` | Start backend in watch mode |
| `npm run dev:ui` | Start Vite dev server for frontend |
| `npm run build` | Build both backend and frontend |
| `npm run build:backend` | Build backend only |
| `npm run build:ui` | Build frontend only |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm test` | Run tests |

## Features

### Dashboard
- View all specs in the current project
- Kanban board for tracking story progress
- Story details with DoR/DoD checklists

### Chat
- Real-time streaming responses from Claude
- Tool call visualization
- Message history per session

### Workflows
- List available workflow commands
- Execute workflows with real-time progress
- Cancel running workflows
- Background execution support

## Architecture

- **Backend**: Express.js with WebSocket support
- **Frontend**: Lit Web Components with Vite
- **Communication**: JSON over WebSocket for real-time updates
- **Styling**: CSS Custom Properties (dark theme)

## Development Notes

- All components use `createRenderRoot() { return this; }` for global CSS access
- WebSocket auto-reconnects with exponential backoff (800ms to 15s)
- Responsive design supports viewport widths down to 480px

## License

MIT
