const fs = require('fs');
let content = fs.readFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx', 'utf8');

const hFind = `<th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">\n                                                Khách hàng\n                                            </th>`;
const hRepl = `<th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">\n                                                Khách hàng\n                                            </th>\n                                            {['all_touched', 'report'].includes(activeTab) && (\n                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">\n                                                    Tên nhánh\n                                                </th>\n                                            )}`;

const cFind = `                                                    </div>\n                                                </td>\n\n                                                {/* Dedicated Action Column - hidden for failed tabs (error detail needs space) */}`;
const cRepl = `                                                    </div>\n                                                </td>\n\n                                                {['all_touched', 'report'].includes(activeTab) && (\n                                                    <td className="px-4 py-3">\n                                                        {p.branchName ? (\n                                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 bg-white text-slate-700">\n                                                                <GitMerge className="w-3 h-3 text-slate-400" />\n                                                                {p.branchName}\n                                                            </span>\n                                                        ) : (\n                                                            <span className="text-[10px] text-slate-400 italic">Chưa rẽ nhánh</span>\n                                                        )}\n                                                    </td>\n                                                )}\n\n                                                {/* Dedicated Action Column - hidden for failed tabs (error detail needs space) */}`;

// Also let's fix the classNames for branch cards
const bFind = `className={p-3 rounded-xl`;
const bRepl = `className={\`p-3 rounded-xl`;

content = content.replace(hFind, hRepl).replace(cFind, cRepl);

// For the cards, they have missing backticks:
content = content.replace(/className=\{p-3 rounded-xl border shadow-sm flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-200 \}/g, `className={\`p-3 rounded-xl border shadow-sm flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-200 \${activeBranchFilter === b.label ? 'bg-indigo-600 border-indigo-700 scale-105 shadow-md ring-2 ring-indigo-200' : 'bg-white border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50'}\`}`);

content = content.replace(/className=\{\text-\[11px\] font-bold uppercase tracking-wider mb-1 relative z-10 text-center truncate w-full px-2 transition-colors \}/g, `className={\`text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10 text-center truncate w-full px-2 transition-colors \${activeBranchFilter === b.label ? 'text-indigo-100' : 'text-slate-500 group-hover:text-indigo-700'}\`}`);

content = content.replace(/className=\{\text-xl font-black relative z-10 transition-colors \}/g, `className={\`text-xl font-black relative z-10 transition-colors \${activeBranchFilter === b.label ? 'text-white' : 'text-indigo-600'}\`}`);

// Fallback card
content = content.replace(/className=\{p-3 rounded-xl border shadow-sm flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-200 \}/g, `className={\`p-3 rounded-xl border shadow-sm flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-200 \${activeBranchFilter === 'Fallback' ? 'bg-slate-700 border-slate-800 scale-105 shadow-md ring-2 ring-slate-200' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}\`}`);
content = content.replace(/className=\{\text-\[11px\] font-bold uppercase tracking-wider mb-1 relative z-10 transition-colors \}/g, `className={\`text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10 transition-colors \${activeBranchFilter === 'Fallback' ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-700'}\`}`);
content = content.replace(/className=\{\text-xl font-black relative z-10 transition-colors \}/g, `className={\`text-xl font-black relative z-10 transition-colors \${activeBranchFilter === 'Fallback' ? 'text-white' : 'text-slate-700'}\`}`);


fs.writeFileSync('e:/AUTOFLOW/AUTOMATION_FLOW/components/flows/modals/StepParticipantsModal.tsx', content, 'utf8');
console.log('Fixed:', content.includes('Tên nhánh') ? 'YES' : 'NO');
