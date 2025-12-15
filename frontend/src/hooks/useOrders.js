import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI } from '../api/orders';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext'; 

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isSecure, runSecurityChecks } = useSecurity();
  
  return useMutation({
    mutationFn: async (orderData) => {
      if (!isSecure) {
        const secure = await runSecurityChecks();
        if (!secure) {
          throw new Error('Security checks failed');
        }
      }
      
      const result = await ordersAPI.create(orderData);
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries(['orders']);
        toast.success('Order created securely!');
        
        navigate(`/orders/${data.order?._id || data.order?.orderNumber}`);
      }
    },
    onError: (error) => {
      if (error.message.includes('ORDER_CREATION_LIMIT')) {
        toast.error('Order limit reached. Please try again later.');
      } else if (error.message.includes('SECURITY_CHECK')) {
        toast.error('Security verification failed. Please try again.');
      } else {
        toast.error(error.message || 'Failed to create order');
      }
    },
  });
};

const handleOrderError = (error) => {
  const errorMessages = {
    'ORDER_ACCESS_DENIED': 'You do not have permission to access this order',
    'INVALID_STATUS_TRANSITION': 'This status change is not allowed',
    'ORDER_NOT_MODIFIABLE': 'Order cannot be modified at this stage',
    'SECURITY_CHECK': 'Security verification required',
  };
  
  const message = Object.entries(errorMessages).find(([key]) => 
    error.message.includes(key)
  )?.[1] || error.message || 'An error occurred';
  
  toast.error(message);
};

export const useOrders = (filters = {}) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersAPI.getAll(filters),
    refetchOnWindowFocus: false,
    enabled: useSecurity().isSecure,
    onError: (error) => {
      toast.error(error.message || 'Failed to load orders');
    },
  });
};

export const useOrder = (id) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getById(id),
    enabled: !!id,
    retry: false,
    onError: (error) => {
      toast.error(error.message || 'Failed to load order');
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { isSecure } = useSecurity();
  
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      if (!isSecure) {
        throw new Error('Security check required');
      }
      
      return ordersAPI.updateStatus(id, data);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['order', variables.id]);
        queryClient.invalidateQueries(['orders']);
        toast.success('Order status updated securely!');
      }
    },
    onError: (error) => {
      handleOrderError(error);
    },
  });
};

export const useAddDeliverables = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data, files = null }) => {
      return ordersAPI.addDeliverables(id, data, files);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['order', variables.id]);
        toast.success('Deliverables submitted!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit deliverables');
    },
  });
};

export const useAcceptDelivery = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      return ordersAPI.acceptDelivery(id);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['order', variables]);
        queryClient.invalidateQueries(['orders']);
        toast.success('Delivery accepted!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to accept delivery');
    },
  });
};

export const useRequestRevision = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      return ordersAPI.requestRevision(id, data);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries(['order', variables.id]);
        queryClient.invalidateQueries(['orders']);
        toast.success('Revision requested!');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to request revision');
    },
  });
};

export const useOrderStats = () => {
  return useQuery({
    queryKey: ['orderStats'],
    queryFn: () => ordersAPI.getStats(),
    refetchOnWindowFocus: false,
  });
};