import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { loginWithEmail as firebaseLoginWithEmail } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const loginWithEmail = async (email, password) => {
        return await firebaseLoginWithEmail(email, password);
    };

    const logout = () => signOut(auth);

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
        <AuthContext.Provider value={{ user, loading, isAdmin, loginWithEmail, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
