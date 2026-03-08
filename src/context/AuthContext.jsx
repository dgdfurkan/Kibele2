import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { loginWithEmail, registerWithEmail } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    /**
     * Logs in a user with the provided email and password.
     * @param {string} email - The user's email.
     * @param {string} password - The user's password.
     * @returns {Promise<UserCredential>} A promise that resolves with the user credential.
     */
    const login = async (email, password) => {
        return await loginWithEmail(email, password);
    };

    /**
     * Registers a new user with the provided email, password, and name.
     * @param {string} email - The user's email.
     * @param {string} password - The user's password.
     * @param {string} name - The user's display name.
     * @returns {Promise<UserCredential>} A promise that resolves with the user credential.
     */
    const register = async (email, password, name) => {
        return await registerWithEmail(email, password, name);
    };

    /**
     * Logs out the current user.
     * @returns {Promise<void>} A promise that resolves when the user is logged out.
     */
    const logout = () => {
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                // User role check from Firestore
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setIsAdmin(data.role === 'admin' || data.role === 'Admin');
                } else {
                    // Auto-create document for the user if it doesn't exist
                    try {
                        await setDoc(userRef, {
                            email: user.email,
                            role: 'user',
                            createdAt: serverTimestamp()
                        }, { merge: true });
                        setIsAdmin(false);
                    } catch (e) {
                        console.error("Error creating user doc:", e);
                    }
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
