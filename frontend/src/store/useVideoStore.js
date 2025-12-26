// store/useVideoStore.js
import { create } from 'zustand';

const useVideoStore = create((set) => ({
  isVideoPaused: false,
  pauseVideo: () => set({ isVideoPaused: true }),
  playVideo: () => set({ isVideoPaused: false }),
}));

export default useVideoStore;