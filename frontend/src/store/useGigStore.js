import { create } from 'zustand';

export const useGigStore = create((set) => ({
  lastCreatedGigId: null,
  gigDetails: null,
  
  setLastCreatedGigId: (id) => set({ lastCreatedGigId: id }),
  clearLastCreatedGig: () => set({ lastCreatedGigId: null }),
  setGigDetails: (gig) => set({ gigDetails: gig }),
  clearGigDetails: () => set({ gigDetails: null }),
}));