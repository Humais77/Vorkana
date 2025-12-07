import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { syncFromLocalStorage } from "../redux/slices/authSlice";

export const useAuthSync = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Sync auth state on mount
    dispatch(syncFromLocalStorage());
    
    // Also sync when storage changes (for OAuth redirects)
    const handleStorageChange = () => {
      dispatch(syncFromLocalStorage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);
};