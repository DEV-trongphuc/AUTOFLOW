import * as React from 'react';
import { useState, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';

interface ColumnDef {
    id: string;
    label: string;
    required?: boolean;
}

interface ColumnCustomizerProps {
    columns: ColumnDef[];
    visibleColumns: string[];
    onChange: (visibleColumns: string[]) => void;
}

const STORAGE_KEY = 'mailflow_visible_columns';

const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({ columns, visibleColumns, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleColumn = (columnId: string) => {
        const column = columns.find(c => c.id === columnId);
        if (column?.required) return; // Can't toggle required columns

        const newVisible = visibleColumns.includes(columnId)
            ? visibleColumns.filter(id => id !== columnId)
            : [...visibleColumns, columnId];

        onChange(newVisible);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisible));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between gap-2 px-3.5 h-[42px] rounded-xl border transition-all duration-200 text-sm font-bold group relative overflow-hidden select-none shadow-sm bg-white border-slate-200 text-slate-600 hover:border-slate-300 ${isOpen ? 'border-[#ffa900] ring-4 ring-orange-500/10' : ''}`}
                title="Tùy chỉnh cột hiển thị"
            >
                <Settings className="w-3.5 h-3.5" />
                <span>Cột hiển thị</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tùy chỉnh cột</p>
                        </div>
                        <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
                            {columns.map(column => {
                                const isVisible = visibleColumns.includes(column.id);
                                const isRequired = column.required;

                                return (
                                    <button
                                        key={column.id}
                                        onClick={() => toggleColumn(column.id)}
                                        disabled={isRequired}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all mb-1 ${isRequired
                                            ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                            : 'hover:bg-slate-50 cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isVisible
                                                ? 'bg-[#ffa900] border-[#ffa900]'
                                                : 'border-slate-300 bg-white'
                                                }`}>
                                                {isVisible && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`text-xs font-semibold ${isVisible ? 'text-slate-800' : 'text-slate-500'
                                                }`}>
                                                {column.label}
                                            </span>
                                        </div>
                                        {isRequired && (
                                            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide bg-amber-50 px-2 py-0.5 rounded">
                                                Bắt buộc
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                            <p className="text-[9px] text-slate-500 font-medium italic">
                                💡 Cột "Tên" luôn hiển thị
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ColumnCustomizer;
export { STORAGE_KEY };
