import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, profileAPI } from '../lib/api'; // Added profileAPI

interface User {
  id: number;
  name: string;
  email: string;
  profile_picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null; // Added setUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authAPI.getCurrentUser()
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    const { access_token } = response.data;
    localStorage.setItem('auth_token', access_token);
    
    const userResponse = await authAPI.getCurrentUser();
    setUser(userResponse.data);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await authAPI.signup({ name, email, password });
    return response.data; // Return the signup response for proper handling
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await authAPI.forgotPassword({ email });
  };

  const verifyCode = async (email: string, code: string) => {
    await authAPI.verifyCode({ email, code });
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    await authAPI.resetPassword({ email, code, new_password: newPassword });
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    forgotPassword,
    verifyCode,
    resetPassword,
    setUser, // Added setUser to the context value
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};