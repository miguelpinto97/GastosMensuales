import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LineChart, Receipt, Tags, Wallet, FolderOpen, User, PlusCircle, Share2, Loader2, X, Check, Settings, Trash2, LogOut, LayoutGrid } from 'lucide-react';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Dashboard from './pages/Dashboard';
import ExpensesForm from './pages/ExpensesForm';
import FixedExpensesGrid from './pages/FixedExpensesGrid';
import IncomesForm from './pages/IncomesForm';
import FixedIncomesGrid from './pages/FixedIncomesGrid';
import CategoriesManager from './pages/CategoriesManager';
import Landing from './pages/Landing';
import CompleteProfile from './pages/CompleteProfile';
import { AuthProvider, useAuth } from './context/AuthContext';

function Navigation() {
  const location = useLocation();
  const { currentUser, projects, activeProject, setActiveProject, loadingProjects, createProject, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    const success = await createProject(newProjectName.trim());
    if (success) {
      setNewProjectName('');
      setIsCreatingProject(false);
    } else {
      alert('Error al crear el proyecto.');
    }
    setCreating(false);
  };

  const [showSettings, setShowSettings] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const { shareProject, deleteProject, leaveProject, isOwner } = useAuth();
  const activeProjectObj = projects.find(p => p.id === activeProject);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const ok = await shareProject(inviteEmail.trim());
    if (ok) {
      alert('Invitación enviada exitosamente.');
      setInviteEmail('');
    }
  };

  const handleProjectDelete = async () => {
    if (window.confirm('¿ELIMINAR ESTE PROYECTO INCLUYENDO SUS GASTOS, INGRESOS Y CATEGORIAS? Esta acción no se puede deshacer.')) {
      const ok = await deleteProject();
      if (ok) setShowSettings(false);
    }
  };

  const handleProjectLeave = async () => {
    if (window.confirm('¿Seguro quieres ABANDONAR este proyecto compartido? No verás más sus transacciones.')) {
      const ok = await leaveProject();
      if (ok) setShowSettings(false);
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LineChart },
    { path: '/incomes', label: 'Ingresos', icon: Wallet },
    { path: '/fixed-incomes', label: 'Ingresos Fijos', icon: LayoutGrid },
    { path: '/expenses', label: 'Gastos', icon: Receipt },
    { path: '/fixed-expenses', label: 'Gastos Fijos', icon: LayoutGrid },
    { path: '/categories', label: 'Categorías', icon: Tags },
  ];

  return (
    <nav className={`${collapsed ? "w-20" : "w-64"} bg-slate-900 min-h-screen p-4 text-slate-300 flex flex-col justify-between transition-all duration-300 overflow-hidden`}>
      <div>
        <div className="mb-6 p-2 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-500" />
            {!collapsed && "Mi Dinero"}
          </h2>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white"
            style={{ fontSize: "20px" }}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Project Switcher Area */}

        {!collapsed && (
          <div className="mb-8 px-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proyecto Activo</label>
              <div className="flex gap-2">
                {activeProjectObj && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`hover:text-white transition-colors ${showSettings ? 'text-blue-400' : 'text-slate-400'}`}
                    title="Configurar Proyecto"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsCreatingProject(!isCreatingProject)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Nuevo Proyecto"
                >
                  {isCreatingProject ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isCreatingProject ? (
              <form onSubmit={handleCreateProject} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nombre del proyecto..."
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                />
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 disabled:opacity-50 flex items-center justify-center"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              loadingProjects ? (
                <div className="flex items-center text-slate-400 gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>
              ) : (
                <div className="relative">
                  <select
                    value={activeProject || ''}
                    onChange={(e) => setActiveProject(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg pl-8 pr-4 py-2 appearance-none outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <FolderOpen className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              )
            )}

            {/* Settings Panel */}
            {showSettings && activeProjectObj && (
              <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
                <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Opciones
                </h3>

                {isOwner(activeProjectObj.created_by) ? (
                  <>
                    <form onSubmit={handleShare} className="mb-4">
                      <label className="text-xs text-slate-400 block mb-1">Invitar Usuario (Email o Username)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="usuario o correo"
                          className="w-full bg-slate-900 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700"
                        />
                        <button
                          type="submit"
                          disabled={!inviteEmail.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2 disabled:opacity-50"
                          title="Compartir"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                    <button
                      onClick={handleProjectDelete}
                      className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-lg transition-colors border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar Proyecto
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-400/80 leading-tight">Eres invitado en este proyecto (Creado por {activeProjectObj.created_by}).</p>
                    <button
                      onClick={handleProjectLeave}
                      className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors border border-amber-500/20"
                    >
                      <LogOut className="w-4 h-4" /> Abandonar Proyecto
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"} px-4 py-3 rounded-xl transition-all ${isActive
                  ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/20'
                  : 'hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Footer */}
      <div
        className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 group relative cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setShowLogoutConfirm(true)}
      >
        <div className="flex gap-3 overflow-hidden items-center">
          <div className="bg-slate-800 p-2 rounded-full shrink-0 group-hover:bg-slate-700 transition-colors">
            <User className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{currentUser?.username}</p>
              <p className="text-xs text-slate-500 truncate" title={currentUser?.email}>{currentUser?.email}</p>
            </div>
          )}
        </div>
        <LogOut className="w-4 h-4 text-slate-600 group-hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cerrar Sesión</h3>
                <p className="text-sm text-slate-400 mt-1">¿Estás seguro que deseas salir de la aplicación?</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg shadow-red-900/20 transition-all flex justify-center items-center gap-2"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

    </nav>
  );
}

function MainApp() {
  const { isInitializing, currentUser, pendingRegistration, loginWithGoogle, completeRegistration, logout } = useAuth();

  if (isInitializing) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (pendingRegistration) {
    return (
      <CompleteProfile
        userEmail={pendingRegistration.email}
        userName={pendingRegistration.name}
        userPicture={pendingRegistration.picture}
        onSubmit={completeRegistration}
      />
    );
  }

  if (!currentUser) {
    return (
      <Landing
        onGoogleSuccess={(res) => loginWithGoogle(res.credential)}
        onGoogleError={() => alert('Fallo inicio de sesión con Google')}
      />
    );
  }

  return (
    <Router>
      <div className="flex bg-slate-50 min-h-screen">
        <Navigation />
        <main className="flex-1 p-8 overflow-y-auto h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incomes" element={<IncomesForm />} />
            <Route path="/fixed-incomes" element={<FixedIncomesGrid />} />
            <Route path="/expenses" element={<ExpensesForm />} />
            <Route path="/fixed-expenses" element={<FixedExpensesGrid />} />
            <Route path="/categories" element={<CategoriesManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  // Client ID por default simulado si no existe en ENV
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'dummy_client_id';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
