 

import React from 'react';
import { MoreHorizontal, Clock, MailOpen, MousePointer2, UserPlus, ChevronLeft, ChevronRight, Check, Zap, BadgeCheck, MessageCircle, Facebook, Globe, FileSpreadsheet, Database } from 'lucide-react';
import Badge from '../../common/Badge';
import { Subscriber } from '../../../types';
import toast from 'react-hot-toast';
import ItemsPerPageSelector from '../ItemsPerPageSelector';
import BulkActionsToolbar from '../BulkActionsToolbar';
import Skeleton from '../../common/Skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ContextMenu } from '../../common/ContextMenu';
import { Edit, Tag, PlusSquare, Trash2 } from 'lucide-react';
import Pagination from '../../common/Pagination';

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
    onContextMenu?: (e: React.MouseEvent, sub: Subscriber) => void;
}

const ContactRow = React.memo(React.forwardRef<HTMLTableRowElement, ContactRowProps>(({
    sub, isSelected, onToggle, onSelect, renderLastActive, renderJoinedDate, visibleColumns, 'data-index': dataIndex, onContextMenu
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

     const formatTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const getInitials = (name: string) => {
        const parts = (name || '').trim().split(/\s+/);
        if (parts.length === 0 || !parts[0]) return '?';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getAvatarBg = (name: string) => {
        const colors = [
            'bg-blue-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-violet-500'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    return (
        <tr
            ref={ref}
            data-index={dataIndex}
            className={`hover:bg-slate-50 transition-colors group/row cursor-pointer border-b border-slate-100 ${isSelected ? 'bg-violet-50/20' : ''}`}
            onClick={() => onSelect(sub)}
            onContextMenu={onContextMenu ? (e) => onContextMenu(e, sub) : undefined}
        >
            {/* Column 1: KHÁCH HÀNG */}
            <td className="px-6 py-4 pl-8">
                <div className="flex items-center">
                    {sub.avatar ? (
                        <img src={sub.avatar} alt={fullName} className="h-9 w-9 rounded-full object-cover mr-3 border border-slate-200 shadow-sm" />
                    ) : (
                        <div className={`h-9 w-9 rounded-full ${getAvatarBg(fullName)} flex items-center justify-center text-white font-bold text-xs mr-3 shadow-sm`}>
                            {getInitials(fullName)}
                        </div>
                    )}
                    <div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover/row:text-violet-600 transition-colors flex items-center gap-1">
                            {fullName}
                        </div>
                        {Number(sub.verified) === 1 && (
                            <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Verified</span>
                        )}
                    </div>
                </div>
            </td>

            {/* Column 2: LIÊN HỆ */}
            <td className="px-6 py-4">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{sub.phoneNumber || '-'}</div>
                <div className="text-[11px] text-slate-400 font-medium">{isVirtualEmail ? (isZalo ? 'Zalo Identity' : 'Meta Identity') : sub.email}</div>
            </td>

            {/* Column 3: TRẠNG THÁI */}
            <td className="px-6 py-4">
                {(() => {
                    const status = sub.status || 'active';
                    const statusStr = String(status);
                    let label = 'Active';
                    let variant: 'success' | 'danger' | 'pink' | 'amber' | 'neutral' = 'success';
                    
                    if (statusStr === 'active') {
                        label = 'Active';
                        variant = 'success';
                    } else if (statusStr === 'unsubscribed' || statusStr === 'bounced' || statusStr === 'complained') {
                        label = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
                        variant = 'danger';
                    } else if (statusStr === 'lead') {
                        label = 'Lead';
                        variant = 'pink';
                    } else if (statusStr === 'customer') {
                        label = 'Customer';
                        variant = 'amber';
                    } else {
                        label = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
                        variant = 'neutral';
                    }

                    return <Badge variant={variant}>{label}</Badge>;
                })()}
            </td>

            {/* Column 4: NGUỒN */}
            <td className="px-6 py-4">
                {(() => {
                    const s = (sub.source || '').toLowerCase();
                    let label = sub.source || 'Web Form';
                    let SrcIcon = Globe;
                    let color = 'text-slate-600 bg-slate-50 dark:bg-slate-950/20';

                    if (s.includes('zalo') || isZalo) {
                        label = 'Zalo OA';
                        SrcIcon = MessageCircle;
                        color = 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
                    } else if (s.includes('facebook') || s.includes('messenger') || isMeta) {
                        label = 'Meta Messenger';
                        SrcIcon = Facebook;
                        color = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20';
                    } else if (s.includes('csv') || s.includes('import') || s.includes('file')) {
                        label = 'CSV Import';
                        SrcIcon = FileSpreadsheet;
                        color = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
                    } else if (s.includes('api')) {
                        label = 'API Integration';
                        SrcIcon = Database;
                        color = 'text-violet-600 bg-violet-50 dark:bg-violet-950/20';
                    }

                    return (
                        <div className="flex items-center">
                            <div>
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                                <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Nguồn kênh</div>
                            </div>
                        </div>
                    );
                })()}
            </td>

            {/* Column 5: THỜI GIAN NHẬN */}
            <td className="px-6 py-4">
                <div className="text-xs text-slate-500 font-medium">{formatTime(sub.joinedAt || (sub as any).createdAt)}</div>
            </td>

            <td className="px-6 py-4 text-right pr-8">
                <button type="button" className="text-slate-300 hover:text-violet-600 p-1.5 hover:bg-violet-50 rounded-lg transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
            </td>
        </tr>
    );
}));

const ContactSkeleton: React.FC<{ visibleColumns: string[] }> = ({ visibleColumns }) => (
    <tr>
        <td className="px-6 py-4 pl-8"><Skeleton variant="rounded" width={20} height={20} className="rounded" /></td>
        <td className="px-6 py-4">
            <div className="flex items-center">
                <Skeleton variant="circular" width={36} height={36} className="mr-3" />
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

    // --- CONTEXT MENU STATE ---
    const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, sub: Subscriber } | null>(null);

    const handleContextMenu = React.useCallback((e: React.MouseEvent, sub: Subscriber) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, sub });
    }, []);

    const closeContextMenu = React.useCallback(() => {
        setContextMenu(null);
    }, []);

    return (
        <>
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={closeContextMenu}
                    items={[
                        {
                            id: 'edit',
                            label: 'Chỉnh sửa',
                            icon: Edit,
                            onClick: () => onSelectSubscriber(contextMenu.sub)
                        },
                        {
                            id: 'add-tag',
                            label: 'Thêm Tag',
                            icon: Tag,
                            onClick: () => {
                                // Select this single item and trigger bulk tag
                                if (!selectedIds.has(contextMenu.sub.id)) {
                                    onToggleSelection(contextMenu.sub.id);
                                }
                                setTimeout(() => onBulkTag(), 100);
                            }
                        },
                        {
                            id: 'add-list',
                            label: 'Thêm vào Danh sách',
                            icon: PlusSquare,
                            onClick: () => {
                                if (!selectedIds.has(contextMenu.sub.id)) {
                                    onToggleSelection(contextMenu.sub.id);
                                }
                                setTimeout(() => onBulkAddToList(), 100);
                            }
                        },
                        {
                            id: 'delete',
                            label: 'Xóa liên hệ',
                            icon: Trash2,
                            danger: true,
                            divider: true,
                            onClick: () => {
                                if (!selectedIds.has(contextMenu.sub.id)) {
                                    onToggleSelection(contextMenu.sub.id);
                                }
                                setTimeout(() => onBulkDelete(), 100);
                            }
                        }
                    ]}
                />
            )}
            <div ref={parentRef} className="overflow-x-auto overflow-y-auto max-h-[420px] min-h-[300px]">
                <table className="w-full relative">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-left sticky top-0 z-20 backdrop-blur-sm">
                        {selectedIds.size > 0 ? (
                            <BulkActionsToolbar
                                selectedIds={selectedIds}
                                subscribers={subscribers}
                                visibleColumnsCount={5}
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
                                <th className="px-6 py-4 pl-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Liên hệ</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nguồn</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian nhận</th>
                                <th className="px-6 py-4 text-right pr-8"></th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {isAllPageSelected && totalCount > subscribers.length && (
                            <tr className="bg-violet-50/50">
                                <td colSpan={visibleColumns.length + 2} className="px-6 py-2.5 text-center">
                                    {isGlobalSelected ? (
                                        <p className="text-xs font-medium text-slate-600">{"\u0110\u00E3 Ch\u1ECDn t\u1EA5t c\u1EA3"} <span className="font-bold text-violet-600">{(totalCount || 0).toLocaleString()}</span> {"li\u00EAn h\u1EC7."} <button type="button" onClick={() => onToggleGlobalSelection(false)} className="ml-2 text-blue-600 font-bold hover:underline">{"B\u1ECF ch\u1ECDn"}</button></p>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-600">{"\u0110\u00E3 ch\u1ECDn"} {subscribers.length} {"li\u00EAn h\u1EC7."} <button type="button" onClick={() => onToggleGlobalSelection(true)} className="ml-1 text-violet-600 font-bold hover:underline italic underline-offset-2">{"Ch\u1ECDn t\u1EA5t c\u1EA3"} {(totalCount || 0).toLocaleString()} {"li\u00EAn h\u1EC7?"}</button></p>
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
                                            onContextMenu={handleContextMenu}
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

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
            />

        </>
    );
});


export default ContactsTab;
