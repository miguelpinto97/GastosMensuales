import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck, Users, Wallet, TrendingUp } from 'lucide-react';

export default function Landing({ onGoogleSuccess, onGoogleError }) {
   return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">

         {/* Hero Section */}
         <div className="max-w-4xl w-full flex flex-col lg:flex-row items-center gap-12 text-slate-200">

            <div className="flex-1 space-y-8 text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  App de Gastos v2.0
               </div>

               <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight">
                  Toma el control de tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Presupuesto</span>
               </h1>

               <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
                  Administra múltiples proyectos de gastos, compartelos con tus familiares y amigos, y mantén tu dinero controlado en tiempo real.
               </p>

               <div className="flex flex-col items-center lg:items-start gap-4 pt-4">
                  {/* Google Login Wrapper */}
                  <div className="p-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl inline-block">
                     <GoogleLogin
                        onSuccess={onGoogleSuccess}
                        onError={onGoogleError}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        text="continue_with"
                     />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" /> Autenticación Segura Oauth 2.0
                  </p>
               </div>
            </div>

            {/* Right side Visual */}
            <div className="flex-1 w-full max-w-md">
               <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>

                  <div className="space-y-6 relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                           <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-white font-medium text-lg">Finanzas Claras</h3>
                           <p className="text-slate-400 text-sm">Registro de ingresos y gastos.</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                           <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-white font-medium text-lg">Métricas al Vuelo</h3>
                           <p className="text-slate-400 text-sm">Visualiza hacia dónde va el dinero.</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                           <Users className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-white font-medium text-lg">Multi-Usuario</h3>
                           <p className="text-slate-400 text-sm">Comparte libros contables temporalmente.</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

         </div>

      </div>
   );
}
