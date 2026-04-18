const fs = require('fs');

function fix(file, find, replace) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const out = content.replace(find, replace);
  if (content !== out) {
    fs.writeFileSync(file, out, 'utf8');
    console.log('Fixed:', file);
  }
}

// Fix StepParticipantsModal
fix('components/flows/modals/StepParticipantsModal.tsx',
  /<button onClick={\(\) => onTabChange\('waiting'\)} className={`px-3 py-1\.5 rounded-lg text-\[10px\] font-bold transition-all border \${activeTab === 'waiting' \? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}><\/button>/g,
  "<button onClick={() => onTabChange('waiting')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}`}>đang chạy</button>");

// Fix WebTracking.tsx
fix('pages/WebTracking.tsx', /tracking-widest ml-1">Thiết bị<\/span>/g, 'tracking-widest ml-1">Thiết bị</label>');

console.log('Phase 4 complete');
