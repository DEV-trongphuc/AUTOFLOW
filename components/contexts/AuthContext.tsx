import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../../services/storageAdapter';

// Interfaces for structured roles
interface Workspace {
  id: number;
  name: string;
}

interface UserAuth {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: UserAuth | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (id: number) => void;
  can: (permissionSlug: string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentWorkspace: null,
  workspaces: [],
  switchWorkspace: () => {},
  can: () => false,
  isLoading: true
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserAuth | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        // [FIX] Use api service (sends auth cookie + correct base URL) instead of raw fetch
        const wsData = await api.get<any>('workspaces?action=list');
        if (wsData.success && wsData.data?.length > 0) {
          setWorkspaces(wsData.data);
          // Restore last active workspace from localStorage if available
          const savedWsId = localStorage.getItem('current_workspace_id');
          const savedWs = savedWsId
            ? wsData.data.find((w: Workspace) => w.id === parseInt(savedWsId))
            : null;
          setCurrentWorkspace(savedWs || wsData.data[0]);
        }

        // Load logged-in user from localStorage (set by Login.tsx on auth success)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser({
              id: parsed.id || 'unknown',
              email: parsed.email || '',
              full_name: parsed.full_name || parsed.username || 'User',
              role: parsed.role || 'user',
              permissions: (
                parsed.id === 'admin-001' ||
                parsed.email === 'dom.marketing.vn@gmail.com' ||
                parsed.role === 'admin'
              ) ? ['*'] : parsed.permissions || ['view_analytics', 'edit_campaigns']
            });
          } catch (e) {
            console.error('[AuthContext] Failed to parse stored user:', e);
          }
        } else {
          setUser(null);
        }

      } catch (err) {
        console.error('[AuthContext] Failed to load auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const switchWorkspace = async (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (!ws) return;
    try {
      // [FIX] Use api.post to send auth cookie + workspace header correctly
      await api.post('workspaces?action=switch', { workspace_id: id });
      setCurrentWorkspace(ws);
      localStorage.setItem('current_workspace_id', id.toString());
      window.location.reload();
    } catch (e) {
      console.error('[AuthContext] Failed to switch workspace context:', e);
    }
  };

  const can = (permissionSlug: string) => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permissionSlug);
  };

  return (
    <AuthContext.Provider value={{ user, currentWorkspace, workspaces, switchWorkspace, can, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
