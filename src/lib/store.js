import { audit as dbAudit } from './localStorage';

// Audit log function
export async function audit(action, details = {}) {
  try {
    await dbAudit(action, JSON.stringify(details));
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

// Settings functions using localStorage
const SETTINGS_KEY = 'finance_app_settings';

export function getSetting(key, defaultValue = null) {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return settings[key] !== undefined ? settings[key] : defaultValue;
  } catch (error) {
    console.error('Error getting setting:', error);
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    await audit('setting_changed', { key, value });
    return true;
  } catch (error) {
    console.error('Error setting setting:', error);
    return false;
  }
}

export default { audit, getSetting, setSetting };
