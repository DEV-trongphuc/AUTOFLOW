import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UnifiedChat from '../components/ai/UnifiedChat';
import { Loader } from 'lucide-react';

const PublicReport: React.FC = () => {
    const { propertyId, index } = useParams<{ propertyId: string, index?: string }>();

    if (!propertyId) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500 font-bold">Thiếu Property ID</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50">
            <UnifiedChat
                propertyId={propertyId}
                defaultShowAnalysis={true}
                publicMode={true}
                initialReportIndex={index ? parseInt(index) : 0}
            />
        </div>
    );
};

export default PublicReport;
