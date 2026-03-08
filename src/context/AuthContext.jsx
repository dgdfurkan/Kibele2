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
        let unsubscribeProfile = () => { };

        const unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
            if (authenticatedUser) {
                setUser(authenticatedUser);

                // Listen to user profile changes in real-time (onSnapshot is more robust than getDoc)
                const userRef = doc(db, 'users', authenticatedUser.uid);

                unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const userRole = data.role?.toLowerCase().trim();

                        // Robust role checking
                        const isAuthorized = userRole === 'admin' || userRole === 'teacher' || userRole === 'hoca' || userRole === 'admin ';
                        setIsAdmin(isAuthorized);

                        console.log(`[Auth] User: ${authenticatedUser.email} (UID: ${authenticatedUser.uid})`);
                        console.log(`[Auth] Profile Role: "${data.role}", isAuthorized: ${isAuthorized}`);
                    } else {
                        // Auto-create document for the user if it doesn't exist
                        console.log(`[Auth] Profile doc missing for UID: ${authenticatedUser.uid}, creating...`);
                        setDoc(userRef, {
                            email: authenticatedUser.email,
                            role: 'user',
                            createdAt: serverTimestamp(),
                            isOnline: true
                        }, { merge: true }).then(() => setIsAdmin(false));
                    }
                }, (error) => {
                    console.error("[Auth] Profile Snapshot Error:", error);
                });

            } else {
                setUser(null);
                setIsAdmin(false);
                if (unsubscribeProfile) unsubscribeProfile();
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
