import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Loader2, Bell } from 'lucide-react';

// Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'loading' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type: ToastType, duration?: number) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType, duration = 4000): string => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (type !== 'loading' && duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const updateToast = useCallback((id: string, message: string, type: ToastType) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, message, type } : t));
        if (type !== 'loading') {
            setTimeout(() => removeToast(id), 3000);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

// Toast Container
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

// Individual Toast Item
const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 10);
    }, []);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />,
        warning: <Bell className="w-5 h-5 text-yellow-400" />,
        loading: <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />,
    };

    const backgrounds = {
        success: 'bg-emerald-500/10 border-emerald-500/30',
        error: 'bg-red-500/10 border-red-500/30',
        info: 'bg-blue-500/10 border-blue-500/30',
        warning: 'bg-yellow-500/10 border-yellow-500/30',
        loading: 'bg-brand-500/10 border-brand-500/30',
    };

    return (
        <div
            className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl
        transition-all duration-300 ease-out
        ${backgrounds[toast.type]}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
        >
            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
            <p className="flex-1 text-sm text-zinc-200 leading-relaxed">{toast.message}</p>
            {toast.type !== 'loading' && (
                <button
                    onClick={onClose}
                    className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            )}
        </div>
    );
};

export default ToastProvider;
