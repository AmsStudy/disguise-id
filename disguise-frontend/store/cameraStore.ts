import { create } from 'zustand';
import type { Camera } from '@/types';

interface CameraStore {
  cameras: Camera[];
  selectedCameraId: string | null;
  setCameras: (cameras: Camera[]) => void;
  updateStatus: (data: { camera_id: string; status: 'online' | 'offline' | 'maintenance' }) => void;
  selectCamera: (id: string | null) => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  cameras: [],
  selectedCameraId: null,
  setCameras: (cameras) => set({ cameras }),
  updateStatus: (data) =>
    set((state) => ({
      cameras: state.cameras.map((c) =>
        c.id === data.camera_id ? { ...c, status: data.status } : c
      ),
    })),
  selectCamera: (id) => set({ selectedCameraId: id }),
}));
