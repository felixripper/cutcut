# Cut and Save Game

A fun "Cut and Save" game built with React, OnchainKit, and Base blockchain integration.

## Description

Cut and Save (Kes ve Kurtar) is an interactive game where players cut ropes to save capsules. The game features on-chain functionality using Base network for saving scores.

## Features

- Interactive gameplay with rope cutting mechanics
- Integration with Base blockchain via OnchainKit
- Wallet connection support
- On-chain score saving
- Admin panel for game configuration
- Multiple game levels

## Development Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
VITE_CDP_API_KEY=your_coinbase_api_key_here
```

### Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Running the Production Server

```bash
npm run server
```

## VS Code Setup

This project includes VS Code configuration for an enhanced development experience:

- **Auto-formatting** on save (requires Prettier extension)
- **ESLint** integration for code quality
- **Recommended extensions** - Install the recommended extensions when prompted
- **Debug configurations** - Use F5 to start debugging

### Recommended Extensions

The project recommends these VS Code extensions (defined in `.vscode/extensions.json`):
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- Auto Rename Tag
- ES7 React/Redux snippets
- npm IntelliSense
- Babel JavaScript

## Project Structure

```
cutcut/
├── src/
│   ├── App.jsx          # Main application component
│   ├── Game.jsx         # Game component
│   ├── AdminPanel.jsx   # Admin configuration panel
│   ├── game.js          # Game logic
│   ├── gameConfig.json  # Game configuration
│   └── gameAssets.json  # Game assets configuration
├── public/              # Static assets
├── dist/                # Build output
├── .vscode/             # VS Code configuration
└── package.json         # Project dependencies

```

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **OnchainKit** - Coinbase's toolkit for Base blockchain integration
- **Material-UI** - UI components
- **React Router** - Routing
- **Viem** - Ethereum interactions

## License

ISC

---

Redeploy trigger timestamp: 2025-10-30T09:38:00Z