import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gigsAPI } from '../api/gigs';
import { useGigStore } from '../store/useGigStore';

export const useGigs = () => {
  return useQuery({
    queryKey: ['gigs'],
    queryFn: gigsAPI.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const usePopularGigs = () => {
  return useQuery({
    queryKey: ['gigs', 'popular'],
    queryFn: gigsAPI.getPopular,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGig = (id) => {
  const setGigDetails = useGigStore((state) => state.setGigDetails);
  
  return useQuery({
    queryKey: ['gigs', id],
    queryFn: () => gigsAPI.getById(id),
    enabled: !!id,
    onSuccess: (data) => {
      setGigDetails(data);
    },
  });
};

export const useCreateGig = () => {
  const queryClient = useQueryClient();
  const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  
  return useMutation({
    mutationFn: gigsAPI.create,
    onSuccess: (data) => {
      // Invalidate and refetch gigs
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
      // Set last created gig ID
      if (data._id) {
        setLastCreatedGigId(data._id);
      }
    },
    onError: (error) => {
      console.error('Gig creation error:', error);
    },
  });
};