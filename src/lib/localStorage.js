// Local Storage Manager for Offline Finance Application
// This module provides persistent local storage using Electron's filesystem
// All data is stored locally on the user's device - no cloud synchronization

const STORAGE_KEY = 'finance_manager_data';
const VERSION = '1.0.0';

// Default data structure
const getDefaultData = () => ({
  version: VERSION,
  lastUpdated: new Date().toISOString(),
  accounts: [],
  transactions: [],
  investments: [],
  investmentTransactions: [],
  businesses: [],
  businessTransactions: [],
  assets: [],
  liabilities: [],
  goals: [],
  budgets: [],
  categories: [],
  settings: {
    currency: 'USD',
    theme: 'light',
    dateFormat: 'MM/DD/YYYY',
  },
  auditLog: []
});

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Save data to localStorage (and Electron IPC if available)
export async function saveData(data) {
  try {
    const dataToSave = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    
    // Also save via Electron IPC if available
    if (window.electronAPI) {
      await window.electronAPI.saveData(dataToSave);
    }
    
    return dataToSave;
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

// Load data from localStorage (or Electron IPC if available)
export async function loadData() {
  try {
    // Try loading from Electron IPC first
    if (window.electronAPI) {
      const result = await window.electronAPI.loadData();
      if (result.success && result.data) {
        return result.data;
      }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Return default data if nothing found
    return getDefaultData();
  } catch (error) {
    console.error('Error loading data:', error);
    return getDefaultData();
  }
}

// Initialize storage
export async function initStorage() {
  const data = await loadData();
  
  // Migrate old data structures if needed
  if (data.version !== VERSION) {
    console.log('Migrating data from version', data.version, 'to', VERSION);
    const migrated = migrateData(data);
    await saveData(migrated);
    return migrated;
  }
  
  return data;
}

// Data migration helper
function migrateData(oldData) {
  // Add migration logic here for future versions
  return {
    ...getDefaultData(),
    ...oldData,
    version: VERSION
  };
}

// Entity operations helpers
export const entities = {
  Account: {
    list: async () => {
      const data = await loadData();
      return data.accounts || [];
    },
    create: async (account) => {
      const data = await loadData();
      const newAccount = { ...account, id: generateId(), createdAt: new Date().toISOString() };
      data.accounts.push(newAccount);
      await saveData(data);
      return newAccount;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.accounts.findIndex(a => a.id === id);
      if (index === -1) throw new Error('Account not found');
      data.accounts[index] = { ...data.accounts[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.accounts[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.accounts = data.accounts.filter(a => a.id !== id);
      await saveData(data);
      return { success: true };
    },
    getById: async (id) => {
      const data = await loadData();
      return data.accounts.find(a => a.id === id);
    }
  },

  Transaction: {
    list: async (orderBy = '-date', limit = 500) => {
      const data = await loadData();
      let transactions = data.transactions || [];
      
      // Sort transactions
      const [field, direction] = orderBy.startsWith('-') ? [orderBy.substring(1), 'desc'] : [orderBy, 'asc'];
      transactions.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
      
      return transactions.slice(0, limit);
    },
    create: async (transaction) => {
      const data = await loadData();
      const newTransaction = { ...transaction, id: generateId(), createdAt: new Date().toISOString() };
      data.transactions.push(newTransaction);
      await saveData(data);
      await addAuditLog('transaction_create', `Created transaction: ${transaction.description || transaction.type}`);
      return newTransaction;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.transactions.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Transaction not found');
      data.transactions[index] = { ...data.transactions[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      await addAuditLog('transaction_update', `Updated transaction: ${id}`);
      return data.transactions[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.transactions = data.transactions.filter(t => t.id !== id);
      await saveData(data);
      await addAuditLog('transaction_delete', `Deleted transaction: ${id}`);
      return { success: true };
    }
  },

  Investment: {
    list: async () => {
      const data = await loadData();
      return data.investments || [];
    },
    create: async (investment) => {
      const data = await loadData();
      const newInvestment = { ...investment, id: generateId(), createdAt: new Date().toISOString() };
      data.investments.push(newInvestment);
      await saveData(data);
      return newInvestment;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.investments.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Investment not found');
      data.investments[index] = { ...data.investments[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.investments[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.investments = data.investments.filter(i => i.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  InvestmentTransaction: {
    list: async (orderBy = '-date', limit = 1000) => {
      const data = await loadData();
      let transactions = data.investmentTransactions || [];
      const [field, direction] = orderBy.startsWith('-') ? [orderBy.substring(1), 'desc'] : [orderBy, 'asc'];
      transactions.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
      return transactions.slice(0, limit);
    },
    create: async (transaction) => {
      const data = await loadData();
      const newTransaction = { ...transaction, id: generateId(), createdAt: new Date().toISOString() };
      data.investmentTransactions.push(newTransaction);
      await saveData(data);
      return newTransaction;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.investmentTransactions.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Investment transaction not found');
      data.investmentTransactions[index] = { ...data.investmentTransactions[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.investmentTransactions[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.investmentTransactions = data.investmentTransactions.filter(t => t.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Business: {
    list: async () => {
      const data = await loadData();
      return data.businesses || [];
    },
    create: async (business) => {
      const data = await loadData();
      const newBusiness = { ...business, id: generateId(), createdAt: new Date().toISOString() };
      data.businesses.push(newBusiness);
      await saveData(data);
      return newBusiness;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.businesses.findIndex(b => b.id === id);
      if (index === -1) throw new Error('Business not found');
      data.businesses[index] = { ...data.businesses[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.businesses[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.businesses = data.businesses.filter(b => b.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  BusinessTransaction: {
    list: async (orderBy = '-date', limit = 1000) => {
      const data = await loadData();
      let transactions = data.businessTransactions || [];
      const [field, direction] = orderBy.startsWith('-') ? [orderBy.substring(1), 'desc'] : [orderBy, 'asc'];
      transactions.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
      return transactions.slice(0, limit);
    },
    create: async (transaction) => {
      const data = await loadData();
      const newTransaction = { ...transaction, id: generateId(), createdAt: new Date().toISOString() };
      data.businessTransactions.push(newTransaction);
      await saveData(data);
      return newTransaction;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.businessTransactions.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Business transaction not found');
      data.businessTransactions[index] = { ...data.businessTransactions[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.businessTransactions[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.businessTransactions = data.businessTransactions.filter(t => t.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Asset: {
    list: async () => {
      const data = await loadData();
      return data.assets || [];
    },
    create: async (asset) => {
      const data = await loadData();
      const newAsset = { ...asset, id: generateId(), createdAt: new Date().toISOString() };
      data.assets.push(newAsset);
      await saveData(data);
      return newAsset;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.assets.findIndex(a => a.id === id);
      if (index === -1) throw new Error('Asset not found');
      data.assets[index] = { ...data.assets[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.assets[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.assets = data.assets.filter(a => a.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Liability: {
    list: async () => {
      const data = await loadData();
      return data.liabilities || [];
    },
    create: async (liability) => {
      const data = await loadData();
      const newLiability = { ...liability, id: generateId(), createdAt: new Date().toISOString() };
      data.liabilities.push(newLiability);
      await saveData(data);
      return newLiability;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.liabilities.findIndex(l => l.id === id);
      if (index === -1) throw new Error('Liability not found');
      data.liabilities[index] = { ...data.liabilities[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.liabilities[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.liabilities = data.liabilities.filter(l => l.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Goal: {
    list: async () => {
      const data = await loadData();
      return data.goals || [];
    },
    create: async (goal) => {
      const data = await loadData();
      const newGoal = { ...goal, id: generateId(), createdAt: new Date().toISOString() };
      data.goals.push(newGoal);
      await saveData(data);
      return newGoal;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.goals.findIndex(g => g.id === id);
      if (index === -1) throw new Error('Goal not found');
      data.goals[index] = { ...data.goals[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.goals[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.goals = data.goals.filter(g => g.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Budget: {
    list: async () => {
      const data = await loadData();
      return data.budgets || [];
    },
    create: async (budget) => {
      const data = await loadData();
      const newBudget = { ...budget, id: generateId(), createdAt: new Date().toISOString() };
      data.budgets.push(newBudget);
      await saveData(data);
      return newBudget;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.budgets.findIndex(b => b.id === id);
      if (index === -1) throw new Error('Budget not found');
      data.budgets[index] = { ...data.budgets[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.budgets[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.budgets = data.budgets.filter(b => b.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  Category: {
    list: async () => {
      const data = await loadData();
      return data.categories || [];
    },
    create: async (category) => {
      const data = await loadData();
      const newCategory = { ...category, id: generateId(), createdAt: new Date().toISOString() };
      data.categories.push(newCategory);
      await saveData(data);
      return newCategory;
    },
    update: async (id, updates) => {
      const data = await loadData();
      const index = data.categories.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Category not found');
      data.categories[index] = { ...data.categories[index], ...updates, updatedAt: new Date().toISOString() };
      await saveData(data);
      return data.categories[index];
    },
    delete: async (id) => {
      const data = await loadData();
      data.categories = data.categories.filter(c => c.id !== id);
      await saveData(data);
      return { success: true };
    }
  },

  NetWorthSnapshot: {
    list: async (orderBy = '-date', limit = 200) => {
      const data = await loadData();
      let snapshots = data.snapshots || [];
      const [field, direction] = orderBy.startsWith('-') ? [orderBy.substring(1), 'desc'] : [orderBy, 'asc'];
      snapshots.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
      return snapshots.slice(0, limit);
    },
    create: async (snapshot) => {
      const data = await loadData();
      const newSnapshot = { ...snapshot, id: generateId(), createdAt: new Date().toISOString() };
      data.snapshots.push(newSnapshot);
      await saveData(data);
      return newSnapshot;
    }
  }
};

// Audit logging
async function addAuditLog(action, details = '') {
  const data = await loadData();
  const logEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    details: String(details || '')
  };
  data.auditLog.push(logEntry);
  // Keep only last 1000 entries
  if (data.auditLog.length > 1000) {
    data.auditLog = data.auditLog.slice(-1000);
  }
  await saveData(data);
  return logEntry;
}

export async function audit(action, details = '') {
  return addAuditLog(action, details);
}

// Settings helpers
export function getSetting(key, fallback) {
  try {
    const v = localStorage.getItem('pf_' + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  try {
    localStorage.setItem('pf_' + key, JSON.stringify(value));
  } catch {}
}

// Utility functions
export function maskId(id) {
  if (!id) return '';
  const s = String(id);
  return '**** ' + s.slice(-4);
}
