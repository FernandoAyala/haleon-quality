import {
    Activity,
    Bot,
    Box,
    Mic,
    MicOff,
    ShieldCheck,
    User,
    Volume2,
    VolumeX,
    Zap
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { useLiveSession } from './hooks';
import { ConnectionStatus } from './types';

// Función para parsear texto con markdown (negritas)
const parseMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*/g;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Agregar texto antes del match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Agregar texto en negrita
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  // Agregar texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

// Componente para formatear texto con listas y markdown
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  // Detectar si el texto contiene listas numeradas o con viñetas
  const hasListItems = /^\d+\.|^[-•*]|^\s*[-•*]\s/m.test(text);
  
  if (!hasListItems) {
    return <>{parseMarkdown(text)}</>;
  }

  // Dividir el texto en líneas y procesar
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph = '';

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Detectar si es un ítem de lista
    const isListItem = /^(\d+\.|-|•|\*)\s/.test(trimmedLine);
    
    if (isListItem) {
      // Si hay un párrafo pendiente, agregarlo antes
      if (currentParagraph) {
        elements.push(
          <div key={`p-${index}`} className="mb-3">
            {parseMarkdown(currentParagraph)}
          </div>
        );
        currentParagraph = '';
      }
      
      // Agregar el ítem de lista con espaciado y markdown
      elements.push(
        <div key={`li-${index}`} className="mb-2 pl-1">
          {parseMarkdown(trimmedLine)}
        </div>
      );
    } else if (trimmedLine) {
      // Es texto normal, agregarlo al párrafo actual
      currentParagraph += (currentParagraph ? ' ' : '') + trimmedLine;
    } else if (currentParagraph) {
      // Línea vacía, cerrar párrafo
      elements.push(
        <div key={`p-${index}`} className="mb-3">
          {parseMarkdown(currentParagraph)}
        </div>
      );
      currentParagraph = '';
    }
  });

  // Agregar cualquier párrafo pendiente
  if (currentParagraph) {
    elements.push(
      <div key="p-last" className="mb-0">
        {parseMarkdown(currentParagraph)}
      </div>
    );
  }

  return <>{elements}</>;
};

const App: React.FC = () => {
  const { status, volume, transcripts, isMuted, connect, disconnect, toggleMute } = useLiveSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleToggle = () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isError = status === ConnectionStatus.ERROR;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Context & Role */}
      <aside className="w-80 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="bg-[#a3d900] p-1.5 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-slate-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Haleon Quality</h1>
          </div>
          <p className="text-xs text-slate-400 mt-2">Operational Quality Management</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-xs uppercase text-slate-500 font-semibold mb-4">Misión Actual</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-2 mb-2 text-[#a3d900]">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-semibold">Liberación Ágil</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Optimizar tiempos de liberación para mantener el flujo de manufactura sin detener la calidad.
                </p>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-2 mb-2 text-[#a3d900]">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-semibold">Calidad Real-Time</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Gestión inmediata de desviaciones e incidentes. Análisis de causa raíz enfocado en mejora.
                </p>
              </div>
            </div>
          </div>

          <div>
             <h3 className="text-xs uppercase text-slate-500 font-semibold mb-4">Marcas Activas</h3>
             <div className="flex flex-wrap gap-2">
                {['Sensodyne', 'Centrum', 'Advil', 'Corega'].map(brand => (
                  <span key={brand} className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300 border border-slate-700">
                    {brand}
                  </span>
                ))}
             </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center">
          v2.5.0 • OpenAI Realtime API
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Asistente de Calidad Operacional
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
              isConnected ? 'bg-green-100 text-green-700 border-green-200' :
              isError ? 'bg-red-100 text-red-700 border-red-200' :
              'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {status === 'connected' ? 'En línea' : 
               status === 'connecting' ? 'Conectando...' : 
               status === 'error' ? 'Error' : 'Desconectado'}
            </span>
          </div>
          <div className="text-sm text-slate-500">
             Planta de Manufactura: <span className="font-medium text-slate-700">Buenos Aires</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scrollbar-hide">
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
               <Box className="w-16 h-16 mb-4 stroke-1" />
               <p className="text-lg">Inicia la sesión para comenzar el mentoreo</p>
               <p className="text-sm mt-2">Discute validaciones, desviaciones o mejoras de proceso</p>
            </div>
          ) : (
            transcripts.map((t) => (
              <div key={t.id} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] md:max-w-[70%] ${t.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-[#a3d900] text-slate-900'
                  }`}>
                    {t.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    t.role === 'user' 
                      ? 'bg-white text-slate-700 rounded-tr-none border border-slate-200' 
                      : 'bg-white text-slate-800 rounded-tl-none border border-[#a3d900]/30 shadow-[#a3d900]/10'
                  }`}>
                    <FormattedText text={t.text} />
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Control Footer */}
        <div className="h-32 bg-white border-t border-slate-200 flex items-center px-6 md:px-12 justify-center relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            
            {/* Visualizer Background (centered absolute) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                 <div className="w-1/2">
                   <AudioVisualizer isActive={isConnected} volume={volume} color="#a3d900" />
                 </div>
            </div>

            {/* Main Action Button and Mute Button */}
            <div className="relative z-10 flex items-center space-x-4">
              <button
                onClick={handleToggle}
                disabled={isConnecting}
                className={`
                  flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-300
                  ${isConnected 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-[#a3d900] hover:bg-[#95c600] text-slate-900'
                  }
                  ${isConnecting ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95'}
                `}
              >
                {isConnecting ? (
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : isConnected ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>

              {/* Mute Button */}
              <button
                onClick={toggleMute}
                disabled={!isConnected}
                className={`
                  flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all duration-300
                  ${isMuted 
                    ? 'bg-slate-400 hover:bg-slate-500 text-white' 
                    : 'bg-slate-700 hover:bg-slate-800 text-white'
                  }
                  ${!isConnected ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                `}
                title={isMuted ? 'Activar voz' : 'Silenciar voz'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Status Text below button */}
            <div className="absolute bottom-4 left-0 w-full text-center text-xs font-medium text-slate-400 uppercase tracking-wider pointer-events-none">
              {isConnected ? 'Escuchando...' : 'Presiona para hablar'}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;