import { create } from 'zustand';
import type { Alert } from '@/types';

interface AlertStore {
  alerts: Alert[];
  unreadCount: number;
  addAlert: (alert: Alert) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  setAlerts: (alerts: Alert[]) => void;
  deleteAlert: (id: string) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (newAlert: any) =>
    set((state) => {
      // Best-Shot dynamic update: maintain clean display by upgrading existing alert with clearest photo & highest accuracy
      const personId = newAlert.person?.id || newAlert.personId || newAlert.person_id;
      if (personId) {
        const existingIdx = state.alerts.findIndex((a: any) => {
          const aId = a.person?.id || a.personId || a.person_id;
          return aId === personId;
        });
        if (existingIdx !== -1) {
          const existing = state.alerts[existingIdx] as any;
          const existingDist = Math.abs(Number(existing.similarityScore || existing.similarity || existing.distance || 999));
          const newDist = Math.abs(Number(newAlert.similarityScore || newAlert.similarity || newAlert.distance || 999));

          // If the new frame has stronger accuracy (smaller Euclidean distance) or is newer, upgrade the photo and score!
          const bestAlert = newDist <= existingDist ? { ...existing, ...newAlert } : existing;
          
          // Re-order to float the dynamically upgraded alert to the top without increasing unread spam
          const remainingAlerts = state.alerts.filter((_, idx) => idx !== existingIdx);
          return { alerts: [bestAlert, ...remainingAlerts], unreadCount: state.unreadCount };
        }
      }
      return {
        alerts: [newAlert, ...state.alerts],
        unreadCount: state.unreadCount + 1,
      };
    }),
  markRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a } : a)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  clearAll: () => set({ alerts: [], unreadCount: 0 }),
  setAlerts: (alerts) => set({ alerts }),
  deleteAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}));
