
import React, { useState, useEffect } from 'react';
import {
    Save, Database, Mail, ShieldCheck, Globe,
    Loader2, Play, FileText, CheckCircle2, AlertTriangle,
    Server, Lock, Key, KeyRound, Zap, Cake, History, Inbox, Hash,
    FlaskConical, ArrowRight, UserPlus, Info, ShoppingCart, RefreshCcw, Terminal, MessageSquare, Users, BrainCircuit, Sparkles
} from 'lucide-react';
import { FormDefinition, PurchaseEvent, CustomEvent } from '../types';
import toast from 'react-hot-toast';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
// @ts-ignore: Added missing import for Tabs component
import Tabs from '../components/common/Tabs';
// @ts-ignore: Added missing import for api from storageAdapter
import { api } from '../services/storageAdapter';
import { useIsAdmin } from '../hooks/useAuthUser';



const Settings: React.FC = () => {
    const isAdmin = useIsAdmin();
    const [activeTab, setActiveTab] = useState('system');

    // Hardcoded production URL, ignoring localStorage
    const [apiUrl, setApiUrl] = useState('https://automation.ideas.edu.vn/mail_api');
    const [smtp, setSmtp] = useState({
        smtp_enabled: '0',
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_encryption: 'tls',
        imap_enabled: '0',
        imap_host: 'imap.gmail.com',
        imap_port: '993',
        imap_user: '',
        imap_pass: '',
        internal_qa_emails: '',
        gemini_api_key: '',
        aws_access_key: '',
        aws_secret_key: ''
    });

    // Data for Selects
    const [forms, setForms] = useState<FormDefinition[]>([]);
    const [purchaseEvents, setPurchaseEvents] = useState<PurchaseEvent[]>([]);
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);

    // Sandbox State
    const [sandboxTab, setSandboxTab] = useState<'form' | 'purchase' | 'custom'>('form');

    // Form Test State
    const [selectedFormId, setSelectedFormId] = useState('');
    const [testEmail, setTestEmail] = useState('');

    // Purchase Test State
    const [selectedEventId, setSelectedEventId] = useState('');
    const [testPurchaseEmail, setTestPurchaseEmail] = useState('');
    const [testPurchaseAmount, setTestPurchaseAmount] = useState('500000');

    // Custom Event Test State
    const [selectedCustomEventId, setSelectedCustomEventId] = useState('');
    const [testCustomEmail, setTestCustomEmail] = useState('');

    const [isTesting, setIsTesting] = useState(false);
    const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunningEnrollment, setIsRunningEnrollment] = useState(false);
    const [engineResult, setEngineResult] = useState<string | null>(null);
    const [selectedWorkerLogType, setSelectedWorkerLogType] = useState('worker_enroll'); // New state for log type

    // Health Check State
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [healthResults, setHealthResults] = useState<any | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        // FIX: Add missing api import
        const res = await api.get<any>('settings');
        if (res.success) {
            setSmtp(prev => ({
                ...prev,
                ...res.data,
                // Auto-fill Amazon SES if missing
                smtp_enabled: res.data.smtp_enabled === '1' ? '1' : '1', // Auto-enable for setup
                smtp_host: res.data.smtp_host || 'email-smtp.us-east-2.amazonaws.com', // Correct Region from User info
                smtp_user: res.data.smtp_user || 'AKIAXWQT74VN2BACAOTI',
                smtp_pass: res.data.smtp_pass || 'BNLL1hz/J/4LPVr6JznV29LyPnmSgpMLsg5c92LyM6I9',
                smtp_port: res.data.smtp_port || '587', // 587 is best for TLS
                smtp_encryption: res.data.smtp_encryption || 'tls',
                smtp_from_email: res.data.smtp_from_email || 'tuyensinh@ideas.edu.vn',
                smtp_from_name: res.data.smtp_from_name || 'Tuyển Sinh IDEAS',
                aws_access_key: res.data.aws_access_key || '',
                aws_secret_key: res.data.aws_secret_key || ''
            }));
        }

        // FIX: Add missing api import
        const formsRes = await api.get<FormDefinition[]>('forms');
        if (formsRes.success) setForms(formsRes.data);

        // FIX: Add missing api import
        const purchRes = await api.get<PurchaseEvent[]>('purchase_events');
        if (purchRes.success) setPurchaseEvents(purchRes.data);

        // FIX: Add missing api import
        const customRes = await api.get<CustomEvent[]>('custom_events');
        if (customRes.success) setCustomEvents(customRes.data);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // localStorage.setItem('mailflow_api_url', apiUrl); // Disabled to force production
        // FIX: Add missing api import
        const res = await api.post('settings', smtp);
        if (res.success) {
            toast.success('Đã lưu cấu hình hệ thống!');
        } else {
            toast.error('Lỗi khi lưu cấu hình server.');
        }
        setIsSaving(false);
    };

    const handleTestForm = async () => {
        if (!selectedFormId) {
            toast.error('Vui lòng chọn một Form để test');
            return;
        }
        setIsTesting(true);
        try {
            const endpoint = `${apiUrl.replace(/\/$/, '')}/forms.php?route=submit`;
            const emailToSubmit = testEmail.trim() || `test_${Math.floor(Math.random() * 1000)}@ka-en.com.vn`;

            const testData = {
                form_id: selectedFormId,
                email: emailToSubmit,
                firstName: 'Test User',
                lastName: 'Form Lead',
                source: 'Settings Sandbox'
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            const result = await response.json();

            if (result.success) {
                toast.success(`Gửi Form thành công cho ${emailToSubmit}!`);
                // Since forms.php now directly calls worker_priority.php, no need to manually run engine here.
                // We can optionally refresh logs after a short delay to see the worker output.
                setTimeout(() => refreshWorkerLog('worker_priority'), 1000);
            } else {
                toast.error(result.message || 'Lỗi khi gửi data test');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestPurchase = async () => {
        if (!selectedEventId) {
            toast.error('Vui lòng chọn sự kiện mua hàng');
            return;
        }
        setIsTesting(true);
        try {
            const endpoint = `${apiUrl.replace(/\/$/, '')}/purchase_events.php?route=track`;
            const emailToSubmit = testPurchaseEmail.trim() || `buyer_${Math.floor(Math.random() * 1000)}@ka-en.com.vn`;

            const payload = {
                event_id: selectedEventId,
                email: emailToSubmit,
                firstName: "Test Buyer",
                lastName: "VIP",
                total_value: parseFloat(testPurchaseAmount) || 0,
                currency: "VND",
                items: [
                    { name: "Sản phẩm Test A", price: parseFloat(testPurchaseAmount) }
                ]
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                toast.success(`Ghi nhận đơn hàng thành công cho ${emailToSubmit}!`);
                // purchase_events.php now directly calls worker_priority.php
                setTimeout(() => refreshWorkerLog('worker_priority'), 1000);
            } else {
                toast.error(result.message || 'Lỗi API mua hàng');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestCustomEvent = async () => {
        if (!selectedCustomEventId) {
            toast.error('Vui lòng chọn sự kiện tùy chỉnh');
            return;
        }
        setIsTesting(true);
        try {
            const endpoint = `${apiUrl.replace(/\/$/, '')}/custom_events.php?route=track`;
            const emailToSubmit = testCustomEmail.trim() || `user_${Math.floor(Math.random() * 1000)}@ka-en.com.vn`;

            const payload = {
                event_id: selectedCustomEventId,
                email: emailToSubmit,
                firstName: "Custom",
                lastName: "User",
                properties: {
                    test: true,
                    source: "sandbox"
                }
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                toast.success(`Trigger sự kiện thành công cho ${emailToSubmit}!`);
                // custom_events.php now directly calls worker_priority.php
                setTimeout(() => refreshWorkerLog('worker_priority'), 1000);
            } else {
                toast.error(result.message || 'Lỗi API Custom Event');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API.');
        } finally {
            setIsTesting(false);
        }
    };

    const handleRunEnrollmentWorker = async () => {
        setIsRunningEnrollment(true);
        setEngineResult(null);
        try {
            const url = apiUrl.replace(/\/$/, '') + '/worker_enroll.php'; // Call the enrollment worker
            const response = await fetch(url);
            const text = await response.text();
            setEngineResult(text);
            toast.success('Đã thực thi bộ máy đăng ký Flow!');
        } catch (e) {
            setEngineResult('Lỗi kết nối đến worker_enroll.php');
            toast.error('Lỗi thực thi bộ máy.');
        } finally {
            setIsRunningEnrollment(false);
        }
    };

    const refreshLogs = async () => {
        // FIX: Add missing api import
        const res = await api.get<any[]>('logs?type=delivery');
        if (res.success) setDeliveryLogs(res.data);
    };

    const refreshWorkerLog = async (workerType: string) => {
        setSelectedWorkerLogType(workerType); // Update selected log type state
        setEngineResult('Đang tải log...');
        try {
            // FIX: Add missing api import
            const res = await api.get<any>(`logs?type=${workerType}`);
            if (res.success && res.data) {
                setEngineResult(res.data.content);
            } else {
                setEngineResult(`Không thể tải log cho ${workerType}.`);
            }
        } catch (e) {
            setEngineResult(`Lỗi kết nối khi tải log cho ${workerType}.`);
        }
    };

    const handleCheckHealth = async () => {
        setIsCheckingHealth(true);
        setHealthResults(null);
        try {
            // Calling the relative path through storageAdapter's api if possible, 
            // but health_check.php is new so we use fetch or api.get
            const res = await api.get<any>('health_check');
            if (res.success) {
                setHealthResults(res.data);
                toast.success('Kiểm tra hệ thống hoàn tất!');
            } else {
                toast.error(res.message || 'Gặp lỗi khi kiểm tra hệ thống.');
            }
        } catch (e) {
            toast.error('Lỗi kết nối API Health Check.');
        } finally {
            setIsCheckingHealth(false);
        }
    };

    // ─── Permission Gate ──────────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-rose-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Không đủ quyền truy cập</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Trang <b>Cài đặt hệ thống</b> chỉ dành cho tài khoản <b className="text-amber-600">Admin</b>.<br />
                        Vui lòng liên hệ quản trị viên để được cấp quyền.
                    </p>
                </div>
            </div>
        );
    }
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="animate-fade-in px-3.5 lg:px-0 max-w-6xl mx-auto pb-24">

            <div className="mb-8 lg:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                    <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Cài đặt hệ thống</h2>
                    <p className="text-xs lg:text-sm text-slate-500 mt-2 font-medium">Cấu hình kết nối máy chủ gửi & nhận Email.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button
                        icon={Save}
                        isLoading={isSaving}
                        onClick={handleSave}
                        size="lg"
                        className="w-full sm:w-auto shadow-lg shadow-orange-500/20 bg-[#ffa900] hover:bg-[#e69800] text-white border-none h-12 lg:h-14 px-8 rounded-2xl"
                    >
                        Lưu cấu hình
                    </Button>
                </div>
            </div>

            <div className="mb-8 -mx-3.5 px-3.5 lg:mx-0 lg:px-0">
                <Tabs
                    activeId={activeTab}
                    onChange={setActiveTab}
                    variant="pill"
                    className="flex-nowrap overflow-x-auto scrollbar-hide pb-2"
                    items={[
                        { id: 'system', label: 'Máy chủ & Mail', icon: Server },
                        { id: 'ai', label: 'Cấu hình AI', icon: Sparkles },
                        { id: 'logs', label: 'Nhật ký gửi', icon: History },
                        { id: 'health', label: 'Tình trạng API', icon: ShieldCheck },
                    ]}
                />
            </div>

            {activeTab === 'system' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                    {/* ... (existing system settings content) ... */}
                    <div className="lg:col-span-2 space-y-8">


                        {/* AUTOMATION TEST SANDBOX */}
                        <div className="bg-white rounded-2xl lg:rounded-[32px] p-5 lg:p-8 border-2 border-[#ffa900]/20 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 lg:w-96 h-64 lg:h-96 bg-[#ffa900] opacity-10 rounded-full blur-[60px] lg:blur-[100px] -mr-32 lg:-mr-48 -mt-32 lg:-mt-48 animate-pulse"></div>

                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                <div className="p-2.5 lg:p-3 bg-orange-50 rounded-xl lg:rounded-2xl text-[#ca7900] shadow-sm"><FlaskConical className="w-5 h-5 lg:w-6 lg:h-6" /></div>
                                <div>
                                    <h3 className="text-base lg:text-lg font-black text-slate-800">Automation Sandbox</h3>
                                    <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Giả lập hành động Khách hàng để kiểm tra Flow.</p>
                                </div>
                            </div>

                            {/* Sub-tabs inside Sandbox */}
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative z-10 w-fit overflow-x-auto max-w-full no-scrollbar">
                                <button
                                    onClick={() => setSandboxTab('form')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${sandboxTab === 'form' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <FileText className="w-3.5 h-3.5" /> Test Form
                                </button>
                                <button
                                    onClick={() => setSandboxTab('purchase')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${sandboxTab === 'purchase' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" /> Test Mua hàng
                                </button>
                                <button
                                    onClick={() => setSandboxTab('custom')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${sandboxTab === 'custom' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Zap className="w-3.5 h-3.5" /> Custom Event
                                </button>
                            </div>

                            {sandboxTab === 'form' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 items-end animate-in fade-in slide-in-from-left-2">
                                    <Select
                                        label="1. Chọn Form liên kết"
                                        options={forms.map(f => ({ value: f.id, label: f.name }))}
                                        value={selectedFormId}
                                        onChange={setSelectedFormId}
                                        placeholder="Chọn biểu mẫu..."
                                        variant="outline"
                                        icon={FileText}
                                    />
                                    <Input
                                        label="2. Email nhận test"
                                        placeholder="test@ka-en.com.vn"
                                        value={testEmail}
                                        onChange={e => setTestEmail(e.target.value)}
                                        icon={Mail}
                                    />
                                    <div className="md:col-span-2 pt-2">
                                        <Button
                                            onClick={handleTestForm}
                                            isLoading={isTesting}
                                            disabled={!selectedFormId}
                                            fullWidth
                                            className="h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs tracking-widest"
                                            icon={ArrowRight}
                                        >
                                            GIẢ LẬP ĐIỀN FORM
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {sandboxTab === 'purchase' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 items-end animate-in fade-in slide-in-from-right-2">
                                    <div className="md:col-span-2">
                                        <Select
                                            label="1. Chọn Sự kiện mua hàng"
                                            options={purchaseEvents.map(e => ({ value: e.id, label: e.name }))}
                                            value={selectedEventId}
                                            onChange={setSelectedEventId}
                                            placeholder="Chọn sự kiện..."
                                            variant="outline"
                                            icon={ShoppingCart}
                                        />
                                    </div>
                                    <Input
                                        label="2. Email mua hàng"
                                        placeholder="buyer@ka-en.com.vn"
                                        value={testPurchaseEmail}
                                        onChange={e => setTestPurchaseEmail(e.target.value)}
                                        icon={Mail}
                                    />
                                    <Input
                                        label="3. Giá trị đơn (VNĐ)"
                                        type="number"
                                        value={testPurchaseAmount}
                                        onChange={e => setTestPurchaseAmount(e.target.value)}
                                        icon={Zap}
                                    />
                                    <div className="md:col-span-2 pt-2">
                                        <Button
                                            onClick={handleTestPurchase}
                                            isLoading={isTesting}
                                            disabled={!selectedEventId}
                                            fullWidth
                                            className="h-12 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black text-xs tracking-widest shadow-lg shadow-pink-200"
                                            icon={ArrowRight}
                                        >
                                            GIẢ LẬP MUA HÀNG THÀNH CÔNG
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {sandboxTab === 'custom' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 items-end animate-in fade-in slide-in-from-right-2">
                                    <div className="md:col-span-2">
                                        <Select
                                            label="1. Chọn Sự kiện tùy chỉnh"
                                            options={customEvents.map(e => ({ value: e.id, label: e.name }))}
                                            value={selectedCustomEventId}
                                            onChange={setSelectedCustomEventId}
                                            placeholder="Chọn sự kiện..."
                                            variant="outline"
                                            icon={Zap}
                                        />
                                    </div>
                                    <Input
                                        label="2. Email user"
                                        placeholder="user@ka-en.com.vn"
                                        value={testCustomEmail}
                                        onChange={e => setTestCustomEmail(e.target.value)}
                                        icon={Mail}
                                    />
                                    <div className="md:col-span-2 pt-2">
                                        <Button
                                            onClick={handleTestCustomEvent}
                                            isLoading={isTesting}
                                            disabled={!selectedCustomEventId}
                                            fullWidth
                                            className="h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs tracking-widest shadow-lg shadow-violet-200"
                                            icon={ArrowRight}
                                        >
                                            GIẢ LẬP SỰ KIỆN TÙY CHỈNH
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-3 relative z-10">
                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
                                    <b>Cơ chế:</b> Hệ thống sẽ gửi request API giả lập tới Backend &rarr; Backend ghi nhận Subscriber mới &rarr; Tự động kích hoạt các Flow đang "Active" có trigger tương ứng.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl lg:rounded-[32px] p-5 lg:p-8 border-2 border-slate-100 shadow-xl relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm"><Server className="w-5 h-5 lg:w-6 lg:h-6" /></div>
                                    <div>
                                        <h3 className="text-base lg:text-lg font-black text-slate-800">Cấu hình Gửi (SMTP)</h3>
                                        <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Kết nối máy chủ thực hiện gửi email.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-2">
                                    <button
                                        onClick={() => setSmtp({ ...smtp, smtp_enabled: smtp.smtp_enabled === '1' ? '0' : '1' })}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black transition-all shadow-md ${smtp.smtp_enabled === '1' ? 'bg-[#ffa900] text-white ring-4 ring-orange-100' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                        {smtp.smtp_enabled === '1' ? <><CheckCircle2 className="w-3.5 h-3.5" /> ĐANG BẬT</> : <><AlertTriangle className="w-3.5 h-3.5" /> ĐANG TẮT</>}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Thông tin Máy chủ & Đăng nhập</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Máy chủ (Host)" placeholder="email-smtp.us-east-1.amazonaws.com" value={smtp.smtp_host} onChange={e => setSmtp({ ...smtp, smtp_host: e.target.value })} icon={Globe} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Còng (Port)" placeholder="587" value={smtp.smtp_port} onChange={e => setSmtp({ ...smtp, smtp_port: e.target.value })} icon={Hash} />
                                            <Select
                                                label="Mã hóa"
                                                options={[
                                                    { value: 'tls', label: 'TLS (Khuyên dùng)' },
                                                    { value: 'ssl', label: 'SSL' },
                                                    { value: 'none', label: 'Không' }
                                                ]}
                                                value={smtp.smtp_encryption}
                                                onChange={(val) => setSmtp({ ...smtp, smtp_encryption: val })}
                                                icon={Lock}
                                            />
                                        </div>
                                        <Input label="Tên đăng nhập SMTP (Username)" placeholder="AKIA..." value={smtp.smtp_user} onChange={e => setSmtp({ ...smtp, smtp_user: e.target.value })} icon={Key} />
                                        <Input label="Mật khẩu SMTP (Password)" type="password" placeholder="••••••••••••••••" value={smtp.smtp_pass} onChange={e => setSmtp({ ...smtp, smtp_pass: e.target.value })} icon={KeyRound} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 border-t border-slate-100 pt-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        2. Khóa API (Dùng để check Quota AWS)
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="AWS Access Key ID" placeholder="AKIA..." value={(smtp as any).aws_access_key} onChange={e => setSmtp({ ...smtp, aws_access_key: e.target.value } as any)} icon={Key} />
                                        <Input label="AWS Secret Access Key (IAM)" type="password" placeholder="Khoảng 40 ký tự..." value={(smtp as any).aws_secret_key} onChange={e => setSmtp({ ...smtp, aws_secret_key: e.target.value } as any)} icon={KeyRound} />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic px-2">
                                        *IAM Secret Key dùng để kết nối Dashboard Quota. Nó là chuỗi dài ~40 ký tự, KHÔNG PHẢI Mật khẩu SMTP ở trên.
                                    </p>
                                </div>

                                <div className="md:col-span-2 border-t border-slate-100 pt-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">3. Thông tin Người gửi (Hiển thị cho khách)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Tên người gửi (From Name)"
                                            placeholder="Vd: Đội ngũ Marketing"
                                            value={(smtp as any).smtp_from_name || ''}
                                            onChange={e => setSmtp({ ...smtp, smtp_from_name: e.target.value } as any)}
                                            icon={Users}
                                        />
                                        <Input
                                            label="Email gửi đi (Có thể nhập nhiều, cách nhau dấu phẩy)"
                                            placeholder="marketing@domain.com, sales@domain.com"
                                            value={(smtp as any).smtp_from_email || ''}
                                            onChange={e => setSmtp({ ...smtp, smtp_from_email: e.target.value } as any)}
                                            icon={Mail}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic px-2">
                                        *Lưu ý: Các "Email gửi đi" phải là email đã được xác thực (Verified) trên Amazon SES, cách nhau bằng dấu phẩy (,).<br/>
                                        <strong className="text-orange-500 font-bold">Email đầu tiên trong danh sách</strong> sẽ tự động trở thành <b>Email Mặc định (Default Fallback)</b> cho các kịch bản không chọn email.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl lg:rounded-[32px] p-5 lg:p-8 border-2 border-slate-100 shadow-xl relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 shadow-sm"><Users className="w-5 h-5 lg:w-6 lg:h-6" /></div>
                                <div>
                                    <h3 className="text-base lg:text-lg font-black text-slate-800">Email Kiểm tra Nội bộ (QA)</h3>
                                    <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Bản sao email sẽ gửi tới các địa chỉ này để giám sát.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-4">Danh sách Email (Mỗi email một dòng)</label>
                                    <textarea
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-sm focus:border-[#ffa900] focus:ring-0 outline-none transition-all min-h-[100px]"
                                        placeholder="admin@company.com&#10;qa@company.com"
                                        value={smtp.internal_qa_emails}
                                        onChange={e => setSmtp({ ...smtp, internal_qa_emails: e.target.value })}
                                    />
                                </div>
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 italic">
                                        Email QA sẽ được gắn tiêu đề và banner thông báo "Email kiểm tra" và không được đếm vào số liệu thống kê.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0f172a] rounded-2xl lg:rounded-[32px] p-5 lg:p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500"><Zap className="w-5 h-5 lg:w-6 lg:h-6" /></div>
                                <div>
                                    <h3 className="text-base lg:text-lg font-black">Automation Engine (Worker)</h3>
                                    <p className="text-[10px] lg:text-xs text-slate-400 font-medium tracking-tight">Trình điều khiển bộ máy gửi mail & xử lý kịch bản.</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center relative z-10">
                                <Button
                                    variant="primary"
                                    icon={Play}
                                    isLoading={isRunningEnrollment}
                                    onClick={handleRunEnrollmentWorker} // Calls the enrollment worker
                                    className="px-8 py-4 rounded-2xl bg-[#ffa900] hover:bg-[#ca7900] text-white font-black"
                                >
                                    CHẠY ENROLLMENT
                                </Button>
                                {/* Removed the "QUÉT SINH NHẬT" button */}
                            </div>

                            {engineResult && (
                                <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 overflow-x-auto whitespace-pre animate-in zoom-in-95 max-h-64 custom-scrollbar">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                        <History className="w-3 h-3" />
                                        <span className="uppercase font-black text-slate-500">Output Log</span>
                                        {/* New: Dropdown to select log file type */}
                                        <Select
                                            options={[
                                                { value: 'worker_enroll', label: 'Enrollment Worker' },
                                                { value: 'worker_flow', label: 'Flow Execution Worker' },
                                                { value: 'worker_priority', label: 'Priority Worker' },
                                                { value: 'webhook_debug', label: 'Webhook Debug' } // Added for webhook debug log
                                            ]}
                                            value={selectedWorkerLogType}
                                            onChange={(val) => refreshWorkerLog(val)}
                                            variant="ghost"
                                            className="ml-auto w-40 text-white/70"
                                            icon={Terminal}
                                        />
                                        <Button size="sm" icon={RefreshCcw} onClick={() => refreshWorkerLog(selectedWorkerLogType)} className="ml-2 bg-white/10 text-white hover:bg-white/20" />
                                    </div>
                                    {engineResult}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:rotate-45 transition-transform duration-1000" />
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-[#ffa900]" /> API Base URL</h3>
                            <input type="text" value={apiUrl} readOnly disabled className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-sm font-mono outline-none opacity-60 cursor-not-allowed" />
                            <p className="text-[10px] text-slate-400 mt-3 font-medium leading-relaxed italic">*Đường dẫn máy chủ chứa các file .php xử lý dữ liệu.</p>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'ai' && (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl lg:rounded-[32px] p-6 lg:p-10 border-2 border-amber-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600 opacity-5 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                        <div className="flex items-center gap-4 lg:gap-5 mb-8 lg:mb-10 relative z-10">
                            <div className="p-3 lg:p-4 bg-amber-50 rounded-2xl lg:rounded-3xl text-amber-600 shadow-sm ring-1 ring-amber-100">
                                <BrainCircuit className="w-6 h-6 lg:w-8 lg:h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Cấu hình Trí tuệ Nhân tạo</h3>
                                <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Quản lý API Key toàn cục cho AI.</p>
                            </div>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div> Google Gemini AI
                                    </h4>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                                    >
                                        Lấy API Key tại đây <ArrowRight className="w-3 h-3" />
                                    </a>
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        label="Gemini API Key"
                                        type="password"
                                        placeholder="Nhập API Key của bạn (vd: AIzaSy...)"
                                        value={smtp.gemini_api_key}
                                        onChange={e => setSmtp({ ...smtp, gemini_api_key: e.target.value })}
                                        icon={KeyRound}
                                        className="bg-white border-slate-200 focus:border-amber-600 h-14"
                                    />
                                    <div className="p-4 bg-white/50 rounded-2xl border border-slate-100 flex items-start gap-3">
                                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            API Key này sẽ được sử dụng chung cho các tính năng như: **AI Chatbot**, **Phân tích phân khúc Khách hàng**, **Tự động hóa hành trình** và các module AI chưa có cấu hình riêng.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl lg:rounded-[32px] p-6 lg:p-8 text-white shadow-lg shadow-amber-200 relative overflow-hidden">
                                <Sparkles className="absolute -bottom-6 -right-6 w-24 lg:w-32 h-24 lg:h-32 opacity-20" />
                                <h4 className="text-base lg:text-lg font-black mb-2 italic">Mô hình sử dụng</h4>
                                <p className="text-amber-100 text-[11px] lg:text-sm font-medium leading-relaxed opacity-90">
                                    Hệ thống hiện đang hỗ trợ tốt nhất cho phiên bản **Gemini 2.0 Flash**.
                                    Đảm bảo API Key của bạn có quyền truy cập vào các mô hình `gemini-2.0-flash-exp` hoặc `gemini-2.5-flash-lite`.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'logs' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 gap-4">
                        <h3 className="text-lg font-bold text-slate-800">Nhật ký thực thi gần nhất</h3>
                        <Button variant="secondary" icon={RefreshCcw} onClick={refreshLogs} size="sm" className="w-fit">Làm mới log</Button>
                    </div>
                    <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                        <table className="w-full text-[11px] lg:text-xs text-left min-w-[600px]">
                            <thead className="bg-slate-50 font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Người nhận</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Thời gian</th>
                                    <th className="px-6 py-4">Chi tiết lỗi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {deliveryLogs.map((l, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{l.recipient}</td>
                                        <td className="px-6 py-4">
                                            {l.status === 'success' ? <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span> : <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Failed</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{l.sent_at}</td>
                                        <td className="px-6 py-4 text-[10px] text-rose-500 font-black">{l.error_message || '--'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'health' && (
                <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl lg:rounded-[32px] p-5 lg:p-8 border-2 border-slate-100 shadow-xl overflow-hidden relative group">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 lg:mb-10">
                            <div className="flex items-center gap-4 lg:gap-5">
                                <div className="p-3 lg:p-4 bg-emerald-50 rounded-2xl lg:rounded-[24px] text-emerald-600 shadow-sm ring-1 ring-emerald-100"><ShieldCheck className="w-6 h-6 lg:w-8 lg:h-8" /></div>
                                <div>
                                    <h3 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">Kiểm tra sức khỏe</h3>
                                    <p className="text-[10px] lg:text-xs text-slate-500 font-medium">Xác minh Database, API và PHP Extensions.</p>
                                </div>
                            </div>
                            <Button
                                icon={isCheckingHealth ? Loader2 : RefreshCcw}
                                isLoading={isCheckingHealth}
                                onClick={handleCheckHealth}
                                size="lg"
                                className="bg-slate-900 hover:bg-black text-[#ffa900] w-full lg:w-auto lg:px-10 rounded-xl lg:rounded-[22px] font-black uppercase tracking-widest text-[10px] lg:text-xs h-12 lg:h-[60px] shadow-xl shadow-slate-200 active:scale-95 transition-all"
                            >
                                KIỂM TRA NGAY
                            </Button>
                        </div>

                        {healthResults ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* SYSTEM CHECKS */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Hạ tầng & Kết nối
                                    </h4>
                                    <div className="space-y-3">
                                        {healthResults.system_checks && Object.entries(healthResults.system_checks).map(([key, info]: [string, any]) => (
                                            <div key={key} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/item hover:bg-white hover:border-[#ffa900]/30 transition-all hover:shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-700 capitalize group-hover/item:text-[#ca7900] transition-colors">{key.replace('dir_', 'Folder ')}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">{info.message}</span>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${info.status === 'OK' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 animate-pulse'}`}>
                                                    {info.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* PHP EXTENSIONS */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> PHP Extensions
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {healthResults.php_extensions && Object.entries(healthResults.php_extensions).map(([key, info]: [string, any]) => (
                                            <div key={key} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/item hover:bg-white hover:border-[#ffa900]/30 transition-all hover:shadow-sm">
                                                <span className="text-xs font-black text-slate-700 font-mono group-hover/item:text-[#ca7900] transition-colors">{key}</span>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${info.status === 'OK' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                    {info.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* API FILES */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> File API (.php)
                                    </h4>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {healthResults.api_files && Object.entries(healthResults.api_files).map(([key, info]: [string, any]) => (
                                            <div key={key} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group/item hover:bg-white hover:border-[#ffa900]/30 transition-all">
                                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px] group-hover/item:text-slate-900 transition-colors">{key}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${info.status === 'OK' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-ping'}`}></span>
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${info.status === 'OK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {info.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                    <FlaskConical className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold text-sm">Chưa có dữ liệu kiểm tra. Vui lòng bấm "Kiểm tra ngay".</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <Terminal className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                            <div className="p-5 bg-white/10 rounded-3xl border border-white/10 shadow-inner">
                                <Info className="w-10 h-10 text-[#ffa900]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-3 italic">Cách thức kiểm tra</h3>
                                <p className="text-slate-400 text-sm font-medium leading-[1.8]">
                                    Hệ thống thực hiện quét Thời gian thực toàn bộ thư mục <b>/api/</b>, kiểm tra quyền ghi của folder <b>/uploads/</b> và <b>/logs/</b>,
                                    đồng thời xác minh kết nối cơ sở dữ liệu. Nếu bất kỳ file nào có Trạng thái <span className="text-rose-400 font-black italic">MISSING</span>,
                                    vui lòng liên hệ kỹ thuật để tải lên lại các file bị thiếu.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Settings;