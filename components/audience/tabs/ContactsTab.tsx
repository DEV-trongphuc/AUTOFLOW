

import React from 'react';
import { MoreHorizontal, Clock, MailOpen, MousePointer2, UserPlus, ChevronLeft, ChevronRight, Check, Zap, BadgeCheck, MessageCircle, Facebook } from 'lucide-react';
import Badge from '../../common/Badge';
import { Subscriber } from '../../../types';
import toast from 'react-hot-toast';
import ItemsPerPageSelector from '../ItemsPerPageSelector';
import BulkActionsToolbar from '../BulkActionsToolbar';
import Skeleton from '../../common/Skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ContactsTabProps {
    loading?: boolean;
    subscribers: Subscriber[];
    selectedIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onToggleSelectAll: () => void;
    onSelectSubscriber: (sub: Subscriber) => void;
    formatRelativeTime: (dateString?: string) => string;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onBulkDelete: (options?: { targetType: string, status?: string, tag?: string }) => void;
    onBulkTag: () => void;
    onBulkAddToList: () => void;
    isGlobalSelected: boolean;
    onToggleGlobalSelection: (val: boolean) => void;
    visibleColumns: string[];
    itemsPerPage: number;
    onItemsPerPageChange: (value: number) => void;
}

interface ContactRowProps {
    sub: Subscriber;
    isSelected: boolean;
    onToggle: (id: string, e: React.MouseEvent) => void;
    onSelect: (sub: Subscriber) => void;
    renderLastActive: (sub: Subscriber) => React.ReactNode;
    renderJoinedDate: (dateStr: string) => React.ReactNode;
    visibleColumns: string[];
    'data-index'?: number;
}

const ContactRow = React.memo(React.forwardRef<HTMLTableRowElement, ContactRowProps>(({
    sub, isSelected, onToggle, onSelect, renderLastActive, renderJoinedDate, visibleColumns, 'data-index': dataIndex
}, ref) => {
    const getCleanName = (name: any) => {
        if (!name || name === 0 || name === '0') return '';
        return String(name).trim();
    };
    const cleanFirstName = getCleanName(sub.firstName);
    const cleanLastName = getCleanName(sub.lastName);
    const fullName = `${cleanFirstName} ${cleanLastName}`.trim() || 'Unknown';
    const email = sub.email || '';
    const isVirtualEmail = email.includes('@no-email.domation') || email.includes('@zalo-oa.vn') || email.includes('@facebook.com');
    const isZalo = email.includes('@zalo-oa.vn');
    const isMeta = email.includes('@facebook.com') || (sub.meta_psid && sub.meta_psid !== '0');

    return (
        <tr
            ref={ref}
            data-index={dataIndex}
            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isSelected ? 'bg-orange-50/20' : ''}`}
            onClick={() => onSelect(sub)}
        >
            <td className="px-6 py-4 pl-8" onClick={(e) => onToggle(sub.id, e)}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }} // Handled by td onClick
                        className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]"
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className="relative">
                        {sub.avatar ? (
                            <img src={sub.avatar} alt={fullName} className="h-9 w-9 rounded-xl object-cover mr-3 border border-slate-200 shadow-sm" />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3 border border-slate-200 group-hover:from-[#fff4e0] group-hover:to-[#ffe8cc] group-hover:text-[#ca7900] transition-all shadow-sm">
                                {(cleanFirstName || '?')[0]}{(cleanLastName || '')[0]}
                            </div>
                        )}
                        {(Number(sub.verified) === 1) && (
                            <div className="absolute -bottom-1 -right-0 bg-white rounded-full p-[2px]">
                                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-[#ca7900] transition-colors flex items-center gap-1">
                            {fullName}
                            {(Number(sub.verified) === 1) && <span title="Verified"><BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-50" /></span>}
                            {sub.status === "customer" ? <span title="Customer"><BadgeCheck className="w-3.5 h-3.5 text-amber-600 fill-amber-50" /></span> : null}
                            {isMeta ? <span title="Facebook Messenger User"><Facebook className="w-3 h-3 text-blue-600" /></span> : null}
                            {isZalo ? <span title="Zalo Official Account User"><MessageCircle className="w-3 h-3 text-blue-500" /></span> : null}
                            {sub.chatCount && sub.chatCount > 0 ? (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold shrink-0" title="Conversations">
                                    <MessageCircle className="w-3 h-3" />
                                    {(sub.chatCount || 0).toLocaleString()}
                                </div>
                            ) : null}
                        </div>
                        {!visibleColumns.includes('email') && (
                            <div className="flex items-center justify-start">
                                {isVirtualEmail ? (
                                    <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-tighter text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                                        <div className="w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.4)]" />
                                        {isZalo ? 'Zalo' : (isMeta ? 'Meta' : 'Virtual')}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-medium text-slate-400">{sub.email}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </td>
            {visibleColumns.includes('email') && (
                <td className="px-6 py-4">
                    <div className="flex items-center justify-start">
                        {isVirtualEmail ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight text-slate-400 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/50">
                                <div className={`w-1.5 h-1.5 rounded-full ${isZalo ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]'}`} />
                                {isZalo ? 'Zalo Identity' : (isMeta ? 'Meta Identity' : 'Virtual Identity')}
                            </span>
                        ) : (
                            <span className="text-sm font-medium text-slate-600">{sub.email}</span>
                        )}
                    </div>
                </td>
            )}
            {visibleColumns.includes('phone') && (
                <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{sub.phoneNumber || '-'}</div>
                </td>
            )}
            {visibleColumns.includes('company') && (
                <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{sub.companyName || '-'}</div>
                </td>
            )}
            {visibleColumns.includes('status') && (
                <td className="px-6 py-4">
                    <Badge
                        variant={
                            sub.status === "active" ? "success" :
                                (sub.status === "unsubscribed" || sub.status === "bounced" || sub.status === "complained") ? "danger" :
                                    sub.status === "lead" ? "pink" :
                                        sub.status === "customer" ? "amber" : "neutral"
                        }
                    >
                        {sub.status}
                    </Badge>
                </td>
            )}
            {visibleColumns.includes('lastActivity') && (
                <td className="px-6 py-4">
                    {renderLastActive(sub)}
                </td>
            )}
            {visibleColumns.includes('leadScore') && (
                <td className="px-6 py-4 text-center">
                    {sub.leadScore && sub.leadScore > 0 ? (
                        <div className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold">
                            <Zap className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {(sub.leadScore || 0).toLocaleString()}
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-300">-</span>
                    )}
                </td>
            )}
            {visibleColumns.includes('tags') && (
                <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                        {(Array.isArray(sub.tags) ? sub.tags : []).slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">{tag}</span>
                        ))}
                        {(Array.isArray(sub.tags) ? sub.tags : []).length > 2 && <span className="text-[10px] text-slate-400 font-bold px-1">+{((Array.isArray(sub.tags) ? sub.tags : []).length - 2)}</span>}
                    </div>
                </td>
            )}
            {visibleColumns.includes('salesperson') && (
                <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{sub.salesperson || '-'}</div>
                </td>
            )}
            {visibleColumns.includes('joinedAt') && (
                <td className="px-6 py-4">
                    {renderJoinedDate(sub.joinedAt)}
                </td>
            )}
            <td className="px-6 py-4 text-right pr-8">
                <button type="button" className="text-slate-300 hover:text-[#ca7900] p-1.5 hover:bg-orange-50 rounded-lg transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </td>
        </tr>
    );
}));

const ContactSkeleton: React.FC<{ visibleColumns: string[] }> = ({ visibleColumns }) => (
    <tr>
        <td className="px-6 py-4 pl-8"><Skeleton variant="rounded" width={20} height={20} className="rounded" /></td>
        <td className="px-6 py-4">
            <div className="flex items-center">
                <Skeleton variant="rounded" width={36} height={36} className="rounded-xl mr-3" />
                <div className="space-y-2">
                    <Skeleton variant="text" width={120} height={16} />
                    <Skeleton variant="text" width={80} height={12} />
                </div>
            </div>
        </td>
        {visibleColumns.includes('email') && <td className="px-6 py-4"><Skeleton variant="text" width={150} /></td>}
        {visibleColumns.includes('phone') && <td className="px-6 py-4"><Skeleton variant="text" width={100} /></td>}
        {visibleColumns.includes('company') && <td className="px-6 py-4"><Skeleton variant="text" width={100} /></td>}
        {visibleColumns.includes('status') && <td className="px-6 py-4"><Skeleton variant="rounded" width={60} height={20} /></td>}
        {visibleColumns.includes('lastActivity') && <td className="px-6 py-4"><Skeleton variant="text" width={100} /></td>}
        {visibleColumns.includes('leadScore') && <td className="px-6 py-4"><div className="flex justify-center"><Skeleton variant="rounded" width={40} height={20} /></div></td>}
        {visibleColumns.includes('tags') && <td className="px-6 py-4"><div className="flex gap-1"><Skeleton variant="rounded" width={40} height={16} /><Skeleton variant="rounded" width={40} height={16} /></div></td>}
        {visibleColumns.includes('salesperson') && <td className="px-6 py-4"><Skeleton variant="text" width={100} /></td>}
        {visibleColumns.includes('joinedAt') && <td className="px-6 py-4"><Skeleton variant="text" width={80} /></td>}
        <td className="px-6 py-4 text-right pr-8"><Skeleton variant="circular" width={24} height={24} className="ml-auto" /></td>
    </tr>
);

const ContactsTab = React.memo<ContactsTabProps>(({
    loading, subscribers, selectedIds, onToggleSelection, onToggleSelectAll, onSelectSubscriber,
    formatRelativeTime, currentPage, totalPages, totalCount, onPageChange, onBulkDelete,
    onBulkTag, onBulkAddToList, isGlobalSelected, onToggleGlobalSelection, visibleColumns, itemsPerPage, onItemsPerPageChange
}) => {

    const currentPageIds = subscribers.map(s => s.id);
    const selectedOnPageCount = currentPageIds.filter(id => selectedIds.has(id)).length;
    const isAllPageSelected = currentPageIds.length > 0 && selectedOnPageCount === currentPageIds.length;

    const isValidDate = (d: Date) => d instanceof Date && !Number.isNaN(d.getTime());

    const parentRef = React.useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: subscribers.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76,
        overscan: 5,
    });
    const virtualItems = rowVirtualizer.getVirtualItems();

    // Stable rendering helpers
    const renderLastActive = React.useCallback((sub: Subscriber) => {
        const lastClickDate = sub.stats?.lastClickAt ? new Date(sub.stats.lastClickAt) : null;
        const lastOpenDate = sub.stats?.lastOpenAt ? new Date(sub.stats.lastOpenAt) : null;
        const joinedDate = sub.joinedAt ? new Date(sub.joinedAt) : null;
        const genericActivityDate = sub.lastActivityAt ? new Date(sub.lastActivityAt) : null;

        let latestActivity: { type: 'click' | 'open' | 'joined' | 'generic', date: Date } | null = null;
        if (lastClickDate && isValidDate(lastClickDate)) latestActivity = { type: 'click', date: lastClickDate };
        if (lastOpenDate && isValidDate(lastOpenDate)) {
            if (!latestActivity || lastOpenDate.getTime() > latestActivity.date.getTime()) latestActivity = { type: 'open', date: lastOpenDate };
        }
        if (genericActivityDate && isValidDate(genericActivityDate)) {
            // Only consider it generic activity if it's strictly > joinedDate by at least a fraction of difference 
            // Actually, we can just check if it's the most recent date compared to others
            const joinMs = (joinedDate && isValidDate(joinedDate)) ? joinedDate.getTime() : 0;
            if (genericActivityDate.getTime() > joinMs + 2000) { // 2s buffer for creation time drift
                if (!latestActivity || genericActivityDate.getTime() > latestActivity.date.getTime()) latestActivity = { type: 'generic', date: genericActivityDate };
            }
        }
        if (joinedDate && isValidDate(joinedDate)) {
            if (!latestActivity || joinedDate.getTime() > latestActivity.date.getTime()) latestActivity = { type: 'joined', date: joinedDate };
        }

        if (!latestActivity) return (
            <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <div className="flex flex-col">
                    <span className="text-[11px] font-medium">{"Ch\u01B0a t\u01B0\u01A1ng t\u00E1c"}</span>
                    <span className="text-[9px] opacity-70">{"g\u1EA7n \u0111\u00E2y"}</span>
                </div>
            </div>
        );

        const timeAgo = formatRelativeTime(latestActivity.date.toISOString());
        if (latestActivity.type === 'click') return (
            <div className="flex items-center gap-2 text-emerald-600">
                <MousePointer2 className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-bold">{"V\u1EEBa click link"}</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
        if (latestActivity.type === 'open') return (
            <div className="flex items-center gap-2 text-blue-600">
                <MailOpen className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-bold">{"\u0110\u00E3 m\u1EDF mail"}</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
        if (latestActivity.type === 'generic') return (
            <div className="flex items-center gap-2 text-indigo-600">
                <Zap className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-bold">{"T\u01B0\u01A1ng t\u00E1c h\u1EC7 th\u1ED1ng"}</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
        return (
            <div className="flex items-center gap-2 text-slate-600">
                <UserPlus className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-medium">{"Tham gia"}</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
    }, [formatRelativeTime]);

    const renderJoinedDate = React.useCallback((dateStr: string) => {
        if (!dateStr) return <span className="text-xs font-medium text-slate-400">--</span>;
        const d = new Date(dateStr);
        if (!isValidDate(d)) return <span className="text-xs font-medium text-slate-400">Invalid Date</span>;
        return <span className="text-xs font-medium text-slate-500">{d.toLocaleDateString('vi-VN')}</span>;
    }, []);

    const handleToggleOne = React.useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelection(id);
        if (isGlobalSelected) onToggleGlobalSelection(false);
    }, [onToggleSelection, isGlobalSelected, onToggleGlobalSelection]);

    return (
        <>
            <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[600px] min-h-[400px]">
                <table className="w-full relative">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-left sticky top-0 z-20 backdrop-blur-sm">
                        {selectedIds.size > 0 ? (
                            <BulkActionsToolbar
                                selectedIds={selectedIds}
                                subscribers={subscribers}
                                visibleColumnsCount={visibleColumns.length}
                                isGlobalSelected={isGlobalSelected}
                                onToggleSelectAll={onToggleSelectAll}
                                onBulkTag={onBulkTag}
                                onBulkAddToList={onBulkAddToList}
                                onBulkDelete={() => {
                                    if (isGlobalSelected) onBulkDelete({ targetType: 'all' });
                                    else onBulkDelete();
                                }}
                            />
                        ) : (
                            <tr>
                                <th className="px-6 py-4 w-10 pl-8">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" checked={isAllPageSelected} onChange={onToggleSelectAll} className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-[#ffa900] checked:bg-[#ffa900] hover:border-[#ffa900]" />
                                        <Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"T\u00EAn"}</th>
                                {visibleColumns.includes('email') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>}
                                {visibleColumns.includes('phone') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"S\u1ED1 \u0111i\u1EC7n tho\u1EA1i"}</th>}
                                {visibleColumns.includes('company') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"C\u00F4ng ty"}</th>}
                                {visibleColumns.includes('status') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"Tr\u1EA1ng th\u00E1i"}</th>}
                                {visibleColumns.includes('lastActivity') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"Ho\u1EA1t \u0111\u1ED9ng g\u1EA7n nh\u1EA5t"}</th>}
                                {visibleColumns.includes('leadScore') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{"\u0110i\u1EC3m Lead"}</th>}
                                {visibleColumns.includes('tags') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</th>}
                                {visibleColumns.includes('salesperson') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salesperson</th>}
                                {visibleColumns.includes('joinedAt') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{"Ng\u00E0y tham gia"}</th>}
                                <th className="px-6 py-4 text-right pr-8"></th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {isAllPageSelected && totalCount > subscribers.length && (
                            <tr className="bg-orange-50/50">
                                <td colSpan={visibleColumns.length + 2} className="px-6 py-2.5 text-center">
                                    {isGlobalSelected ? (
                                        <p className="text-xs font-medium text-slate-600">{"\u0110\u00E3 Ch\u1ECDn t\u1EA5t c\u1EA3"} <span className="font-bold text-orange-600">{(totalCount || 0).toLocaleString()}</span> {"li\u00EAn h\u1EC7."} <button type="button" onClick={() => onToggleGlobalSelection(false)} className="ml-2 text-blue-600 font-bold hover:underline">{"B\u1ECF ch\u1ECDn"}</button></p>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-600">{"\u0110\u00E3 ch\u1ECDn"} {subscribers.length} {"li\u00EAn h\u1EC7."} <button type="button" onClick={() => onToggleGlobalSelection(true)} className="ml-1 text-orange-600 font-bold hover:underline italic underline-offset-2">{"Ch\u1ECDn t\u1EA5t c\u1EA3"} {(totalCount || 0).toLocaleString()} {"li\u00EAn h\u1EC7?"}</button></p>
                                    )}
                                </td>
                            </tr>
                        )}
                        {loading ? (
                            Array.from({ length: 12 }).map((_, i) => (
                                <ContactSkeleton key={i} visibleColumns={visibleColumns} />
                            ))
                        ) : (
                            <>
                                {virtualItems.length > 0 && <tr style={{ height: virtualItems[0].start }} />}
                                {virtualItems.map((virtualRow) => {
                                    const sub = subscribers[virtualRow.index];
                                    return (
                                        <ContactRow
                                            key={sub.id}
                                            sub={sub}
                                            isSelected={selectedIds.has(sub.id)}
                                            onToggle={handleToggleOne}
                                            onSelect={onSelectSubscriber}
                                            renderLastActive={renderLastActive}
                                            renderJoinedDate={renderJoinedDate}
                                            visibleColumns={visibleColumns}
                                            ref={rowVirtualizer.measureElement}
                                            data-index={virtualRow.index}
                                        />
                                    );
                                })}
                                {virtualItems.length > 0 && <tr style={{ height: rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end }} />}
                            </>
                        )}
                        {!loading && subscribers.length === 0 && (
                            <tr><td colSpan={visibleColumns.length + 2} className="py-12 text-center text-slate-400 text-sm">{"Kh\u00F4ng t\u00ECm th\u1EA5y li\u00EAn h\u1EC7 n\u00E0o."}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <ItemsPerPageSelector
                        value={itemsPerPage}
                        onChange={onItemsPerPageChange}
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">{(currentPage || 1).toLocaleString()} / {(totalPages || 1).toLocaleString()}</span>

                        <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

        </>
    );
});


export default ContactsTab;
