

import React, { useState } from 'react';
import { Trash2, Save, Sparkles, Beaker, AlertCircle } from 'lucide-react';
import { FlowStep, Flow } from '../../../types';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import EmailActionConfig from '../config/EmailActionConfig';
import TriggerConfig from '../config/TriggerConfig';
import WaitConfig from '../config/WaitConfig';
import ConditionConfig from '../config/ConditionConfig';
import UpdateTagConfig from '../config/UpdateTagConfig';
import LinkFlowConfig from '../config/LinkFlowConfig';
import RemoveActionConfig from '../config/RemoveActionConfig';
import ListActionConfig from '../config/ListActionConfig'; // Import New Component
import AdvancedConditionConfig from '../config/AdvancedConditionConfig';
import ZaloZNSStepConfig from '../config/ZaloZNSStepConfig';
import Input from '../../common/Input';

const SplitTestConfig = ({ config, onChange, disabled }: any) => {
  const handleRatioChange = (val: string, isA: boolean) => {
    if (disabled) return;
    let v = parseInt(val);
    if (isNaN(v)) v = 50;
    if (v < 1) v = 1;
    if (v > 99) v = 99;

    if (isA) {
      onChange({ ...config, ratioA: v, ratioB: 100 - v });
    } else {
      onChange({ ...config, ratioB: v, ratioA: 100 - v });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-violet-50 text-violet-700 rounded-2xl border border-violet-100 flex gap-4">
        <Beaker className="w-6 h-6 shrink-0" />
        <p className="text-xs font-bold leading-relaxed">Phân chia lưu lượng Khách hàng ngẫu nhiên để thử nghiệm 2 kịch bản khác nhau.</p>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400">Tỷ lệ nhánh A (%)</label>
          <input
            type="number"
            value={config.ratioA || 50}
            onChange={(e) => handleRatioChange(e.target.value, true)}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl text-violet-600 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400">Tỷ lệ nhánh B (%)</label>
          <input
            type="number"
            value={config.ratioB || 50}
            onChange={(e) => handleRatioChange(e.target.value, false)}
            className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-xl text-slate-400 outline-none focus:ring-2 focus:ring-violet-200 transition-all"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

interface StepEditorProps {
  step: FlowStep | null;
  onClose: () => void;
  onSave: (updatedStep: FlowStep) => void;
  onDelete: (id: string) => void;
  onUpdateFlow?: (config: any) => void;
  currentFlowId?: string;
  flow?: Flow;
  allFlows?: Flow[];
  validationErrors?: any[];
  isFlowArchived?: boolean; // Keep this to disable for archived flows
}

const StepEditor: React.FC<StepEditorProps> = ({ step, onClose, onSave, onDelete, onUpdateFlow, currentFlowId, flow, allFlows = [], validationErrors = [], isFlowArchived }) => {
  const [localStep, setLocalStep] = useState<FlowStep | null>(step);
  const [showActiveWarning, setShowActiveWarning] = useState(false);

  React.useEffect(() => { setLocalStep(step); }, [step]);

  if (!localStep) return null;

  const handleConfigChange = (newConfig: any, newLabel?: string) => {
    // A Flow being archived means no changes can be made.
    if (isFlowArchived) return;
    setLocalStep(prev => {
      if (!prev) return null;
      const updated = { ...prev, config: newConfig };
      if (newLabel) updated.label = newLabel;
      return updated;
    });
  };

  let stepErrors = validationErrors.filter(e => e.stepId === localStep.id);

  // Auto-hide validation errors if they are fixed locally before saving
  if (localStep.type === 'action') {
    if (localStep.config.subject) stepErrors = stepErrors.filter(e => !e.msg.includes('tiêu đề'));
    if (localStep.config.templateId || localStep.config.customHtml) stepErrors = stepErrors.filter(e => !e.msg.includes('nội dung'));
    if (localStep.config.senderEmail) stepErrors = stepErrors.filter(e => !e.msg.includes('người gửi'));
  } else if (localStep.type === 'zalo_zns') {
    if (localStep.config.template_id) stepErrors = stepErrors.filter(e => !e.msg.includes('Template'));
    if (localStep.config.zalo_oa_id) stepErrors = stepErrors.filter(e => !e.msg.includes('OA'));
    if (localStep.config.senderEmail) stepErrors = stepErrors.filter(e => !e.msg.includes('nguồn Zalo') && !e.msg.includes('nguồn Email'));
  } else if (localStep.type === 'update_tag') {
    if (localStep.config.tags && localStep.config.tags.length > 0) stepErrors = stepErrors.filter(e => !e.msg.includes('Tags'));
  }

  // Logic: Nếu Flow đã có người tham gia (enrolled > 0) VÀ đây là bước Trigger,
  // không cho sửa Trigger để bảo toàn dữ liệu.
  const hasEnrollment = (flow?.stats?.enrolled || 0) > 0;
  const isTriggerLocked = localStep.type === 'trigger' && hasEnrollment;

  // Determine if all controls in this editor should be disabled.
  // Disabled if flow is archived OR if it's the trigger and it's locked.
  const isDisabledForEditing = isFlowArchived || isTriggerLocked;

  const renderConfig = () => {
    switch (localStep.type) {
      case 'trigger': return <TriggerConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} locked={isTriggerLocked} allFlows={allFlows} currentFlowId={flow?.id} />;
      case 'action': return <EmailActionConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} />;
      case 'wait': return <WaitConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} />;
      case 'condition': return <ConditionConfig config={localStep.config} onChange={handleConfigChange} flow={flow} stepId={localStep.id} disabled={isDisabledForEditing} />;
      case 'split_test': return <SplitTestConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} />;
      case 'update_tag': return <UpdateTagConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} allFlows={allFlows} currentFlowId={flow?.id} />;
      case 'list_action': return <ListActionConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} />;
      case 'link_flow': return <LinkFlowConfig config={localStep.config} onChange={handleConfigChange} currentFlowId={flow?.id || ''} disabled={isDisabledForEditing} />;
      case 'advanced_condition': return <AdvancedConditionConfig config={localStep.config} onChange={handleConfigChange} flow={flow} stepId={localStep.id} disabled={isDisabledForEditing} />;
      case 'remove_action': return <RemoveActionConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} />;
      case 'zalo_zns': return <ZaloZNSStepConfig config={localStep.config} onChange={handleConfigChange} disabled={isDisabledForEditing} flow={flow} onUpdateFlow={onUpdateFlow} />;
      default: return null;
    }
  };

  const isTrigger = localStep.type === 'trigger';

  const getHeaderGradient = () => {
    switch (localStep.type) {
      case 'trigger': return 'from-slate-800 to-slate-950';
      case 'action': return 'from-blue-50 to-indigo-50'; // Background lighter for better text readability inside nodes, but here it's for header
      case 'update_tag': return 'from-emerald-500 to-emerald-700';
      case 'list_action': return 'from-orange-500 to-orange-700';
      case 'wait': return 'from-amber-400 to-amber-600';
      case 'condition': return 'from-indigo-500 to-indigo-700';
      case 'split_test': return 'from-violet-500 to-violet-700';
      case 'link_flow': return 'from-slate-700 to-slate-900';
      case 'remove_action': return 'from-rose-500 to-rose-700';
      case 'advanced_condition': return 'from-violet-600 to-fuchsia-600';
      case 'zalo_zns': return 'from-blue-500 to-blue-700';
      default: return 'from-slate-800 to-slate-950';
    }
  };

  // Fixed colors for action step header
  const getHeaderStyle = () => {
    if (localStep.type === 'action') return 'from-blue-600 to-indigo-700';
    return getHeaderGradient();
  }

  const getModalSize = () => {
    if (localStep.type === 'advanced_condition') return 'xl';
    return 'lg';
  };

  return (
    <>
      <Modal
        isOpen={!!step}
        onClose={onClose}
        title={isTrigger ? "Bắt đầu quy trình" : "Cấu hình bước"}
        size={getModalSize()}
        footer={
          // Footer should be hidden if disabled for editing (archived or locked trigger)
          !isDisabledForEditing && (
            <div className="flex justify-between w-full items-center">
              <div>
                {!isTrigger && (
                  <Button variant="danger" size="md" icon={Trash2} onClick={() => {
                    if (flow?.status === 'active') {
                      setShowActiveWarning(true);
                      return;
                    }
                    onDelete(localStep.id);
                  }}>
                    Xóa bước
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" size="md" onClick={onClose}>Hủy</Button>
                <Button size="md" icon={Save} onClick={() => onSave(localStep)} disabled={isTriggerLocked}>Lưu thay đổi</Button>
              </div>
            </div>
          )
        }
      >
        <div className="space-y-6">
          <div className={`relative p-8 rounded-[32px] text-white shadow-2xl overflow-hidden bg-gradient-to-br ${getHeaderStyle()}`}>
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Sparkles className="w-40 h-40" /></div>
            <div className="relative z-10">
              <input
                className="text-2xl font-black bg-transparent border-none outline-none w-full placeholder:text-white/20 focus:ring-0 p-0 tracking-tight"
                placeholder="Tên gợi nhớ..."
                value={localStep.label}
                onChange={(e) => setLocalStep({ ...localStep, label: e.target.value })}
                disabled={isDisabledForEditing} // Disable if flow archived OR trigger locked
              />
              <p className="text-[10px] font-black uppercase text-white/40 mt-3 tracking-[0.3em]">{localStep.type.replace('_', ' ')}</p>
            </div>
          </div>

          {stepErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 animate-in fade-in zoom-in-95">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="space-y-1">
                {stepErrors.map((e, i) => <p key={i} className="text-xs font-bold text-rose-700">{e.msg}</p>)}
              </div>
            </div>
          )}

          <div className="px-1 pt-2">
            {renderConfig()}
          </div>
        </div>
      </Modal>

      {/* ACTIVE FLOW WARNING MODAL */}
      {showActiveWarning && (
        <Modal
          isOpen={true}
          onClose={() => setShowActiveWarning(false)}
          title="KHÔNG THỂ XÓA BƯỚC"
          size="sm"
          footer={<Button onClick={() => setShowActiveWarning(false)} size="md">Đã hiểu</Button>}
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-sm font-medium leading-relaxed">
                Flow này đang chạy (Active). Để đảm bảo tính toàn vẹn dữ liệu cho các liên hệ đang chạy trong luồng, bạn <b>không thể xóa bước</b> khi Flow đang hoạt động.
              </p>
            </div>
            <p className="text-xs text-slate-500 text-center font-bold">
              Vui lòng <span className="text-rose-600 uppercase">Tạm dừng (Pause)</span> Flow trước khi thực hiện hành động này.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};

export default StepEditor;