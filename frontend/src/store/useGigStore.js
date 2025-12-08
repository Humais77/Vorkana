import { create } from 'zustand';

export const useGigStore = create((set) => ({
  // State
  lastCreatedGigId: null,
  gigDetails: null,
  
  // Actions
  setLastCreatedGigId: (id) => set({ lastCreatedGigId: id }),
  clearLastCreatedGig: () => set({ lastCreatedGigId: null }),
  setGigDetails: (gig) => set({ gigDetails: gig }),
  clearGigDetails: () => set({ gigDetails: null }),
}));