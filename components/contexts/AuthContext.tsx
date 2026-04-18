import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    // In actual implementation, we would fetch /api/ai_org_auth.php?action=check
    // and /api/workspaces.php
    const loadAuth = async () => {
      try {
        const wsRes = await fetch('/mail_api/workspaces.php?action=list');
        const wsData = await wsRes.json();
        
        if (wsData.success && wsData.data.length > 0) {
          setWorkspaces(wsData.data);
          setCurrentWorkspace(wsData.data[0]); // Default to first
        }
        
        // Load actual logged-in user state
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser({
              id: parsed.id || 'unknown',
              email: parsed.email || '',
              full_name: parsed.full_name || parsed.username || 'User',
              role: parsed.role || 'user',
              permissions: (parsed.id === 'admin-001' || parsed.email === 'dom.marketing.vn@gmail.com' || parsed.role === 'admin') ? ['*'] : parsed.permissions || ['view_analytics', 'edit_campaigns']
            });
          } catch(e) {}
        } else {
            // Fallback for dev / unauthenticated default
            setUser(null);
        }

      } catch (err) {
        console.error("Failed to load auth state", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuth();
  }, []);

  const switchWorkspace = async (id: number) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      try {
        await fetch('/mail_api/workspaces.php?action=switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: id })
        });
        setCurrentWorkspace(ws);
        localStorage.setItem('current_workspace_id', id.toString());
        window.location.reload();
      } catch(e) {
        console.error("Failed to switch workspace context", e);
      }
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
