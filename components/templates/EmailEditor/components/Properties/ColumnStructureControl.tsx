// components/templates/EmailEditor/components/Properties/ColumnStructureControl.tsx
import React from 'react';
import { EmailBlock } from '../../../../../types';

interface ColumnStructureControlProps {
    children: EmailBlock[];
    onUpdateChildren: (newChildren: EmailBlock[]) => void;
}

const ColumnStructureControl: React.FC<ColumnStructureControlProps> = ({ children, onUpdateChildren }) => {
    return (
        <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cấu trúc cột</label>
            <div className="grid grid-cols-2 gap-2">
                {children.map((col, idx) => (
                    <div key={col.id} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center">
                        <span className="text-[10px] font-bold text-slate-600">Col {idx+1}</span>
                        <input 
                            className="w-full text-center bg-white border border-slate-200 rounded px-1 py-0.5 text-xs mt-1"
                            value={col.style.width}
                            onChange={(e) => {
                                const newChildren = [...children];
                                newChildren[idx] = { ...col, style: { ...col.style, width: e.target.value } };
                                onUpdateChildren(newChildren);
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ColumnStructureControl;
