'use client';

import { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface EmergencyRecoveryProps {
  onRecover: () => Promise<number>;
}

export default function EmergencyRecovery({ onRecover }: EmergencyRecoveryProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRecover = async () => {
    setIsRecovering(true);
    setMessage(null);
    try {
      const count = await onRecover();
      setMessage(`${count} transacciones recuperadas.`);
    } catch {
      setMessage('No fue posible recuperar los datos. Verifica tu conexión e inicia sesión en Google Drive.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <p className="mb-2 text-xs text-gray-500">Recuperación avanzada</p>
      <button type="button" onClick={handleRecover} disabled={isRecovering} className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60">
        {isRecovering ? <RotateCcw size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
        {isRecovering ? 'Recuperando...' : 'Forzar Recuperación de Drive'}
      </button>
      {message && <p role="status" className="mt-2 text-xs text-gray-600">{message}</p>}
    </div>
  );
}
