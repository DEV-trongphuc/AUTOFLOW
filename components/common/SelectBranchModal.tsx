import * as React from 'react';
import { useState } from 'react';
import { X, GitBranch, Check } from 'lucide-react';

interface Branch {
    id: string;
    label: string;
    description?: string;
}

interface SelectBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (branchId: string) => void;
    branches: Branch[];
    title: string;
    stepType: string;
}

const SelectBranchModal: React.FC<SelectBranchModalProps> = ({
    isOpen,
    onClose: _onClose,
    onConfirm,
    branches,
    title,
    stepType
}) => {
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [animateIn, setAnimateIn] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => setAnimateIn(true), 10);
        } else {
            setAnimateIn(false);
        }
    }, [isOpen]);

    const onClose = () => {
        setAnimateIn(false);
        setTimeout(_onClose, 400);
    };

    if (!isOpen && !animateIn) return null;

    const handleConfirm = () => {
        if (selectedBranch) {
            onConfirm(selectedBranch);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-all duration-500 ease-in-out ${animateIn ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                style={{
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    perspective: '1000px'
                }}
                className={`bg-white rounded-[32px] shadow-2xl border border-white/20 w-full max-w-lg transform transition-all duration-500 relative overflow-hidden ${animateIn ? 'scale-100 opacity-100 translate-y-0 rotate-0' : 'scale-[0.92] opacity-0 translate-y-12 rotate-x-12'}`}>
                {/* Header */}
                <div className="p-8 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shadow-lg shadow-blue-500/5 group">
                            <GitBranch className="w-7 h-7 text-blue-600 transition-transform group-hover:rotate-12" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Chọn nhánh điều hướng</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all absolute top-6 right-6"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 pb-8">
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {branches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch.id)}
                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative group ${selectedBranch === branch.id
                                    ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-500/5'
                                    : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedBranch === branch.id
                                        ? 'border-blue-600 bg-blue-600'
                                        : 'border-slate-200 group-hover:border-blue-300'
                                        }`}>
                                        {selectedBranch === branch.id && (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-sm text-slate-800 truncate">{branch.label}</div>
                                        {branch.description && (
                                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-medium">{branch.description}</div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedBranch}
                            className={`flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg
                                ${selectedBranch
                                    ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200'
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            Xác nhận chuyển
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectBranchModal;
