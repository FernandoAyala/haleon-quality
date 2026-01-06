import { Clock, MessageSquare, Trash2, X } from 'lucide-react';
import React from 'react';
import { ChatSession } from '../types';

interface SessionHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  currentSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onDeleteSession,
  onNewSession
}) => {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return `Hace ${days} días`;
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Historial de Sesiones</h2>
            <p className="text-sm text-slate-500 mt-1">{sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} guardada{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No hay sesiones guardadas</p>
              <p className="text-sm text-slate-400 mt-2">Comienza una nueva conversación para crear una sesión</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`
                  group relative p-4 rounded-xl border transition-all cursor-pointer
                  ${session.id === currentSessionId
                    ? 'border-[#a3d900] bg-[#a3d900]/5 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
                  }
                `}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800 truncate pr-2">
                      {session.title}
                    </h3>
                    <div className="flex items-center space-x-3 mt-2 text-sm text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{session.transcripts.length} mensaje{session.transcripts.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('¿Eliminar esta sesión?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar sesión"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                
                {session.id === currentSessionId && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a3d900] rounded-l-xl" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-3 px-4 bg-[#a3d900] hover:bg-[#95c600] text-slate-900 font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Nueva Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
