// components/templates/EmailEditor/components/ToolboxSavedItem.tsx
import React from 'react';
import { Box, LucideIcon } from 'lucide-react'; // Import LucideIcon type

interface SavedItemProps {
    item: { id: string; name: string; data: any }; // 'data' field type should match EmailBlock
    onDragStart: (e: React.DragEvent, type: string, payload?: string) => void;
}

// Map string icon names to LucideIcon components if needed, or pass directly
const iconMap: { [key: string]: LucideIcon } = {
    Box: Box, // Example, add others if block.type influences icon
};

const ToolboxSavedItem: React.FC<SavedItemProps> = ({ item, onDragStart }) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, 'saved', JSON.stringify(item.data))}
        className="bg-white border border-slate-100 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-md transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 p-1 bg-amber-50 rounded-bl-xl text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <Box className="w-3 h-3" /> {/* Default icon, could be dynamic based on item.data.type */}
        </div>
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-colors">
                <Box className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
        </div>
    </div>
);

export default ToolboxSavedItem;
