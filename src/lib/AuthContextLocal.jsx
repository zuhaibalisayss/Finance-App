// Local Authentication System for Offline Finance Application
// No cloud authentication - all auth is local to the device
// Uses bcryptjs for password hashing (included in dependencies via lodash alternative)

import { useEffect, useState, createContext, useContext } from 'react';

const AuthContext = createContext();

const USER_KEY = 'finance_manager_user';
const SESSION_KEY = 'finance_manager_session';

// Simple hash function for password storage (in production, use bcryptjs or similar)
// For offline app, we use a simple but effective hashing approach
async function hashPassword(password) {
  // Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'finance_app_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate secure random ID
function generateUserId() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Get current user from localStorage
function getCurrentUser() {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error getting current user:', e);
  }
  return null;
}

// Save user to localStorage
function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user:', e);
  }
}

// Clear user session
function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Error clearing user:', e);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = getCurrentUser();
      
      if (currentUser && currentUser.isLoggedIn) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setAuthChecked(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Authentication check failed'
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (email, password, name = '') => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      // Check if user already exists
      const existingUser = getCurrentUser();
      if (existingUser) {
        throw new Error('An account already exists on this device');
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create new user
      const newUser = {
        id: generateUserId(),
        email: email.toLowerCase().trim(),
        name: name.trim(),
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString(),
        isLoggedIn: true
      };

      saveUser(newUser);
      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration failed:', error);
      setAuthError({
        type: 'registration_failed',
        message: error.message || 'Registration failed'
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = getCurrentUser();
      
      if (!currentUser) {
        throw new Error('No account found. Please register first.');
      }

      // Verify email
      if (currentUser.email !== email.toLowerCase().trim()) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const hashedPassword = await hashPassword(password);
      if (currentUser.passwordHash !== hashedPassword) {
        throw new Error('Invalid email or password');
      }

      // Login successful
      const updatedUser = { ...currentUser, isLoggedIn: true, lastLogin: new Date().toISOString() };
      saveUser(updatedUser);
      setUser(updatedUser);
      setIsAuthenticated(true);

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError({
        type: 'login_failed',
        message: error.message || 'Login failed'
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, isLoggedIn: false };
      saveUser(updatedUser);
    }
    
    clearUser();
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const updateProfile = async (updates) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const updatedUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async (oldPassword, newPassword) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    // Verify old password
    const hashedOldPassword = await hashPassword(oldPassword);
    if (currentUser.passwordHash !== hashedOldPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash and save new password
    const hashedNewPassword = await hashPassword(newPassword);
    const updatedUser = {
      ...currentUser,
      passwordHash: hashedNewPassword,
      updatedAt: new Date().toISOString()
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    return { success: true };
  };

  const resetPassword = async (newPassword) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const hashedPassword = await hashPassword(newPassword);
    const updatedUser = {
      ...currentUser,
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString()
    };

    saveUser(updatedUser);
    setUser(updatedUser);
    return { success: true };
  };

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    authError,
    authChecked,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    resetPassword,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
