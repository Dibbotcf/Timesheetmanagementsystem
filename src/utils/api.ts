
// Configurable API URL
// In production, this can be relative '/api' or from an env var
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getAuthHeaders = () => {
    const userJson = localStorage.getItem('tcf_user');
    const token = userJson ? JSON.parse(userJson).token : ''; // In our simple login we saved token inside user object or separately? 
    // Wait, in LoginScreen I will save the whole response which has { user, token }. 
    // Let's assume we save 'tcf_auth' -> { user, token }

    // Legacy support: App.tsx uses 'tcf_user' storing just the employee object.
    // I should probably stick to that structure or enhance it.
    // Let's store the token separately or attach it.
    const savedToken = localStorage.getItem('tcf_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': savedToken ? `Bearer ${savedToken}` : ''
    };
};
