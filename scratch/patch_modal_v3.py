import sys

with open("components/vouchers/VoucherCampaignModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace imports
content = content.replace(
    "import { Gift, Plus, CalendarRange, Infinity as InfinityIcon, Tag, Hash, Box, CheckSquare, Square, Layout, Eye, X } from 'lucide-react';",
    "import { Gift, Plus, CalendarRange, Infinity as InfinityIcon, Tag, Hash, Box, CheckSquare, Square, Layout, Eye, X, AlertCircle } from 'lucide-react';"
)

# 2. Replace states
state_target = """    // New states for Template Visual Selection
    const [templates, setTemplates] = React.useState<Template[]>([]);
    const [showPicker, setShowPicker] = React.useState(false);
    const [previewData, setPreviewData] = React.useState<Template | null>(null);

    React.useEffect(() => {
        api.get<Template[]>('templates').then(res => {
            if (res.success) {
                const personalTemplates = res.data.filter(t => !t.id.startsWith('sys_'));
                setTemplates(personalTemplates);
            }
        });
    }, []);"""

state_replace = """    const [templates, setTemplates] = React.useState<Template[]>([]);
    const [showPicker, setShowPicker] = React.useState(false);
    const [previewData, setPreviewData] = React.useState<Template | null>(null);
    const [surveys, setSurveys] = React.useState<any[]>([]);
    const [forms, setForms] = React.useState<any[]>([]);
    
    // Initial load UI state for toggle
    const [uiMagnetMode, setUiMagnetMode] = React.useState<'survey' | 'form'>(initialData?.isClaimable ? 'form' : 'survey');

    const handleToggleMagnet = (mode: 'survey' | 'form') => {
        setUiMagnetMode(mode);
        setFormData(p => ({ ...p, isClaimable: mode === 'form' }));
    };

    React.useEffect(() => {
        api.get<Template[]>('templates').then(res => {
            if (res.success) {
                const personalTemplates = res.data.filter(t => !t.id.startsWith('sys_'));
                setTemplates(personalTemplates);
            }
        });
        api.get<any[]>('surveys').then(res => {
            if (res.success) setSurveys(res.data);
        });
        api.get<any[]>('forms').then(res => {
            if (res.success) setForms(res.data);
        });
    }, []);"""

content = content.replace(state_target, state_replace)

# 3. Replace the block
block_target = """                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-emerald-600" />
                                    Tính năng "Nhận Voucher qua Form Public"
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Tạo nhanh một form thu thập Data (Lead) trên Landing Page. Tự động gửi mã sau khi khách điền hoặc duyệt tay.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={!!formData.isClaimable}
                                    onChange={(e) => setFormData(p => ({ ...p, isClaimable: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[100%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 hover:bg-slate-300 peer-checked:hover:bg-emerald-600"></div>
                            </label>
                        </div>
                        {formData.isClaimable && (
                            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in fade-in space-y-4">
                                <div 
                                    className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100/50 cursor-pointer select-none mb-3"
                                    onClick={() => setFormData(p => ({ ...p, claimApprovalRequired: !p.claimApprovalRequired }))}
                                >
                                    <div>
                                        <span className="text-sm font-bold text-slate-700">Duyệt cấp mã bằng tay</span>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Nếu Bật, bạn cần duyệt qua form trước khi hệ thống tự động gửi Mã đi.</p>
                                    </div>
                                    <div className="flex shrink-0">
                                        {formData.claimApprovalRequired ? (
                                            <CheckSquare className="w-6 h-6 text-emerald-500" />
                                        ) : (
                                            <Square className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Mẫu Email gửi mã ưu đãi</label>
                                    
                                    {(() => {
                                        const selectedTemplate = templates.find(t => t.id === formData.claimEmailTemplateId);
                                        return selectedTemplate ? (
                                            <div className="group relative rounded-2xl border-2 border-emerald-200 hover:border-emerald-500 transition-all overflow-hidden bg-white shadow-sm hover:shadow-md">
                                                <div className="aspect-[21/9] bg-slate-50 relative overflow-hidden">
                                                    {selectedTemplate.htmlContent ? (
                                                        <iframe
                                                            srcDoc={selectedTemplate.htmlContent}
                                                            className="w-full h-full pointer-events-none scale-[0.5] origin-top-left"
                                                            style={{ width: '200%', height: '200%' }}
                                                            sandbox="allow-same-origin"
                                                        />
                                                    ) : (
                                                        <img src={selectedTemplate.thumbnail} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={selectedTemplate.name} />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                                                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                                                        <div className="min-w-0 pr-2">
                                                            <h4 className="font-bold text-white text-sm truncate drop-shadow-md">{selectedTemplate.name}</h4>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => setShowPicker(true)} className="px-2 py-1.5 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-lg text-[10px] font-bold uppercase transition-colors whitespace-nowrap">Đổi</button>
                                                            <button onClick={() => setPreviewData(selectedTemplate)} className="px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-colors whitespace-nowrap">
                                                                <Eye className="w-3 h-3" /> Xem
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowPicker(true)}
                                                className="w-full py-8 border-2 border-dashed border-emerald-200 rounded-2xl bg-white text-emerald-600 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 transition-all group"
                                            >
                                                <div className="p-2 bg-emerald-100 rounded-xl group-hover:scale-110 transition-transform"><Layout className="w-5 h-5" /></div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Chọn Mẫu (Visual)</span>
                                            </button>
                                        );
                                    })()}
                                    <p className="text-[10px] items-center text-slate-500 mt-1.5 flex gap-1 italic">
                                        <Plus className="w-3 h-3"/> Mẫu cần chứa trường {"{{short_code}}"} để tự động áp dụng mã.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>"""

block_replace = """                    <div className="space-y-6 pb-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-2 mt-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                    <Gift className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Tích hợp Thu thập Data (Lead Magnet)</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Gắn mã Voucher vào các biểu mẫu để tặng thưởng khi khách để lại thông tin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Option 1: Survey (Recommended) */}
                            <div className={`p-4 border-2 transition-all rounded-2xl cursor-pointer relative overflow-hidden group flex flex-col ${uiMagnetMode === 'survey' ? 'border-purple-400 bg-purple-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-200'}`}
                                 onClick={() => handleToggleMagnet('survey')}>
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-indigo-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl z-10 shadow-sm">
                                    Khuyên Dùng
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className={`font-bold flex items-center gap-2 ${uiMagnetMode === 'survey' ? 'text-purple-800' : 'text-slate-600'}`}>
                                        <Layout className="w-4 h-4" /> Form Khảo Sát
                                    </h5>
                                    <label className="relative inline-flex items-center pointer-events-none">
                                        <input type="checkbox" className="sr-only peer" checked={uiMagnetMode === 'survey'} readOnly />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[100%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                                    </label>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed flex-1">
                                    Sử dụng Trình tạo Khảo sát để thu thập mọi trường dữ liệu (Checkbox, Rating, Text). Thiết kế giao diện chuyên nghiệp và <strong className="text-purple-700">tặng đúng món quà theo câu trả lời của khách</strong>.
                                </p>
                                
                                {uiMagnetMode === 'survey' && (() => {
                                    const relatedSurveys = surveys.filter(s => s.settings_json?.voucher_config?.campaign_id === formData.id);
                                    return (
                                        <div className="mt-auto space-y-2 pt-3 border-t border-purple-200/50 animate-in fade-in">
                                            {relatedSurveys.length > 0 ? (
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest block">Đang dùng trong {relatedSurveys.length} Khảo sát:</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {relatedSurveys.map(s => (
                                                            <a key={s.id} href={`/#/surveys/${s.id}/edit`} target="_blank" rel="noreferrer" className="text-[10px] bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded-md shadow-sm hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                                <CheckSquare className="w-3 h-3 text-emerald-500" /> {s.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-500 italic flex items-center gap-1 mb-2">
                                                    <AlertCircle className="w-3 h-3" /> Chưa có khảo sát nào dùng mã này.
                                                </div>
                                            )}
                                            <a href="/#/surveys" className="text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm px-4 py-2 rounded-xl inline-flex items-center justify-center transition-all w-full mt-2" onClick={e => e.stopPropagation()}>
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Đi tới Khảo sát 
                                            </a>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Option 2: Basic Form */}
                            <div className={`p-4 border-2 transition-all rounded-2xl cursor-pointer flex flex-col ${uiMagnetMode === 'form' ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                                 onClick={() => handleToggleMagnet('form')}>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className={`font-bold flex items-center gap-2 ${uiMagnetMode === 'form' ? 'text-emerald-800' : 'text-slate-600'}`}>
                                        <Square className="w-4 h-4" /> Form Cơ Bản (Classic)
                                    </h5>
                                    <label className="relative inline-flex items-center pointer-events-none">
                                        <input type="checkbox" className="sr-only peer" checked={uiMagnetMode === 'form'} readOnly />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[100%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed flex-1">
                                    Kết nối Voucher này với một Biểu mẫu (Form) có sẵn của bạn. Khách điền Form xong sẽ tự động nhận mã qua Email.
                                </p>

                                {uiMagnetMode === 'form' && (
                                    <div className="space-y-4 mt-auto pt-4 border-t border-emerald-200/50 animate-in fade-in" onClick={e => e.stopPropagation()}>
                                        <div 
                                            className="flex items-start gap-3 bg-white hover:bg-slate-50 p-3 rounded-xl border border-emerald-100 cursor-pointer select-none transition-all"
                                            onClick={(e) => { e.stopPropagation(); setFormData(p => ({ ...p, claimApprovalRequired: !p.claimApprovalRequired })) }}
                                        >
                                            <div className="flex shrink-0 mt-0.5">
                                                {formData.claimApprovalRequired ? (
                                                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-slate-800">Cần phê duyệt thủ công</span>
                                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                                    Mã ưu đãi chỉ được gửi đi sau khi bạn vào bảng điều khiển ấn "Phê duyệt". Rất hữu ích để lọc danh sách thật/giả.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                                Liên kết với Form nào?
                                            </label>
                                            {forms.length > 0 ? (
                                                <Select
                                                    value={formData.claimTargetFormId || ''}
                                                    onChange={val => setFormData(p => ({ ...p, claimTargetFormId: val }))}
                                                    options={[
                                                        { value: '', label: 'Chưa chọn Biểu mẫu (Form) nào' },
                                                        ...forms.map(f => ({ value: f.id, label: f.name }))
                                                    ]}
                                                />
                                            ) : (
                                                <div className="bg-white border border-rose-200 rounded-xl p-3">
                                                    <p className="text-[11px] text-slate-600 mb-2">Bạn chưa có Biểu mẫu (Form) nào.</p>
                                                    <a href="/#/forms" target="_blank" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">
                                                        + Tạo Biểu mẫu ngay
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 block">
                                                Mẫu Email thông báo tặng mã
                                            </label>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                                Ngay khi đủ điều kiện, hệ thống sẽ chèn tự động mã vào Mẫu Email này và gửi đi.
                                            </p>
                                            
                                            {(() => {
                                                const selectedTemplate = templates.find(t => t.id === formData.claimEmailTemplateId);
                                                return selectedTemplate ? (
                                                    <div className="group relative rounded-xl border-2 border-emerald-200 hover:border-emerald-500 transition-all overflow-hidden bg-white shadow-sm hover:shadow-md">
                                                        <div className="aspect-[21/9] bg-slate-50 relative overflow-hidden">
                                                            {selectedTemplate.htmlContent ? (
                                                                <iframe
                                                                    srcDoc={selectedTemplate.htmlContent}
                                                                    className="w-full h-full pointer-events-none scale-[0.5] origin-top-left"
                                                                    style={{ width: '200%', height: '200%' }}
                                                                    sandbox="allow-same-origin"
                                                                />
                                                            ) : (
                                                                <img src={selectedTemplate.thumbnail} className="w-full h-full object-cover" alt={selectedTemplate.name} />
                                                            )}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                                            <div className="absolute bottom-3 left-3 flex gap-2">
                                                                <button onClick={(e) => { e.preventDefault(); setShowPicker(true); }} className="px-2 py-1 bg-white/20 backdrop-blur-md text-white rounded text-[9px] font-bold uppercase hover:bg-white/40">Đổi</button>
                                                                <button onClick={(e) => { e.preventDefault(); setPreviewData(selectedTemplate); }} className="px-2 py-1 bg-emerald-500 text-white rounded text-[9px] font-bold uppercase hover:bg-emerald-600 flex items-center gap-1">
                                                                    <Eye className="w-3 h-3" /> Xem
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); setShowPicker(true); }}
                                                        className="w-full py-5 border-2 border-dashed border-emerald-200 rounded-xl bg-white text-emerald-600 flex flex-col items-center justify-center gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 transition-all group"
                                                    >
                                                        <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:scale-110 transition-transform"><Layout className="w-4 h-4" /></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Chọn Mẫu (Visual)</span>
                                                    </button>
                                                );
                                            })()}
                                            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-emerald-700 leading-relaxed font-medium">
                                                    Mẫu cần chứa biến <strong className="text-emerald-800">{"{{short_code}}"}</strong> để tự động áp dụng mã.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>"""

content = content.replace(block_target, block_replace)

if block_target in f.read() if f.closed else False:
    print("WARNING: the target was not replaced!")

with open("components/vouchers/VoucherCampaignModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")
