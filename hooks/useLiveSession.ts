import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionStatus, TranscriptItem } from '../types';

const SYSTEM_PROMPT = `Actúa como un Gerente de Calidad Operacional Senior con 20 años de experiencia en la industria farmacéutica y de salud del consumidor. Tu misión es liderar la calidad en una planta de Haleon, transformando la salud cotidiana mediante la innovación y la agilidad. Eres el responsable de que marcas como Sensodyne, Centrum, Alikal y Corega lleguen al consumidor de forma segura, rápida y eficiente.

PILARES DE GESTIÓN:

1. Calidad en Tiempo Real
   - No esperas al final del proceso; gestionas desviaciones e incidentes en el momento
   - Lideras investigaciones de causa raíz que no solo busquen culpables, sino soluciones de mejora continua
   - Anticipas riesgos antes de que afecten al negocio

2. Liberación Ágil y Segura
   - Tu prioridad es la liberación conforme de productos
   - Optimizas los tiempos para que el flujo de manufactura y empaque nunca se detenga innecesariamente
   - Balanceas velocidad con cumplimiento GMP

3. Validación Inteligente
   - Lideras el Plan Maestro de Validación con un enfoque de impacto controlado
   - No validas por burocracia, sino para garantizar la estabilidad y la ciencia de vanguardia
   - Eliminas procesos que no agregan valor real

4. Cultura de Impacto
   - Fomentas la integridad de datos y la excelencia operacional
   - Ayudas al equipo a asumir el control de su impacto
   - Promueves una mentalidad de 'calidad proactiva' sobre 'cumplimiento pasivo'

MENTALIDAD DE CAMBIO:

De Farma a Consumer Health:
- La rigurosidad científica debe convivir con la velocidad del consumo masivo
- Eliminas procesos burocráticos que no agregan valor
- Mantienes estándares sin comprometer la agilidad

Liderazgo Transversal:
- Eres colaborador estratégico para Producción y Logística
- Tu éxito se mide por métricas de desempeño (Lead y Lag)
- Trabajas en equipo para resolver problemas sistémicos

TONO DE RESPUESTA:

Líder y Mentor:
- Inspiras confianza y autoridad técnica
- Compartes conocimiento para desarrollar al equipo
- Tu lenguaje es claro y accesible sin perder profesionalismo

Pragmático:
- Siempre enfocado en 'cómo hacer el trabajo más fácil'
- Mantienes cumplimiento GMP y corporativo sin burocracia innecesaria
- Propones soluciones concretas y accionables

Innovador:
- Constantemente sugieres formas de simplificar documentación
- Optimizas flujos de trabajo con tecnología y mejores prácticas
- Desafías el status quo cuando es necesario

UBICACIÓN: Planta de Manufactura - Buenos Aires, Argentina

Responde con la experiencia de 20 años en la industria, pero mantén un tono accesible que inspire a la acción y a la mejora continua.`;

interface LiveSessionHook {
  status: ConnectionStatus;
  volume: number;
  transcripts: TranscriptItem[];
  isMuted: boolean;
  isMicActive: boolean;
  connect: () => void;
  disconnect: () => void;
  toggleMute: () => void;
  toggleMic: () => void;
  sendTextMessage: (text: string) => void;
}

export const useLiveSession = (): LiveSessionHook => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMutedRef = useRef<boolean>(false);
  const isMicActiveRef = useRef<boolean>(false);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setVolume(Math.min(1, average / 128));
    
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
      if (!apiKey) {
        throw new Error('OpenAI API key no configurada');
      }

      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Configurar análisis de audio para visualización
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      source.connect(analyser);
      
      // Crear procesador de audio para enviar datos al WebSocket
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Conectar a OpenAI Realtime API
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        ['realtime', `openai-insecure-api-key.${apiKey}`, 'openai-beta.realtime-v1']
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Conectado a OpenAI Realtime API');
        
        // Configurar sesión
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: SYSTEM_PROMPT,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));

        setStatus(ConnectionStatus.CONNECTED);
        updateVolume();
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'conversation.item.input_audio_transcription.completed':
            // Transcripción del usuario completada
            if (message.transcript) {
              setTranscripts(prev => [...prev, {
                id: `user-${Date.now()}`,
                role: 'user',
                text: message.transcript,
                timestamp: new Date()
              }]);
            }
            break;
            
          case 'response.audio_transcript.delta':
            // Delta de transcripción de la respuesta del asistente
            if (message.delta) {
              setTranscripts(prev => {
                const lastTranscript = prev[prev.length - 1];
                if (lastTranscript && lastTranscript.role === 'model' && 
                    lastTranscript.id.startsWith('model-temp')) {
                  // Actualizar transcripción existente
                  return [
                    ...prev.slice(0, -1),
                    { ...lastTranscript, text: lastTranscript.text + message.delta }
                  ];
                } else {
                  // Crear nueva transcripción
                  return [...prev, {
                    id: 'model-temp-' + Date.now(),
                    role: 'model',
                    text: message.delta,
                    timestamp: new Date()
                  }];
                }
              });
            }
            break;

          case 'response.audio_transcript.done':
            // Transcripción completa
            if (message.transcript) {
              setTranscripts(prev => {
                const filtered = prev.filter(t => !t.id.startsWith('model-temp'));
                return [...filtered, {
                  id: `model-${Date.now()}`,
                  role: 'model',
                  text: message.transcript,
                  timestamp: new Date()
                }];
              });
              
              // Reproducir con síntesis de voz si no está muteado (usar ref para valor actual)
              if (!isMutedRef.current) {
                speakText(message.transcript);
              }
            }
            break;

          case 'response.audio.delta':
            // Reproducir audio (si se desea implementar)
            break;

          case 'error':
            console.error('Error de OpenAI:', message);
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus(ConnectionStatus.ERROR);
      };

      ws.onclose = () => {
        console.log('Desconectado de OpenAI Realtime API');
        setStatus(ConnectionStatus.DISCONNECTED);
      };

      // Enviar audio al WebSocket
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && isMicActiveRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Convertir a base64
          const base64Audio = btoa(
            Array.from(new Uint8Array(pcmData.buffer))
              .map(b => String.fromCharCode(b))
              .join('')
          );
          
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      };

    } catch (error) {
      console.error('Error al conectar:', error);
      setStatus(ConnectionStatus.ERROR);
      
      // Limpiar recursos
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [updateVolume]);

  const disconnect = useCallback(() => {
    // Detener animación de volumen
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Cerrar WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Detener micrófono
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Cerrar AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Limpiar referencias
    analyserRef.current = null;
    processorRef.current = null;
    
    setVolume(0);
    setIsMicActive(false);
    isMicActiveRef.current = false;
    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  // Función para síntesis de voz
  const speakText = useCallback((text: string) => {
    // Cancelar cualquier síntesis anterior
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Intentar usar una voz en español si está disponible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }
    
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      isMutedRef.current = newMuted;
      if (newMuted) {
        // Cancelar cualquier síntesis en curso
        window.speechSynthesis.cancel();
      }
      return newMuted;
    });
  }, []);

  // Enviar mensaje de texto
  const sendTextMessage = useCallback((text: string) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Agregar mensaje del usuario a los transcripts
    setTranscripts(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date()
    }]);

    // Enviar mensaje al WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text.trim()
        }]
      }
    }));

    // Solicitar respuesta
    wsRef.current.send(JSON.stringify({
      type: 'response.create'
    }));
  }, []);

  // Toggle micrófono
  const toggleMic = useCallback(() => {
    if (status !== ConnectionStatus.CONNECTED) {
      return;
    }
    
    setIsMicActive(prev => {
      const newActive = !prev;
      isMicActiveRef.current = newActive;
      return newActive;
    });
  }, [status]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnect();
      window.speechSynthesis.cancel();
    };
  }, [disconnect]);

  return {
    status,
    volume,
    transcripts,
    isMuted,
    isMicActive,
    connect,
    disconnect,
    toggleMute,
    toggleMic,
    sendTextMessage
  };
};
