import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ActiveFlowWarningProps {
    isActive: boolean;
    isViewMode: boolean;
}

const ActiveFlowWarning: React.FC<ActiveFlowWarningProps> = ({ isActive, isViewMode }) => {
    if (!isActive || isViewMode) return null;

    return (
        <div className="absolute top-4 lg:top-6 left-1/2 -translate-x-1/2 z-50 flow-interactive w-[calc(100%-2rem)] sm:w-auto">
            <div className="bg-amber-50/90 backdrop-blur border-2 border-amber-200 rounded-2xl px-4 lg:px-6 py-2 lg:py-3 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shrink-0"></div>
                <p className="text-[10px] lg:text-xs font-bold text-amber-700 leading-tight">
                    <span className="hidden sm:inline">Flow đang chạy! Nhớ bấm </span>
                    <span className="sm:hidden">Đang chạy: </span>
                    <span className="px-1.5 lg:px-2 py-0.5 bg-amber-100 rounded text-amber-800 mx-0.5 lg:mx-1">Lưu</span>
                    <span className="hidden sm:inline"> để áp dụng thay đổi.</span>
                    <span className="sm:hidden"> để cập nhật.</span>
                </p>
            </div>
        </div>
    );
};

export default ActiveFlowWarning;
