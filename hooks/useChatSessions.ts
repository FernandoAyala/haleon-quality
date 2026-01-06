import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { ChatSession, TranscriptItem } from '../types';

const MAX_SESSIONS = 50; // Máximo de sesiones a guardar

// Generar ID único de usuario (anónimo)
const getUserId = (): string => {
  let userId = localStorage.getItem('haleon_user_id');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('haleon_user_id', userId);
  }
  return userId;
};

interface UseChatSessionsResult {
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => Promise<string>;
  loadSession: (sessionId: string) => ChatSession | null;
  saveCurrentSession: (transcripts: TranscriptItem[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
  isLoading: boolean;
}

export const useChatSessions = (): UseChatSessionsResult => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userId = getUserId();
  const sessionsRef = useRef<ChatSession[]>([]);

  // Mantener sessionsRef actualizado
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Cargar sesiones de Firebase al inicio
  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      const q = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(MAX_SESSIONS));
      const querySnapshot = await getDocs(q);
      
      const loadedSessions: ChatSession[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedSessions.push({
          id: doc.id,
          title: data.title,
          transcripts: data.transcripts.map((t: any) => ({
            ...t,
            timestamp: t.timestamp.toDate()
          })),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        });
      });
      
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Error al cargar sesiones de Firebase:', error);
      // Fallback a localStorage si Firebase falla
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fallback: cargar desde localStorage
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem('haleon_chat_sessions');
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[];
        const sessionsWithDates = parsed.map(session => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          transcripts: session.transcripts.map(t => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }))
        }));
        setSessions(sessionsWithDates);
      }
    } catch (error) {
      console.error('Error al cargar desde localStorage:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo cargar al montar el componente

  // Crear nueva sesión en Firebase
  const createNewSession = useCallback(async (): Promise<string> => {
    const now = new Date();
    const newSession: Omit<ChatSession, 'id'> = {
      title: `Sesión ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      transcripts: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        ...newSession,
        createdAt: Timestamp.fromDate(newSession.createdAt),
        updatedAt: Timestamp.fromDate(newSession.updatedAt)
      });

      console.log('✅ Sesión creada:', docRef.id);

      const sessionWithId: ChatSession = {
        ...newSession,
        id: docRef.id
      };

      setSessions(prev => [sessionWithId, ...prev].slice(0, MAX_SESSIONS));
      setCurrentSessionId(docRef.id);
      
      // Backup en localStorage
      localStorage.setItem('haleon_chat_sessions', JSON.stringify([sessionWithId, ...sessions].slice(0, MAX_SESSIONS)));
      
      return docRef.id;
    } catch (error) {
      console.error('Error al crear sesión en Firebase:', error);
      // Fallback a ID local
      const localId = `session-${now.getTime()}`;
      const sessionWithId: ChatSession = { ...newSession, id: localId };
      setSessions(prev => [sessionWithId, ...prev].slice(0, MAX_SESSIONS));
      setCurrentSessionId(localId);
      localStorage.setItem('haleon_chat_sessions', JSON.stringify([sessionWithId, ...sessions].slice(0, MAX_SESSIONS)));
      return localId;
    }
  }, [userId, sessions]);

  // Cargar sesión existente
  const loadSession = useCallback((sessionId: string): ChatSession | null => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      return session;
    }
    return null;
  }, [sessions]);

  // Guardar sesión actual en Firebase
  const saveCurrentSession = useCallback(async (transcripts: TranscriptItem[]) => {
    if (!currentSessionId) return;

    const session = sessionsRef.current.find(s => s.id === currentSessionId);
    if (!session) return;

    // Generar título basado en el primer mensaje del usuario
    let title = session.title;
    if (transcripts.length > 0 && session.transcripts.length === 0) {
      const firstUserMessage = transcripts.find(t => t.role === 'user');
      if (firstUserMessage) {
        title = firstUserMessage.text.substring(0, 50) + (firstUserMessage.text.length > 50 ? '...' : '');
      }
    }

    const updatedSession: ChatSession = {
      ...session,
      title,
      transcripts,
      updatedAt: new Date()
    };

    try {
      const sessionRef = doc(db, 'users', userId, 'sessions', currentSessionId);
      await updateDoc(sessionRef, {
        title: updatedSession.title,
        transcripts: updatedSession.transcripts.map(t => ({
          ...t,
          timestamp: Timestamp.fromDate(t.timestamp)
        })),
        updatedAt: Timestamp.fromDate(updatedSession.updatedAt)
      });

      console.log('✅ Guardado:', transcripts.length, 'mensajes');

      const updatedSessions = sessionsRef.current.map(s => 
        s.id === currentSessionId ? updatedSession : s
      );
      setSessions(updatedSessions);
      
      // Backup en localStorage
      localStorage.setItem('haleon_chat_sessions', JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error al guardar sesión en Firebase:', error);
      // Fallback a localStorage
      const updatedSessions = sessionsRef.current.map(s => 
        s.id === currentSessionId ? updatedSession : s
      );
      setSessions(updatedSessions);
      localStorage.setItem('haleon_chat_sessions', JSON.stringify(updatedSessions));
    }
  }, [currentSessionId, userId]);

  // Eliminar sesión de Firebase
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
      await deleteDoc(sessionRef);

      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      
      // Actualizar localStorage
      localStorage.setItem('haleon_chat_sessions', JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error al eliminar sesión de Firebase:', error);
      // Fallback a localStorage
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      localStorage.setItem('haleon_chat_sessions', JSON.stringify(updatedSessions));
    }
  }, [sessions, currentSessionId, userId]);

  // Limpiar todas las sesiones
  const clearAllSessions = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      sessions.forEach(session => {
        const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
        batch.delete(sessionRef);
      });
      await batch.commit();
      
      setSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem('haleon_chat_sessions');
    } catch (error) {
      console.error('Error al limpiar sesiones de Firebase:', error);
      setSessions([]);
      setCurrentSessionId(null);
      localStorage.removeItem('haleon_chat_sessions');
    }
  }, [sessions, userId]);

  return {
    sessions,
    currentSessionId,
    createNewSession,
    loadSession,
    saveCurrentSession,
    deleteSession,
    clearAllSessions,
    isLoading
  };
};
