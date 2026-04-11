import * as React from 'react';
import { useState, useMemo } from 'react';
import { Search, Zap, X, Send, Play } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import { Flow, Subscriber } from '../../types';
import { api } from '../../services/storageAdapter';

interface ManualTriggerFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscriber: Subscriber;
    flows: Flow[];
    onSuccess: (flowName: string) => void;
}

const ManualTriggerFlowModal: React.FC<ManualTriggerFlowModalProps> = ({
    isOpen,
    onClose,
    subscriber,
    flows,
    onSuccess
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState<string | null>(null);

    const filteredFlows = useMemo(() => {
        return flows.filter(f =>
            f.status === 'active' &&
            f.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [flows, searchTerm]);

    const handleTrigger = async (flow: Flow) => {
        setLoading(flow.id);

        // Manual trigger scenario in worker_priority.php
        const query = new URLSearchParams({
            subscriber_id: subscriber.id,
            trigger_type: 'manual',
            target_id: flow.id
        });

        // We use a POST/GET to worker_priority.php
        // Note: The storageAdapter's api.get might wait for completion.
        // worker_priority.php is designed to be fast for the initial chain.
        const res = await api.get<any>(`worker_priority.php?${query.toString()}`);

        setLoading(null);
        if (res.success) {
            onSuccess(flow.name);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kích hoạt Automation thủ công"
            size="md"
        >
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-900">
                            Ghi danh <span className="text-blue-600">"{subscriber.firstName}"</span> vào quy trình tự động.
                        </p>
                        <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                            Hành động này sẽ ghi danh Khách hàng ngay lập tức và bắt đầu thực hiện các bước Instant.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm quy trình..."
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {filteredFlows.length > 0 ? filteredFlows.map(flow => (
                        <div
                            key={flow.id}
                            className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                                    <Play className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{flow.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="success" className="text-[8px] uppercase">Active</Badge>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {flow.steps?.length || 0} Steps
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={Send}
                                onClick={() => handleTrigger(flow)}
                                isLoading={loading === flow.id}
                                className="group-hover:bg-blue-500 group-hover:text-white group-hover:border-transparent transition-all"
                            >
                                Kích hoạt
                            </Button>
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Không tìm thấy quy trình nào</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ManualTriggerFlowModal;
