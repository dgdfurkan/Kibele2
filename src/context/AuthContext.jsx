import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { loginWithEmail, registerWithEmail, updateOnlineStatus } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    /**
     * Logs in a user with the provided email and password.
     */
    const login = async (email, password) => {
        return await loginWithEmail(email, password);
    };

    /**
     * Registers a new user.
     */
    const register = async (email, password, name) => {
        return await registerWithEmail(email, password, name);
    };

    /**
     * Logs out the current user and sets status to offline.
     */
    const logout = async () => {
        if (user) {
            await updateOnlineStatus(user.uid, false);
        }
        return signOut(auth);
    };

    // Heartbeat Effect: Update status periodically if user is active
    useEffect(() => {
        if (!user) return;

        // Perform initial check-in
        updateOnlineStatus(user.uid, true);

        // Update activity every 4 minutes (Firebase free tier friendly)
        const heartbeatInterval = setInterval(() => {
            updateOnlineStatus(user.uid, true);
        }, 4 * 60 * 1000);

        return () => clearInterval(heartbeatInterval);
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            if (authenticatedUser) {
                setUser(authenticatedUser);

                // User role check from Firestore (back to getDoc as requested)
                try {
                    const userRef = doc(db, 'users', authenticatedUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        // Fallback to 'user' if role field is completely missing
                        const rawRole = data.role || 'user';
                        const userRole = rawRole.toLowerCase().trim();

                        // Robust role checking (admin, teacher, hoca)
                        const isAuthorized = userRole === 'admin' || userRole === 'teacher' || userRole === 'hoca';
                        setIsAdmin(isAuthorized);

                        console.log(`[Auth DEBUG] Project ID: ${db.app.options.projectId}`);
                        console.log(`[Auth DEBUG] UID: ${authenticatedUser.uid}`);
                        console.log(`[Auth DEBUG] Email: ${authenticatedUser.email}`);
                        console.log(`[Auth DEBUG] DB Data:`, data);
                        console.log(`[Auth DEBUG] Is Authorized: ${isAuthorized}`);
                    } else {
                        // Auto-create document for the user if it doesn't exist
                        console.log(`[Auth DEBUG] Project ID: ${db.app.options.projectId}`);
                        console.log(`[Auth DEBUG] Profile doc missing for UID: ${authenticatedUser.uid}, creating as 'user'...`);
                        await setDoc(userRef, {
                            email: authenticatedUser.email,
                            role: 'user',
                            createdAt: serverTimestamp(),
                            isOnline: true
                        }, { merge: true });
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("[Auth] Detailed fetch error:", error);
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
