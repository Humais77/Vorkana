// Selectors for gig slice
export const selectLastCreatedGigId = (state) => state.gigs.lastCreatedGigId;
export const selectGigs = (state) => state.gigs.gigs;
export const selectGigDetails = (state) => state.gigs.gigDetails;
export const selectGigsLoading = (state) => state.gigs.loading;
export const selectGigsError = (state) => state.gigs.error;