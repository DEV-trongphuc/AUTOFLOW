
import React from 'react';
import { X, RotateCcw } from 'lucide-react';

interface FilterPillProps {
    label: string;
    value: string;
    onRemove: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, value, onRemove }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-700 hover:border-orange-200 hover:bg-orange-50/50 transition-all duration-200 group animate-in zoom-in-95">
        <span className="text-slate-400 group-hover:text-orange-400 transition-colors">{label}:</span>
        <span className="text-slate-700 group-hover:text-orange-700 transition-colors uppercase tracking-tight">{value}</span>
        <button
            onClick={onRemove}
            className="p-0.5 hover:bg-orange-100 rounded-full text-slate-400 hover:text-orange-600 transition-all active:scale-90"
        >
            <X className="w-3 h-3" />
        </button>
    </div>
);

interface FilterPillsProps {
    filters: {
        status: string;
        tags: string[];
        verify: string;
        hasChat: string;
        salesperson?: string;
    };
    onRemove: (key: string, value?: string) => void;
    onClearAll: () => void;
    tags: { id: string; name: string }[];
}

const FilterPills: React.FC<FilterPillsProps> = ({ filters, onRemove, onClearAll, tags }) => {
    const activeFilters = [];

    if (filters.status !== 'all') {
        const labels: Record<string, string> = {
            'active': 'Active',
            'lead': 'Lead',
            'customer': 'Customer',
            'unsubscribed': 'Unsubscribed',
            'bounced': 'Bounced'
        };
        activeFilters.push({ key: 'status', label: 'Trạng thái', value: labels[filters.status] || filters.status });
    }

    // Handle multiple tags
    filters.tags.forEach(tag => {
        activeFilters.push({ key: 'tags', label: 'Tag', value: tag });
    });

    if (filters.verify !== 'all') {
        activeFilters.push({ key: 'verify', label: 'Xác thực', value: filters.verify === '1' ? 'Đã xác thực' : 'Chưa xác thực' });
    }

    if (filters.hasChat !== 'all') {
        activeFilters.push({ key: 'hasChat', label: 'Chat', value: filters.hasChat === 'yes' ? 'Có hội thoại' : 'Chưa có' });
    }
    
    if (filters.salesperson) {
        activeFilters.push({ key: 'salesperson', label: 'Sales', value: filters.salesperson });
    }

    if (activeFilters.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mr-2">
                <div className="w-1 h-4 bg-orange-400 rounded-full" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bộ lọc đang áp dụng:</span>
            </div>

            {activeFilters.map(filter => (
                <FilterPill
                    key={`${filter.key}-${filter.value}`}
                    label={filter.label}
                    value={filter.value}
                    onRemove={() => onRemove(filter.key, filter.value)}
                />
            ))}

            <button
                onClick={onClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors ml-2"
            >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa hết bộ lọc</span>
            </button>
        </div>
    );
};

export default FilterPills;
