import { useState, useEffect, useCallback } from 'react';

export default function useAbility() {
    const [user, setUser] = useState(null);

    // 1. Safely parse the user from LocalStorage
    const fetchUserFromStorage = useCallback(() => {
        try {
            const userString = localStorage.getItem('miras_user');
            if (userString) {
                setUser(JSON.parse(userString));
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to parse user from local storage:', error);
            // Fallback: Clear corrupted data to prevent infinite crash loops
            localStorage.removeItem('miras_user');
            setUser(null);
        }
    }, []);

    // 2. Make it Reactive: Listen for storage events (e.g., cross-tab login/logout)
    useEffect(() => {
        // Initial fetch on mount
        fetchUserFromStorage();

        // Listen for changes to localStorage from other tabs
        window.addEventListener('storage', fetchUserFromStorage);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('storage', fetchUserFromStorage);
        };
    }, [fetchUserFromStorage]);

    /**
     * Check if the user has a specific role
     * @param {string} roleName 
     * @returns {boolean}
     */
    const hasRole = (roleName) => {
        // Use optional chaining for safety
        if (!user?.roles?.length) return false;
        return user.roles.includes(roleName);
    };

    /**
     * Check if the user has a specific permission
     * @param {string} permissionName 
     * @returns {boolean}
     */
    const hasPermission = (permissionName) => {
        if (!user) return false;
        
        // Super Admins automatically pass all permission checks
        if (hasRole('Super Admin')) return true; 
        
        if (!user?.permissions?.length) return false;
        return user.permissions.includes(permissionName);
    };

    return { hasRole, hasPermission, user };
}