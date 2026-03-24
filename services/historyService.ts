
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

  const logs = JSON.parse(localStorage.getItem('mailflow_logs') || '[]');
  // Limit to 50 entries for better history tracking (up from 10)
  const updatedLogs = [newLog, ...logs].slice(0, 50);
  localStorage.setItem('mailflow_logs', JSON.stringify(updatedLogs));

  return updatedLogs;
};

export const getLogs = (): HistoryLog[] => {
  return JSON.parse(localStorage.getItem('mailflow_logs') || '[]');
};
