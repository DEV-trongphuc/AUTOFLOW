
export interface HistoryLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details: string;
  flowId?: string;
}

export const logAction = (action: string, details: string, flowId?: string): HistoryLog[] => {
  const newLog: HistoryLog = {
    id: crypto.randomUUID(),
    action,
    details,
    timestamp: new Date().toISOString(),
    user: 'Admin',
    flowId
  };

  try {
    const logs = JSON.parse(localStorage.getItem('mailflow_logs') || '[]');
    // Limit to 50 entries for better history tracking (up from 10)
    const updatedLogs = [newLog, ...logs].slice(0, 50);
    try {
      localStorage.setItem('mailflow_logs', JSON.stringify(updatedLogs));
    } catch (quotaErr) {
      // QuotaExceededError: trim aggressively and retry
      if (quotaErr instanceof DOMException && quotaErr.name === 'QuotaExceededError') {
        const trimmed = updatedLogs.slice(0, 10);
        try {
          localStorage.setItem('mailflow_logs', JSON.stringify(trimmed));
        } catch {
          // Storage completely full — clear only logs key, keep auth tokens
          localStorage.removeItem('mailflow_logs');
        }
      }
    }
    return JSON.parse(localStorage.getItem('mailflow_logs') || '[]');
  } catch {
    return [newLog];
  }
};

export const getLogs = (): HistoryLog[] => {
  try {
    return JSON.parse(localStorage.getItem('mailflow_logs') || '[]');
  } catch {
    return [];
  }
};
