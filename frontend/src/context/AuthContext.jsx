import React, {createContext, useState, useEffect, useCallback} from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Verify token is still valid
            verifyToken(parsedUser.token)
                .then(valid => {
                    if (valid) {
                        setUser(parsedUser);
                    } else {
                        localStorage.removeItem('user');
                    }
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem('user');
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const verifyToken = async (token) => {
        try {
            const response = await fetch('/api/auth/check', {
                headers: {
                    'Authorization': token
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Error verifying token:', error);
            return false;
        }
    };

    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка входа');
            }

            const userData = await response.json();
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (user && user.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': user.token
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
        }
    };
    // Добавим функцию для получения защищенных ресурсов
    const fetchWithAuth = useCallback(async (url, options = {}) => {
        if (!user || !user.token) {
            throw new Error('Требуется авторизация');
        }

        const headers = {
            ...options.headers,
            'Authorization': user.token
        };

        return fetch(url, {
            ...options,
            headers
        });
    }, [user]);

    // Создаем функцию для получения URL изображения с токеном
    const getAuthenticatedImageUrl = useCallback(async (imageUrl) => {
        if (!imageUrl) return null;

        try {
            const response = await fetchWithAuth(imageUrl);
            if (!response.ok) throw new Error('Не удалось загрузить изображение');

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            return null;
        }
    }, [fetchWithAuth]);
    return (
        <AuthContext.Provider value={{ user,fetchWithAuth,getAuthenticatedImageUrl, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};