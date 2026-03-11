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

    // Heartbeat Effect: Update status periodically ONLY after profile is fetched
    useEffect(() => {
        if (!user || loading) return;

        // Perform initial check-in
        updateOnlineStatus(user.uid, true);

        // Update activity every 4 minutes (Firebase free tier friendly)
        const heartbeatInterval = setInterval(() => {
            updateOnlineStatus(user.uid, true);
        }, 4 * 60 * 1000);

        return () => clearInterval(heartbeatInterval);
    }, [user, loading]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            if (authenticatedUser) {
                setUser(authenticatedUser);

                try {
                    const userRef = doc(db, 'users', authenticatedUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const data = userSnap.data();

                        // Kullanıcı objesine Firestore'daki ismi ve diğer verileri ekle
                        setUser(prev => {
                            if (!prev) return authenticatedUser;
                            // Firestore verisi (name vb.) her zaman baskın olmalı
                            return {
                                ...prev,
                                ...data,
                                // Eğer Firestore'da name varsa ama prev'de (Auth) farklı bir displayName varsa, name kazansın
                                name: data.name || prev.displayName || prev.email?.split('@')[0]
                            };
                        });

                        const rawRole = data.role || "student";
                        const cleanRole = rawRole.toString().toLowerCase().trim();

                        const isAuthorized = cleanRole === 'admin';
                        setIsAdmin(isAuthorized);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("[AUTH] Hata:", error.message);
                    setIsAdmin(false);
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
