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

                try {
                    const userRef = doc(db, 'users', authenticatedUser.uid);
                    const userDoc = await getDoc(userRef);

                    console.log(`[AUTH-DIAG] Project: ${db.app.options.projectId}`);
                    console.log(`[AUTH-DIAG] Doc Path: users/${authenticatedUser.uid}`);

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        console.log(`[AUTH-DIAG] Full Data:`, data);

                        const rawRole = data.role || '';
                        const cleanRole = rawRole.toString().toLowerCase().trim();

                        const isAuthorized = cleanRole === 'admin';
                        setIsAdmin(isAuthorized);

                        console.log(`[Auth] Email: ${authenticatedUser.email}, Got Role: "${rawRole}", Admin: ${isAuthorized}`);
                    } else {
                        console.warn(`[AUTH-DIAG] Document DOES NOT EXIST at users/${authenticatedUser.uid}`);
                        // Create only if missing
                        await setDoc(userRef, {
                            email: authenticatedUser.email,
                            role: 'user',
                            createdAt: serverTimestamp(),
                            isOnline: true
                        }, { merge: true });
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("[AUTH-DIAG] Critical Fetch Error:", error.message);
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
