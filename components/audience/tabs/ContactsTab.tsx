

import React, { useState } from 'react';
import { MoreHorizontal, Clock, MailOpen, MousePointer2, User, UserPlus, Calendar, Trash2, X, ChevronLeft, ChevronRight, Copy, Download, Mail, Check, Zap, BadgeCheck, Tag, List, MessageCircle } from 'lucide-react';
import Badge from '../../common/Badge';
import { Subscriber } from '../../../types';
import Button from '../../common/Button';
import toast from 'react-hot-toast';
import ItemsPerPageSelector from '../ItemsPerPageSelector';
import BulkActionsToolbar from '../BulkActionsToolbar';
import Skeleton from '../../common/Skeleton';

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
}

const ContactRow = React.memo<ContactRowProps>(({
    sub, isSelected, onToggle, onSelect, renderLastActive, renderJoinedDate, visibleColumns
}) => {
    return (
        <tr
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
                            <img src={sub.avatar} alt="Avatar" className="h-9 w-9 rounded-xl object-cover mr-3 border border-slate-200 shadow-sm" />
                        ) : (
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3 border border-slate-200 group-hover:from-[#fff4e0] group-hover:to-[#ffe8cc] group-hover:text-[#ca7900] transition-all shadow-sm">
                                {(sub.firstName || '?')[0]}{(sub.lastName || '')[0]}
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
                            {sub.firstName} {sub.lastName}
                            {(Number(sub.verified) === 1) && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-50" title="Verified" />}
                            {sub.status === "customer" && <BadgeCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-50" title="Customer" />}
                            {sub.meta_psid && <BadgeCheck className="w-3.5 h-3.5 text-blue-600 fill-blue-100" title="Facebook Messenger Verified" />}
                            {((sub as any).chatCount > 0) && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold shrink-0" title="Conversations">
                                    <MessageCircle className="w-3 h-3" />
                                    {((sub as any).chatCount || 0).toLocaleString()}
                                </div>
                            )}
                        </div>
                        {!visibleColumns.includes('email') && (
                            <div className="text-[11px] font-medium text-slate-400">{sub.email}</div>
                        )}
                    </div>
                </div>
            </td>
            {visibleColumns.includes('email') && (
                <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-600">{sub.email}</div>
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
                                (sub.status === "unsubscribed" || sub.status === "unsub" || sub.status === "bounced" || sub.status === "complained") ? "danger" :
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
                            {sub.leadScore.toLocaleString()}
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
            {visibleColumns.includes('joinedAt') && (
                <td className="px-6 py-4">
                    {renderJoinedDate(sub.joinedAt)}
                </td>
            )}
            <td className="px-6 py-4 text-right pr-8">
                <button className="text-slate-300 hover:text-[#ca7900] p-1.5 hover:bg-orange-50 rounded-lg transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </td>
        </tr>
    );
});

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
        {visibleColumns.includes('joinedAt') && <td className="px-6 py-4"><Skeleton variant="text" width={80} /></td>}
        <td className="px-6 py-4 text-right pr-8"><Skeleton variant="circular" width={24} height={24} className="ml-auto" /></td>
    </tr>
);

const ContactsTab = React.memo<ContactsTabProps>(({
    loading, subscribers, selectedIds, onToggleSelection, onToggleSelectAll, onSelectSubscriber,
    formatRelativeTime, currentPage, totalPages, totalCount, onPageChange, onBulkDelete,
    onBulkTag, onBulkAddToList, isGlobalSelected, onToggleGlobalSelection, visibleColumns, itemsPerPage, onItemsPerPageChange
}) => {

    // Calculate how many on current page are selected
    const currentPageIds = subscribers.map(s => s.id);
    const selectedOnPageCount = currentPageIds.filter(id => selectedIds.has(id)).length;
    const isAllPageSelected = currentPageIds.length > 0 && selectedOnPageCount === currentPageIds.length;

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else toast(message);
    };

    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

    // Stable rendering helpers
    const renderLastActive = React.useCallback((sub: Subscriber) => {
        const lastClickDate = sub.stats?.lastClickAt ? new Date(sub.stats.lastClickAt) : null;
        const lastOpenDate = sub.stats?.lastOpenAt ? new Date(sub.stats.lastOpenAt) : null;
        const joinedDate = sub.joinedAt ? new Date(sub.joinedAt) : null;

        let latestActivity: { type: 'click' | 'open' | 'joined', date: Date } | null = null;
        if (lastClickDate && isValidDate(lastClickDate)) latestActivity = { type: 'click', date: lastClickDate };
        if (lastOpenDate && isValidDate(lastOpenDate)) {
            if (!latestActivity || lastOpenDate.getTime() > latestActivity.date.getTime()) latestActivity = { type: 'open', date: lastOpenDate };
        }
        if (joinedDate && isValidDate(joinedDate)) {
            if (!latestActivity || joinedDate.getTime() > latestActivity.date.getTime()) latestActivity = { type: 'joined', date: joinedDate };
        }

        if (!latestActivity) return (
            <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <div className="flex flex-col">
                    <span className="text-[11px] font-medium">Chưa tương tác</span>
                    <span className="text-[9px] opacity-70">gần đây</span>
                </div>
            </div>
        );

        const timeAgo = formatRelativeTime(latestActivity.date.toISOString());
        if (latestActivity.type === 'click') return (
            <div className="flex items-center gap-2 text-emerald-600">
                <MousePointer2 className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-bold">Vừa click link</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
        if (latestActivity.type === 'open') return (
            <div className="flex items-center gap-2 text-blue-600">
                <MailOpen className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-bold">Đã mở mail</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
            </div>
        );
        return (
            <div className="flex items-center gap-2 text-slate-600">
                <UserPlus className="w-3.5 h-3.5" />
                <div className="flex flex-col"><span className="text-[11px] font-medium">Tham gia</span><span className="text-[9px] opacity-70">{timeAgo}</span></div>
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
            <div className="overflow-x-auto overflow-y-auto max-h-[450px] min-h-[400px]">
                <table className="w-full">
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
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên</th>
                                {visibleColumns.includes('email') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>}
                                {visibleColumns.includes('phone') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</th>}
                                {visibleColumns.includes('company') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Công ty</th>}
                                {visibleColumns.includes('status') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>}
                                {visibleColumns.includes('lastActivity') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoạt động gần nhất</th>}
                                {visibleColumns.includes('leadScore') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Điểm Lead</th>}
                                {visibleColumns.includes('tags') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</th>}
                                {visibleColumns.includes('joinedAt') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tham gia</th>}
                                <th className="px-6 py-4 text-right pr-8"></th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {isAllPageSelected && totalCount > subscribers.length && (
                            <tr className="bg-orange-50/50">
                                <td colSpan={visibleColumns.length + 2} className="px-6 py-2.5 text-center">
                                    {isGlobalSelected ? (
                                        <p className="text-xs font-medium text-slate-600">Đã chọn tất cả <span className="font-bold text-orange-600">{totalCount.toLocaleString()}</span> liên hệ. <button onClick={() => onToggleGlobalSelection(false)} className="ml-2 text-blue-600 font-bold hover:underline">Bỏ chọn</button></p>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-600">Đã chọn {subscribers.length} liên hệ. <button onClick={() => onToggleGlobalSelection(true)} className="ml-1 text-orange-600 font-bold hover:underline italic underline-offset-2">Chọn tất cả {totalCount.toLocaleString()} liên hệ?</button></p>
                                    )}
                                </td>
                            </tr>
                        )}
                        {loading ? (
                            Array.from({ length: 12 }).map((_, i) => (
                                <ContactSkeleton key={i} visibleColumns={visibleColumns} />
                            ))
                        ) : subscribers.map((sub) => (
                            <ContactRow
                                key={sub.id}
                                sub={sub}
                                isSelected={selectedIds.has(sub.id)}
                                onToggle={handleToggleOne}
                                onSelect={onSelectSubscriber}
                                renderLastActive={renderLastActive}
                                renderJoinedDate={renderJoinedDate}
                                visibleColumns={visibleColumns}
                            />
                        ))}
                        {!loading && subscribers.length === 0 && (
                            <tr><td colSpan={visibleColumns.length + 2} className="py-12 text-center text-slate-400 text-sm">Không tìm thấy liên hệ nào.</td></tr>
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
                        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-4 py-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">{currentPage.toLocaleString()} / {totalPages.toLocaleString()}</span>
                        <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

        </>
    );
});


export default ContactsTab;