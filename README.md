# Finance Manager - Offline Windows Desktop Application

A comprehensive personal finance management application that runs 100% offline on Windows. All your financial data is stored locally on your device with no cloud synchronization or external dependencies.

## Features

- Account Management (Bank, Savings, Cash, Wallets)
- Transaction Tracking (Income, Expenses, Transfers)
- Investment Portfolio Management
- Business Finance Tracking
- Asset Management (Stocks, Real Estate, Crypto)
- Liability Tracking (Loans, Credit Cards)
- Financial Goals Setting
- Budget Planning
- Net Worth Calculation
- Financial Reports and Analytics
- Data Import/Export
- Backup and Restore
- Audit Logging

## System Requirements

- Operating System: Windows 10 or later (64-bit)
- Processor: Intel Core i3 or equivalent (Intel Core i5 recommended)
- Memory: 4 GB RAM minimum (8 GB recommended)
- Disk Space: 500 MB available space
- Node.js: Version 18.0 or later

## Installation

### Step 1: Install Node.js

1. Download Node.js from https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Run the installer and follow the installation wizard
4. Verify installation by opening Command Prompt and running:
   ```
   node --version
   npm --version
   ```

### Step 2: Clone or Download the Application

If you have the source code:
```
cd Finance-Manager
```

### Step 3: Install Dependencies

Open Command Prompt in the application directory and run:
```
npm install
```

This will install all required packages including Electron for desktop functionality.

### Step 4: Build the Application

For development mode:
```
npm run dev
```

For production build:
```
npm run electron:build
```

This creates a Windows installer in the `dist-electron` folder.

## Running the Application

### Development Mode
```
npm run electron:dev
```
This starts the app with hot-reload for development.

### Production Mode
After building, run:
```
npm run electron:start
```

Or double-click the installed application from Start Menu or Desktop shortcut.

## First Time Setup

### Creating Your Account

1. Launch the application
2. Click "Create Account" on the welcome screen
3. Enter your email address (used for local identification only)
4. Create a strong password (minimum 8 characters recommended)
5. Enter your name (optional)
6. Click "Register"

Note: This account is stored only on this device. There is no cloud account or online registration.

### Setting Up Your Financial Profile

#### 1. Add Accounts
- Navigate to "Cash & Savings"
- Click "Add Account"
- Choose account type (Bank, Savings, Cash, Wallet, etc.)
- Enter account name and initial balance
- Select currency
- Click "Save"

#### 2. Record Transactions
- Go to "Transactions"
- Click "Add Transaction"
- Select transaction type (Income, Expense, Transfer)
- Choose account
- Enter amount, date, and description
- Select category
- Add notes if needed
- Click "Save"

#### 3. Set Up Investments
- Navigate to "Investments"
- Click "Add Investment"
- Select investment type (Stock, Bond, Mutual Fund, etc.)
- Enter details (name, quantity, purchase price)
- Track investment transactions separately

#### 4. Manage Assets
- Go to "Assets"
- Add assets like Real Estate, Vehicles, Valuables
- Track current value and purchase information

#### 5. Track Liabilities
- Navigate to "Liabilities"
- Add loans, credit cards, mortgages
- Track balances and payments

#### 6. Create Budgets
- Go to "Budgets"
- Set monthly budgets for categories
- Monitor spending against budgets

#### 7. Set Financial Goals
- Navigate to "Goals"
- Define savings goals
- Set target amounts and deadlines
- Track progress

## Daily Usage

### Recording Daily Expenses
1. Open the application
2. Go to Transactions
3. Click "Add Transaction"
4. Select "Expense"
5. Choose account (Cash/Card used)
6. Enter amount and category
7. Add brief description
8. Save

### Reviewing Financial Status
- Dashboard: Quick overview of accounts, recent transactions
- Net Worth: Total assets minus liabilities
- Reports: Visual charts and trends
- Budgets: Spending vs budgeted amounts

### Monthly Tasks
1. Reconcile account balances
2. Review and categorize transactions
3. Check budget performance
4. Update investment values
5. Review net worth changes
6. Backup your data

## Data Storage and Privacy

### Where Data is Stored
All data is stored locally at:
```
C:\Users\[YourUsername]\AppData\Roaming\finance-manager\finance-data.json
```

### Data Format
- JSON format for easy reading and backup
- Includes all accounts, transactions, investments, settings
- Version tracked for future migrations

### Privacy
- No data leaves your computer
- No analytics or tracking
- No third-party services
- Complete ownership of your financial data

### Backup Your Data
Regular backups are crucial:

Method 1: In-App Export
1. Go to Import/Export
2. Click "Export Data"
3. Save the JSON file to a secure location
4. Repeat weekly or after important changes

Method 2: Manual Backup
1. Close the application
2. Copy the finance-data.json file from AppData folder
3. Store in backup location (external drive, cloud storage if desired)

Method 3: Restore from Backup
1. Go to Import/Export
2. Click "Import Data"
3. Select your backup file
4. Confirm restoration

## Security Best Practices

### Password Security
- Use a strong, unique password
- Consider using a password manager
- Never share your password
- The app uses SHA-256 hashing for password storage

### Device Security
- Keep your Windows updated
- Use antivirus software
- Lock your computer when away
- Regular data backups

### Data Protection
- Encrypt your backups if storing externally
- Keep multiple backup copies
- Test restore process periodically

## Troubleshooting

### Application Won't Start
1. Ensure Node.js is installed correctly
2. Delete node_modules folder and run `npm install` again
3. Check if another instance is already running
4. Restart your computer

### Data Not Saving
1. Check disk space availability
2. Ensure AppData folder has write permissions
3. Try running as Administrator
4. Check for error messages in console (F12 in dev mode)

### Slow Performance
1. Reduce data loaded (filter transactions by date)
2. Clear browser cache (in dev mode)
3. Check system resources (Task Manager)
4. Consider archiving old transactions

### Lost Data
1. Check backup locations
2. Look in AppData folder for previous versions
3. Use Import/Export to restore from backup
4. Contact support if issue persists

## Commands Reference

| Command | Description |
|---------|-------------|
| npm run dev | Start Vite development server |
| npm run build | Build for production |
| npm run electron:dev | Run Electron app in development mode |
| npm run electron:build | Build Electron app for distribution |
| npm run electron:start | Start built Electron app |
| npm run lint | Check code for issues |
| npm run lint:fix | Automatically fix linting issues |

## Uninstallation

### Windows
1. Close the application
2. Go to Settings > Apps > Installed Apps
3. Find "Finance Manager"
4. Click Uninstall
5. Optionally delete data folder: `%APPDATA%\finance-manager`

## Support and Updates

### Getting Help
- Check this README for common issues
- Review documentation in /docs folder
- Report bugs with detailed steps to reproduce

### Updates
- Check for updates periodically
- Backup data before updating
- Follow update instructions provided

## License and Legal

This software is provided as-is for personal use.
No warranty expressed or implied.
Users are responsible for their own data backup and security.

## Version History

Version 1.0.0
- Initial offline release
- Local storage implementation
- Electron desktop integration
- Complete feature set from original web version
