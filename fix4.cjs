const fs = require('fs');

function fix(file, findStr, replaceStr) {
  if (!fs.existsSync(file)) return;
  let data = fs.readFileSync(file, 'utf8');
  const out = data.replace(findStr, replaceStr);
  if (data !== out) {
    fs.writeFileSync(file, out, 'utf8');
    console.log('Fixed', file);
  }
}

fix('components/audience/CleanupModal.tsx', /description="Đã Hủy đăng ký[\r\n]/g, 'description="Đã Hủy đăng ký"\n');
fix('components/campaigns/CampaignDetailDrawer.tsx', /\}, \[localCampaign\?\.id, isVisible, activeTab[\r\n]/g, '    }, [localCampaign?.id, isVisible, activeTab]);\n');
fix('components/flows/modals/FlowSummaryModal.tsx', /label="Hủy đăng ký[\r\n]/g, 'label="Hủy đăng ký"\n');
fix('components/ai/GlobalWorkspaceView.tsx', /toast\.loading\('Đang chờ\.\.\.'\);[\r\n]+/g, "toast.loading('Đang chờ...');\n");
fix('components/ai/GlobalWorkspaceView.tsx', /\|\| 'Tỉ lệ[\r\n]/g, "|| 'Tỉ lệ'\n");
fix('components/ai/GlobalWorkspaceView.tsx', /\|\| 'Tỉ lệ/g, "|| 'Tỉ lệ'"); // just in case

fix('pages/CategoryChat/components/GlobalWorkspaceView.tsx', /\|\| 'Tỉ lệ[\r\n]/g, "|| 'Tỉ lệ'\n");
fix('pages/CategoryChat/components/GlobalWorkspaceView.tsx', /\|\| 'Tỉ lệ/g, "|| 'Tỉ lệ'");

fix('components/flows/modals/StepErrorModal.tsx', /Tỉ lệ<\/span>[\r\n]/g, "Tỉ lệ\n");
fix('components/settings/ZaloTemplateModal.tsx', /Tỉ lệ<\/span>[\r\n]/g, "Tỉ lệ\n");

// FlowSettingsTab.tsx 243
fix('components/flows/tabs/FlowSettingsTab.tsx', /<p className="text-\[9px\] text-slate-400 font-medium">Tỉ lệ<\/span>/g, '<p className="text-[9px] text-slate-400 font-medium">Tỉ lệ</p>');

fix('pages/Flows.tsx', /'Kịch bản Đang chờ : '/g, "'Kịch bản Đang chờ' : '");
fix('pages/Flows.tsx', /'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ : '/g, "'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ' : '");

fix('components/flows/modals/StepParticipantsModal.tsx', /<button\s+onClick=\{\(\) => onTabChange\('waiting'\)\}\s+className=\{.*?\}\s*>\s*Đang chờ<\/button>\s*<\/button>/gm, `                        <button onClick={() => onTabChange('waiting')} className={\`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border \${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}\`}>Đang chờ</button>`);
