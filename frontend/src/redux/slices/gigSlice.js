import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
    gigs: [],
    popularGigs: [],
    gigDetails: null,
    loading: false,
    error: null,
    operationInProgress: false,
    lastOperation: null,
    lastOperationTime: null,
};

// Enhanced security helper functions
const getToken = () => {
    try {
        const token = localStorage.getItem("userToken");
        if (!token) return null;
        
        // Basic token validation
        if (typeof token !== 'string' || token.length < 10) {
            console.warn('Invalid token format detected');
            localStorage.removeItem("userToken");
            return null;
        }
        return token;
    } catch (error) {
        console.error('Error accessing localStorage:', error);
        return null;
    }
};

// Rate limiting and security checks
const securityChecks = {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxRetries: 3,
    minRequestInterval: 1000, // 1 second between requests
    
    validateRequest: (data) => {
        // Check if data is too large
        if (data && JSON.stringify(data).length > securityChecks.maxRequestSize) {
            throw new Error('Request payload too large');
        }
        
        // Basic XSS prevention
        const dangerousPatterns = /[<>"'`]/;
        if (typeof data === 'string' && dangerousPatterns.test(data)) {
            throw new Error('Potentially dangerous input detected');
        }
        
        return true;
    },
    
    sanitizeInput: (input) => {
        if (typeof input === 'string') {
            return input
                .replace(/[<>"'`]/g, '') // Remove dangerous characters
                .trim()
                .substring(0, 10000); // Limit length
        }
        return input;
    },
};

// Enhanced axios instance with security features
const secureAxios = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    timeout: 30000, // 30 seconds timeout
    maxRedirects: 0, // Prevent redirect attacks
    maxContentLength: 10 * 1024 * 1024, // 10MB max response
});

// Request interceptor for security headers
secureAxios.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add security headers
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.headers['X-Content-Type-Options'] = 'nosniff';
        config.headers['X-Frame-Options'] = 'DENY';
        config.headers['X-XSS-Protection'] = '1; mode=block';
        
        // For FormData, ensure proper content type
        if (config.data instanceof FormData) {
            config.headers['Content-Type'] = 'multipart/form-data';
            
            // Validate FormData size
            if (config.data && typeof config.data.get === 'function') {
                let size = 0;
                config.data.forEach((value, key) => {
                    if (value instanceof File) {
                        size += value.size;
                    } else if (typeof value === 'string') {
                        size += value.length;
                    }
                });
                
                if (size > securityChecks.maxRequestSize) {
                    throw new Error('File upload size exceeds limit');
                }
            }
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
secureAxios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            // Network error
            throw new Error('Network error. Please check your connection.');
        }
        
        const { status, data } = error.response;
        
        switch (status) {
            case 401:
                // Unauthorized - clear token and redirect
                localStorage.removeItem("userToken");
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
                
            case 403:
                throw new Error('Access denied. You do not have permission.');
                
            case 413:
                throw new Error('File too large. Maximum size is 10MB.');
                
            case 429:
                throw new Error('Too many requests. Please try again later.');
                
            case 422:
                // Validation errors
                const validationError = data?.errors 
                    ? Object.values(data.errors).join(', ')
                    : data?.message || 'Validation failed';
                throw new Error(validationError);
                
            default:
                throw new Error(data?.message || `Server error (${status})`);
        }
    }
);

// Debounce function to prevent rapid requests
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Secure fetch with retry logic and rate limiting
const secureFetch = async (method, url, data = null, options = {}) => {
    const startTime = Date.now();
    const maxRetries = options.retries || securityChecks.maxRetries;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check if another operation is in progress
            if (initialState.operationInProgress) {
                throw new Error('Another operation is in progress');
            }
            
            // Rate limiting check
            if (initialState.lastOperationTime && 
                Date.now() - initialState.lastOperationTime < securityChecks.minRequestInterval) {
                throw new Error('Please wait before making another request');
            }
            
            // Validate request data
            if (data) {
                securityChecks.validateRequest(data);
                
                // Sanitize string inputs
                if (typeof data === 'object' && !(data instanceof FormData)) {
                    const sanitized = {};
                    Object.keys(data).forEach(key => {
                        sanitized[key] = securityChecks.sanitizeInput(data[key]);
                    });
                    data = sanitized;
                }
            }
            
            // Make the request
            let response;
            switch (method.toLowerCase()) {
                case 'get':
                    response = await secureAxios.get(url, { params: data, ...options });
                    break;
                case 'post':
                    response = await secureAxios.post(url, data, options);
                    break;
                case 'put':
                    response = await secureAxios.put(url, data, options);
                    break;
                case 'delete':
                    response = await secureAxios.delete(url, options);
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }
            
            // Validate response structure
            if (!response.data) {
                throw new Error('Invalid response from server');
            }
            
            // Log successful operation (in production, this would go to monitoring system)
            console.debug(`[SECURITY] ${method.toUpperCase()} ${url} - Success in ${Date.now() - startTime}ms`);
            
            return response.data;
            
        } catch (error) {
            console.error(`[SECURITY] ${method.toUpperCase()} ${url} - Attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                // Log security incident (in production, send to security monitoring)
                const incident = {
                    type: 'API_REQUEST_FAILURE',
                    method,
                    url,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    attempts: attempt,
                };
                console.warn('[SECURITY INCIDENT]', incident);
                
                throw error;
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
    }
};

// Async thunks with enhanced security
export const fetchGigs = createAsyncThunk(
    "gigs/fetchGigs",
    async (params = {}, { rejectWithValue, signal }) => {
        try {
            const data = await secureFetch('get', '/api/gigs', params, { signal });
            
            // Validate response structure
            if (data.success && Array.isArray(data.gigs)) {
                return data.gigs;
            } else if (Array.isArray(data)) {
                return data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            return rejectWithValue({ 
                message: error.message,
                code: 'FETCH_GIGS_FAILED',
                timestamp: new Date().toISOString(),
            });
        }
    }
);

export const fetchPopularGigs = createAsyncThunk(
    "gigs/fetchPopularGigs",
    async (_, { rejectWithValue, signal }) => {
        try {
            const data = await secureFetch('get', '/api/gigs/popular', null, { signal });
            
            if (data.success && Array.isArray(data.gigs)) {
                return data.gigs;
            } else if (Array.isArray(data)) {
                return data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            return rejectWithValue({ 
                message: error.message,
                code: 'FETCH_POPULAR_FAILED',
                timestamp: new Date().toISOString(),
            });
        }
    }
);

export const fetchGigById = createAsyncThunk(
    "gigs/fetchGigById",
    async (id, { rejectWithValue, signal }) => {
        // Validate ID format
        if (!id || typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
            return rejectWithValue({ 
                message: 'Invalid gig ID format',
                code: 'INVALID_ID',
            });
        }
        
        try {
            const data = await secureFetch('get', `/api/gigs/${id}`, null, { signal });
            
            if (data.success && data.gig) {
                return data.gig;
            } else if (data && data._id) {
                return data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            return rejectWithValue({ 
                message: error.message,
                code: 'FETCH_GIG_FAILED',
                gigId: id,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

export const createGig = createAsyncThunk(
    "gigs/createGig",
    async (gigData, { rejectWithValue }) => {
        // Enhanced validation for gig creation
        const requiredFields = ['fullName', 'oauthEmail', 'country', 'phone', 'projectCategory', 'description', 'budget'];
        const missingFields = requiredFields.filter(field => !gigData.get(field));
        
        if (missingFields.length > 0) {
            return rejectWithValue({
                message: `Missing required fields: ${missingFields.join(', ')}`,
                code: 'MISSING_FIELDS',
                fields: missingFields,
            });
        }
        
        // Validate budget
        const budget = gigData.get('budget');
        if (budget && (isNaN(budget) || budget < 5 || budget > 100000)) {
            return rejectWithValue({
                message: 'Budget must be a number between 5 and 100000',
                code: 'INVALID_BUDGET',
            });
        }
        
        try {
            const data = await secureFetch('post', '/api/gigs', gigData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // 1 minute timeout for file uploads
            });
            
            if (data.success && data.gig) {
                // Log successful creation (in production, this would be more detailed)
                console.info(`[AUDIT] Gig created: ${data.gig._id}`);
                return data.gig;
            } else if (data && data._id) {
                return data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            return rejectWithValue({ 
                message: error.message,
                code: 'CREATE_GIG_FAILED',
                timestamp: new Date().toISOString(),
            });
        }
    }
);

// New security-focused actions
export const validateGigData = createAsyncThunk(
    "gigs/validateGigData",
    async (gigData, { rejectWithValue }) => {
        try {
            // Comprehensive validation
            const errors = {};
            
            // Check for XSS attempts
            const xssPattern = /[<>"'`]|script|alert|onerror|onload|javascript:/i;
            Object.entries(gigData).forEach(([key, value]) => {
                if (typeof value === 'string' && xssPattern.test(value)) {
                    errors[key] = 'Potentially dangerous content detected';
                }
            });
            
            // Check for SQL injection patterns
            const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b|['";])/i;
            Object.entries(gigData).forEach(([key, value]) => {
                if (typeof value === 'string' && sqlPattern.test(value)) {
                    errors[key] = 'Invalid input format';
                }
            });
            
            if (Object.keys(errors).length > 0) {
                return rejectWithValue({
                    message: 'Validation failed',
                    code: 'SECURITY_VALIDATION_FAILED',
                    errors,
                    timestamp: new Date().toISOString(),
                });
            }
            
            return { valid: true, message: 'Data validation passed' };
        } catch (error) {
            return rejectWithValue({ 
                message: error.message,
                code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    }
);

const gigSlice = createSlice({
    name: "gigs",
    initialState,
    reducers: {
        clearGigDetails: (state) => {
            state.gigDetails = null;
            state.error = null;
        },
        resetGigState: (state) => {
            return { ...initialState };
        },
        setOperationInProgress: (state, action) => {
            state.operationInProgress = action.payload;
            if (action.payload) {
                state.lastOperationTime = Date.now();
            }
        },
        clearError: (state) => {
            state.error = null;
        },
        // Security action to log suspicious activity
        logSuspiciousActivity: (state, action) => {
            const { type, data, user } = action.payload;
            console.warn('[SUSPICIOUS ACTIVITY]', {
                type,
                data,
                user,
                timestamp: new Date().toISOString(),
                stateSnapshot: { ...state, gigs: 'REDACTED', popularGigs: 'REDACTED' }
            });
        }
    },
    extraReducers: (builder) => {
        // Helper function for common state updates
        const handlePending = (state, operation) => {
            state.loading = true;
            state.error = null;
            state.operationInProgress = true;
            state.lastOperation = operation;
            state.lastOperationTime = Date.now();
        };
        
        const handleFulfilled = (state, dataField, payload) => {
            state.loading = false;
            state.operationInProgress = false;
            if (dataField) {
                state[dataField] = payload;
            }
        };
        
        const handleRejected = (state, action) => {
            state.loading = false;
            state.operationInProgress = false;
            state.error = {
                message: action.payload?.message || 'An error occurred',
                code: action.payload?.code || 'UNKNOWN_ERROR',
                timestamp: action.payload?.timestamp || new Date().toISOString(),
                ...action.payload, // Include any additional error data
            };
        };
        
        builder
            // fetchGigs
            .addCase(fetchGigs.pending, (state) => handlePending(state, 'fetchGigs'))
            .addCase(fetchGigs.fulfilled, (state, action) => {
                handleFulfilled(state, 'gigs', action.payload);
            })
            .addCase(fetchGigs.rejected, (state, action) => handleRejected(state, action))
            
            // fetchPopularGigs
            .addCase(fetchPopularGigs.pending, (state) => handlePending(state, 'fetchPopularGigs'))
            .addCase(fetchPopularGigs.fulfilled, (state, action) => {
                handleFulfilled(state, 'popularGigs', action.payload);
            })
            .addCase(fetchPopularGigs.rejected, (state, action) => handleRejected(state, action))
            
            // fetchGigById
            .addCase(fetchGigById.pending, (state) => handlePending(state, 'fetchGigById'))
            .addCase(fetchGigById.fulfilled, (state, action) => {
                handleFulfilled(state, 'gigDetails', action.payload);
            })
            .addCase(fetchGigById.rejected, (state, action) => handleRejected(state, action))
            
            // createGig
            .addCase(createGig.pending, (state) => handlePending(state, 'createGig'))
            .addCase(createGig.fulfilled, (state, action) => {
                handleFulfilled(state);
                // Add new gig to list (with validation)
                if (action.payload && action.payload._id) {
                    state.gigs.push(action.payload);
                }
                console.info(`[AUDIT] Gig ${action.payload?._id} added to state`);
            })
            .addCase(createGig.rejected, (state, action) => handleRejected(state, action))
            
            // validateGigData
            .addCase(validateGigData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(validateGigData.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(validateGigData.rejected, (state, action) => handleRejected(state, action));
    },
});

export const { 
    clearGigDetails, 
    resetGigState, 
    setOperationInProgress, 
    clearError,
    logSuspiciousActivity 
} = gigSlice.actions;

export default gigSlice.reducer;

// Export security utilities for use in components
export const securityUtils = {
    validateToken: () => {
        const token = getToken();
        return token && token.length > 10;
    },
    sanitizeUserInput: (input) => securityChecks.sanitizeInput(input),
    checkForThreats: (data) => {
        const threats = [];
        const patterns = {
            xss: /[<>"'`]|script|alert|onerror|onload|javascript:/i,
            sql: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC)\b|['";])/i,
            pathTraversal: /\.\.\/|\.\.\\|\/etc\/|\/bin\//i,
        };
        
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string') {
                Object.entries(patterns).forEach(([threatType, pattern]) => {
                    if (pattern.test(value)) {
                        threats.push({ field: key, threat: threatType, value });
                    }
                });
            }
        });
        
        return threats;
    },
    generateSecurityReport: () => ({
        lastOperation: initialState.lastOperation,
        lastOperationTime: initialState.lastOperationTime,
        tokenValid: securityUtils.validateToken(),
        timestamp: new Date().toISOString(),
    }),
};