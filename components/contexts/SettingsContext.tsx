import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../../services/storageAdapter';

interface SettingsContextType {
    /** Danh sách email gửi đi đã cấu hình (từ smtp_from_email hoặc smtp_user) */
    senderEmails: string[];
    /** true khi đang load lần đầu */
    isLoadingSettings: boolean;
    /** Gọi để force reload settings từ server (VD: sau khi user lưu Settings) */
    reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
    senderEmails: [],
    isLoadingSettings: true,
    reloadSettings: async () => {},
});

const FALLBACK_EMAIL = 'marketing@ka-en.com.vn';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [senderEmails, setSenderEmails] = useState<string[]>([]);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const res = await api.get<any>('settings');
            if (res.success && res.data) {
                const raw = res.data.smtp_from_email || res.data.smtp_user || '';
                const parsed = raw.split(',').map((e: string) => e.trim()).filter(Boolean);
                setSenderEmails(parsed.length > 0 ? parsed : [FALLBACK_EMAIL]);
            } else {
                setSenderEmails([FALLBACK_EMAIL]);
            }
        } catch {
            setSenderEmails([FALLBACK_EMAIL]);
        } finally {
            setIsLoadingSettings(false);
        }
    }, []);

    // Load ngay khi app khởi động — không cần chờ mở Campaign/Flow
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return (
        <SettingsContext.Provider value={{ senderEmails, isLoadingSettings, reloadSettings: loadSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
