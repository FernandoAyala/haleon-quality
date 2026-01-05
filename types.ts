export interface AudioState {
  isPlaying: boolean;
  volume: number; // 0 to 1
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}