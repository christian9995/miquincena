'use client';

import { useState } from 'react';
import { Menu, X, LogOut, Cloud, AlertCircle, Wifi } from 'lucide-react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import GoogleSignIn from './GoogleSignIn';

interface HeaderProps {
  onConfigClick?: () => void;
}

export default function Header({ onConfigClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'guide' | null>(null);
  const { isAuthenticated, user, isSyncing, syncStatus, isOnline, signOut } = useGoogleAuth();

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mi Quincena</h1>
          
          <div className="flex items-center gap-3">
            {/* Sync Status and Google Sign-In */}
            <div className="flex items-center gap-2">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  {/* Profile Picture */}
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                      title={user.email}
                    />
                  )}
                  
                  {/* Sync Status Indicator */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
                    {syncStatus === 'synced' && (
                      <>
                        <Cloud size={16} className="text-green-600" />
                        <span className="text-xs text-gray-600">Sincronizado</span>
                      </>
                    )}
                    {syncStatus === 'pending' && (
                      <>
                        <Cloud size={16} className="text-yellow-600 animate-pulse" />
                        <span className="text-xs text-gray-600">Pendiente de subir</span>
                      </>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs text-gray-600">Error de conexión</span>
                      </>
                    )}
                    {syncStatus === 'offline' && (
                      <>
                        <Wifi size={16} className="text-gray-400" />
                        <span className="text-xs text-gray-600">Sin conexión</span>
                      </>
                    )}
                  </div>
                  
                  {/* Sign Out Button */}
                  <button
                    onClick={() => signOut()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut size={18} className="text-gray-600" />
                  </button>
                </div>
              ) : (
                <GoogleSignIn />
              )}
            </div>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X size={24} className="text-gray-800" />
              ) : (
                <Menu size={24} className="text-gray-800" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-2">
              <button
                onClick={() => {
                  setActiveSection('about');
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg font-medium text-gray-700 transition-colors"
              >
                Acerca de
              </button>
              <button
                onClick={() => {
                  setActiveSection('guide');
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg font-medium text-gray-700 transition-colors"
              >
                Guía Rápida
              </button>
            </div>
          </div>
        )}
      </header>

      {/* About Modal */}
      {activeSection === 'about' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-600 p-6 text-white text-center flex-shrink-0">
              <h2 className="text-2xl font-bold">Acerca de</h2>
              <p className="text-white/80 text-sm mt-1">Tu dinero bajo control, quincena tras quincena</p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Nuestro Propósito */}
              <div>
                <h3 className="text-lg font-bold text-blue-600 mb-2">Nuestro propósito</h3>
                <p className="text-gray-700 leading-relaxed">
                  Tu dinero bajo control, quincena tras quincena.
                </p>
              </div>

              {/* ¿Qué hacemos? */}
              <div>
                <h3 className="text-lg font-bold text-blue-600 mb-2">¿Qué hacemos?</h3>
                <p className="text-gray-700 leading-relaxed">
                  Toma el control total de tu sueldo. Con miquincena.com, sabrás exactamente cuánto ganas, cuánto gastas y, lo más importante, a dónde se va cada centavo. Deja de adivinar y empieza a decidir qué hacer con tu dinero.
                </p>
              </div>

              {/* ¿Qué somos? */}
              <div>
                <h3 className="text-lg font-bold text-blue-600 mb-2">¿Qué somos?</h3>
                <p className="text-gray-700 leading-relaxed">
                  El mapa de tu dinero, quincena a quincena. Es una herramienta sencilla diseñada para darte claridad inmediata sobre cuánto ganas, cuánto gastas y a dónde se va tu dinero.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="px-6 md:px-8 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Guide Modal */}
      {activeSection === 'guide' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-green-700 p-6 text-white text-center flex-shrink-0">
              <h2 className="text-2xl font-bold">Guía Rápida</h2>
              <p className="text-white/80 text-sm mt-1">Empieza en 3 pasos simples</p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <span className="text-green-700 font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Configura tu ciclo</h3>
                  <p className="text-gray-700 text-sm">Elige tu fecha de pago en 'Config. Ciclo'.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <span className="text-green-700 font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Define tu presupuesto</h3>
                  <p className="text-gray-700 text-sm">Proyecta tus metas en 'Definir Presupuesto'.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <span className="text-green-700 font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Registra y controla</h3>
                  <p className="text-gray-700 text-sm">Usa el formulario principal para anotar cada movimiento diario.</p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="px-6 md:px-8 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-6 py-2 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
