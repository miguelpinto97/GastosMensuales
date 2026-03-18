import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // Estado para usuario que entró con google pero es su primera vez
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Guardaremos el proyecto activo para filtrar todas las peticiones
  const [activeProject, setActiveProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setCurrentUser({ 
            username: decoded.username, 
            email: decoded.email,
            picture: decoded.picture
          });
        }
      } catch (err) {
        logout();
      }
    }
    setIsInitializing(false);
  }, [token]);

  useEffect(() => {
    if (currentUser?.username) {
      fetchMyProjects();
    }
  }, [currentUser]);

  const fetchMyProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`/.netlify/functions/projects?username=${currentUser.username}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      const userProjects = Array.isArray(data) ? data : [];
      setProjects(userProjects);

      if (userProjects.length > 0 && !activeProject) {
        setActiveProject(userProjects[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const res = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'SIGN_IN', token: credential })
      });
      const data = await res.json();

      if (data.requiresRegistration) {
        setPendingRegistration({
          email: data.email,
          name: data.name,
          picture: data.picture,
          token: credential
        });
        return { needsProfile: true };
      } else if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        return { success: true };
      }
      return { success: false, error: 'Respuesta desconocida del servidor' };

    } catch (err) {
      console.error("Login failed", err);
      return { success: false, error: err.message };
    }
  };

  const completeRegistration = async (username) => {
    try {
      const res = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'COMPLETE_REGISTRATION',
          token: pendingRegistration.token,
          username: username
        })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setPendingRegistration(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setActiveProject(null);
    setProjects([]);
  };

  const createProject = async (name) => {
    try {
      const res = await fetch('/.netlify/functions/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'CREATE', name, username: currentUser.username })
      });
      if (res.ok) {
        const newProject = await res.json();
        setProjects(prev => [...prev, newProject]);
        setActiveProject(newProject.id); // Auto-select new project
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error creating project:', err);
      return false;
    }
  };

  const shareProject = async (emailOrUsername) => {
    try {
      const res = await fetch('/.netlify/functions/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'SHARE',
          project_id: activeProject,
          email: emailOrUsername,
          username: emailOrUsername
        })
      });
      if (res.ok) return true;
      const data = await res.json();
      alert(data.error || 'Error al compartir.');
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteProject = async () => {
    try {
      const res = await fetch(`/.netlify/functions/projects?action=DELETE&project_id=${activeProject}&username=${currentUser.username}`, { method: 'DELETE' });
      if (res.ok) {
        setActiveProject(null);
        await fetchMyProjects();
        return true;
      }
      const data = await res.json();
      alert(data.error || 'Error al borrar.');
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const leaveProject = async () => {
    try {
      const res = await fetch(`/.netlify/functions/projects?action=LEAVE&project_id=${activeProject}&username=${currentUser.username}`, { method: 'DELETE' });
      if (res.ok) {
        setActiveProject(null);
        await fetchMyProjects();
        return true;
      }
      const data = await res.json();
      alert(data.error || 'Error al salir.');
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Helper global para pasar headers en todas las peticiones protegidas
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-User-Id': currentUser?.username,
      'X-Project-Id': activeProject || '',
      'Authorization': `Bearer ${token}`
    };
  };

  const isOwner = (itemCreatedBy) => currentUser && itemCreatedBy === currentUser.username;

  return (
    <AuthContext.Provider value={{
      isInitializing,
      currentUser,
      token,
      pendingRegistration,
      activeProject,
      setActiveProject,
      projects,
      loadingProjects,
      getAuthHeaders,
      isOwner,
      refreshProjects: fetchMyProjects,
      createProject,
      shareProject,
      deleteProject,
      leaveProject,
      loginWithGoogle,
      completeRegistration,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
