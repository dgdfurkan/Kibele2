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
                const userRef = doc(db, 'users', authenticatedUser.uid);
                unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();
                        const userRole = data.role?.toLowerCase().trim();

                        // Sadece 'admin' rolünü kontrol et (isteğin üzerine sadeleştirildi)
                        const isAuthorized = userRole === 'admin';
                        setIsAdmin(isAuthorized);

                        // Kritik logları sadeleştirdik
                        console.log(`[Auth] Email: ${authenticatedUser.email}, Role: ${data.role}, Admin: ${isAuthorized}`);
                    } else {
                        // Profil yoksa 'user' olarak oluştur
                        setDoc(userRef, {
                            email: authenticatedUser.email,
                            role: 'user',
                            createdAt: serverTimestamp(),
                            isOnline: true
                        }, { merge: true }).then(() => setIsAdmin(false));
                    }
                }, (error) => {
                    console.error("[Auth] Error:", error);
                });
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
