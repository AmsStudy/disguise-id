import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useAlertStore } from '@/store/alertStore';
import { useCameraStore } from '@/store/cameraStore';
import type { Alert, LiveDetection } from '@/types';

let socket: Socket | null = null;
const liveDetectionCallbacks = new Map<string, (data: LiveDetection) => void>();

export const getSocket = (): Socket | null => socket;

export const connectSocket = () => {
  const token = useAuthStore.getState().token;
  if (!token || socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
    auth: { token },
    query: { token },
    path: '/socket',
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('alert:new', (data: Alert) => {
    useAlertStore.getState().addAlert(data);
  });

  socket.on('alert:updated', (data: { alert_id: string; status: string }) => {
    console.log('[Socket] Alert updated:', data);
  });

  socket.on('camera:status', (data: { camera_id: string; status: 'online' | 'offline' | 'error' | 'credentials_required' | 'maintenance' }) => {
    useCameraStore.getState().updateStatus(data);
  });

  socket.on('detection:live', (data: LiveDetection) => {
    const cb = liveDetectionCallbacks.get(data.cameraId);
    if (cb) cb(data);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    liveDetectionCallbacks.clear();
  }
};

export const subscribeCamera = (cameraId: string, callback: (data: LiveDetection) => void) => {
  if (!socket) return;
  liveDetectionCallbacks.set(cameraId, callback);
  socket.emit('subscribe:camera', { camera_id: cameraId });
};

export const unsubscribeCamera = (cameraId: string) => {
  if (!socket) return;
  liveDetectionCallbacks.delete(cameraId);
  socket.emit('unsubscribe:camera', { camera_id: cameraId });
};
