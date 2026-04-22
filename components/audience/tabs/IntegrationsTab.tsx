
import React, { useState } from 'react';
import { RefreshCw, Trash2, Edit3, Loader2, Database, AlertCircle, Play, Eraser, Scissors } from 'lucide-react';
import Card from '../../common/Card';
import Button from '../../common/Button';

interface IntegrationsTabProps {
    integrations: any[];
    onEdit: (integration: any) => void;
    onDelete: (id: string) => void;
    onSyncNow: (id: string) => void;
    onView: (integration: any) => void;
    onCleanup: (integration: any) => void;
    onSplit?: (integration: any) => void;
    lists: any[]; // Pass all lists to lookup count
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({ integrations, onEdit, onDelete, onSyncNow, onView, onCleanup, onSplit, lists }) => {
    return (
        <Card noPadding className="border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-left">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">{"T\u00EAn k\u1EBFt n\u1ED1i"}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"Tr\u1EA1ng th\u00E1i"}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"\u0110\u1ED3ng b\u1ED9 l\u1EA7n cu\u1ED1i"}</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{"Th\u00E0nh vi\u00EAn"}</th>
                            <th className="px-6 py-4 w-36 text-right pr-6">{"Thao t\u00E1c"}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {integrations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Database className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">{"Ch\u01B0a c\u00F3 k\u1EBFt n\u1ED1i n\u00E0o."}</p>
                                    <p className="text-xs text-slate-400 mt-1">{"B\u1EA5m \"Connect App\" \u0111\u1EC3 th\u00EAm k\u1EBFt n\u1ED1i m\u1EDBi."}</p>
                                </td>
                            </tr>
                        ) : (
                            integrations.map((item) => {
                                const config = JSON.parse(item.config || '{}');
                                return (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => onView(item)}>
                                        <td className="px-6 py-5 pl-6">
                                            <div className="flex items-center gap-3">
                                                {item.type === 'google_sheets' ? (
                                                    <img src="https://mailmeteor.com/logos/assets/PNG/Google_Sheets_Logo_512px.png" className="w-8 h-8 object-contain" alt="Google Sheets" />
                                                ) : item.type === 'misa' ? (
                                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlIpztniIEN5ZYvLlwwqBvhzdodvu2NfPSbg&s" className="w-8 h-8 object-contain rounded" alt="MISA CRM" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Database className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {item.name.replace(/^(Google Sheets|MISA CRM)\s*-\s*/i, '')}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {item.type === 'google_sheets' ? 'Google Sheets' : item.type === 'misa' ? 'MISA CRM' : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {item.sync_status === 'syncing' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    {"\u0110\u00E3ng \u0111\u1ED3ng b\u1ED9"}
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${item.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-500 border-rose-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></span>
                                                    {item.status === 'active' ? 'Active' : 'Disconnected'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                                {item.last_sync_at ? new Date(item.last_sync_at).toLocaleString('vi-VN') : 'Ch\u01B0a \u0111\u1ED3ng b\u1ED9'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold text-slate-700">
                                            <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">
                                                {(() => {
                                                    const targetList = lists.find(l => l.id == config.targetListId);
                                                    return targetList ? (targetList.count || 0).toLocaleString() : '0';
                                                })()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSyncNow(item.id); }}
                                                    disabled={item.sync_status === 'syncing'}
                                                    className={`px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${item.sync_status === 'syncing'
                                                        ? 'text-blue-600 bg-blue-50 border border-blue-100'
                                                        : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent'
                                                        }`}
                                                    title={item.sync_status === 'syncing' ? '{"\u0110\u00E3ng \u0111\u1ED3ng b\u1ED9..."}' : '{"Ch\u1EA1y \u0111\u1ED3ng b\u1ED9 ngay (Sync Now)"}'}
                                                >
                                                    {item.sync_status === 'syncing' ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="text-[10px] font-bold whitespace-nowrap">Đang đồng bộ...</span>
                                                        </>
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onCleanup(item); }}
                                                    className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-all"
                                                    title='{"D\u1ECDn d\u1EB9p danh s\u00E1ch"}'
                                                >
                                                    <Eraser className="w-4 h-4" />
                                                </button>
                                                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                    title='{"C\u1EA5u h\u00ECnh"}'
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                                                    title='{"X\u00F3a k\u1EBFt n\u1ED1i"}'
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </Card >
    );
};

export default IntegrationsTab;
