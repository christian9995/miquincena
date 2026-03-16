'use client';

import { useState, useEffect } from 'react';
import { Menu, X, LogOut, Cloud, AlertCircle, Wifi, CheckCircle } from 'lucide-react';
import { useGoogleAuth } from '@/context/GoogleAuthContext';
import GoogleSignIn from './GoogleSignIn';

interface HeaderProps {
  onConfigClick?: () => void;
}

export default function Header({ onConfigClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'about' | 'guide' | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const { isAuthenticated, user, isSyncing, syncStatus, isOnline, signOut } = useGoogleAuth();

  // Show success notification when first synced
  useEffect(() => {
    if (isAuthenticated && syncStatus === 'synced' && !showSuccessNotification) {
      setShowSuccessNotification(true);
      const timer = setTimeout(() => setShowSuccessNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, syncStatus, showSuccessNotification]);

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="bg-green-50 border-b border-green-200 px-4 md:px-8 py-3 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle size={18} />
          <span>Conectado a Google Drive - Datos protegidos</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Mi Quincena</h1>
          
          <div className="flex items-center gap-3">
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
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-4">
              {/* Google Auth Section */}
              {isAuthenticated && user ? (
                <div className="pb-4 border-b border-gray-200 space-y-3">
                  {/* User Profile */}
                  <div className="flex items-center gap-3 px-2">
                    {user.picture && (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                        title={user.email}
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Conectado como</p>
                      <p className="text-sm text-gray-600">{user.name}</p>
                    </div>
                  </div>

                  {/* Sync Status Indicator */}
                  <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg mx-2">
                    {syncStatus === 'synced' && (
                      <>
                        <Cloud size={16} className="text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700 font-medium">Sincronizado</span>
                      </>
                    )}
                    {syncStatus === 'pending' && (
                      <>
                        <Cloud size={16} className="text-yellow-600 animate-pulse flex-shrink-0" />
                        <span className="text-sm text-yellow-700 font-medium">Pendiente de subir</span>
                      </>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                        <span className="text-sm text-red-700 font-medium">Error de conexión</span>
                      </>
                    )}
                    {syncStatus === 'offline' && (
                      <>
                        <Wifi size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 font-medium">Sin conexión</span>
                      </>
                    )}
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      signOut();
                      handleMenuClose();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-lg font-medium text-red-600 transition-colors"
                  >
                    <LogOut size={18} />
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <div className="pb-4 border-b border-gray-200">
                  <GoogleSignIn />
                </div>
              )}

              {/* Menu Items */}
              <button
                onClick={() => {
                  setActiveSection('about');
                  handleMenuClose();
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-lg font-medium text-gray-700 transition-colors"
              >
                Acerca de
              </button>
              <button
                onClick={() => {
                  setActiveSection('guide');
                  handleMenuClose();
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
