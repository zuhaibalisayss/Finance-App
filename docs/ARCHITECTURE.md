# Finance Manager - Offline Desktop Application

## Overview
Finance Manager is a 100% offline Windows desktop application for personal finance management. All data is stored locally on your device with no cloud synchronization or external dependencies.

## Architecture

### Data Layer
- **Storage**: localStorage + Electron IPC for filesystem persistence
- **Location**: %APPDATA%\finance-manager\finance-data.json
- **Format**: JSON with versioned schema
- **Encryption**: None (data stored locally only)

### Authentication
- **Type**: Local device-only authentication
- **Password Storage**: SHA-256 hashed with salt
- **Session**: localStorage-based session management
- **No Cloud**: No external authentication services

### Core Modules

#### 1. localStorage.js
Central data management module providing:
- CRUD operations for all entity types
- Audit logging
- Settings management
- Data migration support

Entities supported:
- Accounts
- Transactions
- Investments
- InvestmentTransactions
- Businesses
- BusinessTransactions
- Assets
- Liabilities
- Goals
- Budgets
- Categories
- NetWorthSnapshots

#### 2. AuthContextLocal.jsx
Local authentication provider:
- User registration/login
- Password hashing using Web Crypto API
- Session management
- Profile updates
- Password changes

#### 3. Electron Integration
- main.js: Electron main process handling window creation and file I/O
- preload.js: Secure bridge between renderer and main process
- IPC Channels: save-data, load-data, get-user-data-path

## Data Flow

### Reading Data
1. Component calls entities.EntityName.list()
2. localStorage.js loads data from localStorage
3. If Electron API available, also checks filesystem
4. Returns parsed data array

### Writing Data
1. Component calls entities.EntityName.create(data)
2. localStorage.js generates ID and timestamp
3. Saves to localStorage
4. If Electron API available, also saves to filesystem
5. Returns created entity

### Security Considerations
- All data stored in plaintext locally
- No transmission over network
- Password hashes use SHA-256 with app-specific salt
- Audit log tracks all data modifications
- No sensitive data in logs

## File Structure
```
src/
  lib/
    localStorage.js      # Data layer
    AuthContextLocal.jsx # Authentication
    finance.js           # Financial calculations
  pages/
    *Local.jsx           # Page components using local storage
  components/
    LayoutLocal.jsx      # Main layout
    ProtectedRouteLocal.jsx # Route protection
  electron/
    main.js              # Electron main process
    preload.js           # Preload script
```

## Development Notes
- UI/UX remains identical to original design
- All business logic preserved
- Data source uses localStorage + Electron filesystem for persistence
