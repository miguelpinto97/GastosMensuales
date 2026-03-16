import React, { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function CompleteProfile({ userEmail, userName, userPicture, onSubmit }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validacion basica
    if (!/^[a-zA-Z0-9]{6,20}$/.test(usernameInput)) {
        setError('Debe ser alfanumérico, entre 6 y 20 caracteres.');
        return;
    }

    setLoading(true);
    const success = await onSubmit(usernameInput);
    if (!success) {
      setError('Ese ID ya se encuentra en uso o hubo un error en el servidor.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
        
        {userPicture && (
           <img src={userPicture} alt="Profile" className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-slate-700 shadow-lg" />
        )}
        
        <h2 className="text-2xl font-bold text-white mb-2">¡Hola, {userName || 'Nuevo Usuario'}!</h2>
        <p className="text-slate-400 text-sm mb-6">
           Has iniciado sesión exitosamente con <span className="text-emerald-400 font-medium">{userEmail}</span>.
           Para terminar, elige un nombre de usuario único.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="text-left">
              <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">
                 Elegir Nombre de Usuario
              </label>
              <input 
                type="text"
                autoFocus
                placeholder="Ejemplo: migpinto99"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {error && <p className="text-red-400 text-xs mt-2 mt-1">{error}</p>}
           </div>
           
           <button 
             type="submit"
             disabled={loading || !usernameInput.trim()}
             className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
           >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Completar Registro
           </button>
        </form>
        
      </div>
    </div>
  );
}
