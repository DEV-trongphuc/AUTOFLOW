import * as React from 'react';
import { useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom';
import { AI_PERSONAS, AIPersona } from '../../../data/personas';
import { useChatPage } from '../../../contexts/ChatPageContext';
import { toast } from 'react-hot-toast';

interface PersonaPickerProps {
    onClose: () => void;
}

export const PersonaPicker: React.FC<PersonaPickerProps> = ({ onClose }) => {
    const { selectedPersona, setSelectedPersona } = useChatPage();
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSelect = (persona: AIPersona) => {
        setSelectedPersona(persona);
        if (persona.id !== 'default') {
            toast.success(`Đã chuyển sang: ${persona.emoji} ${persona.name}`, {
                duration: 2500,
                style: { background: persona.accentColor, color: '#fff', borderRadius: '12px' }
            });
        } else {
            toast('Đã đặt lại về mặc định', { icon: '🔄', duration: 1800 });
        }
        onClose();
    };

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 99998,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(3px)',
                animation: 'fadeIn 0.15s ease',
            }} onClick={onClose} />

            {/* Panel */}
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(860px, calc(100vw - 32px))',
                    maxHeight: 'calc(100vh - 48px)',
                    zIndex: 99999,
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'popIn 0.25s cubic-bezier(0.34,1.36,0.64,1)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                            🎭 Nhân cách AI
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                            Chọn phong cách phản hồi phù hợp với bạn
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.07)', border: 'none',
                            borderRadius: '10px', width: '32px', height: '32px',
                            cursor: 'pointer', color: '#94a3b8', fontSize: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                    >
                        ✕
                    </button>
                </div>

                {/* Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '6px',
                    flex: 1,
                    minHeight: 0,
                }}>
                    {AI_PERSONAS.map((persona) => {
                        const isActive = selectedPersona.id === persona.id;
                        return (
                            <button
                                key={persona.id}
                                onClick={() => handleSelect(persona)}
                                style={{
                                    position: 'relative',
                                    background: isActive ? persona.gradient : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isActive ? persona.accentColor : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '14px',
                                    padding: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? `0 0 0 1px ${persona.accentColor}80` : 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.borderColor = persona.accentColor + '80';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    }
                                }}
                            >
                                {/* Active glow */}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', inset: 0, borderRadius: '12px',
                                        background: `radial-gradient(circle at top left, ${persona.accentColor}20 0%, transparent 70%)`,
                                        pointerEvents: 'none',
                                    }} />
                                )}

                                {/* Badge */}
                                {persona.badge && (
                                    <div style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: persona.accentColor + '30',
                                        border: `1px solid ${persona.accentColor}60`,
                                        color: persona.accentColor,
                                        borderRadius: '20px',
                                        padding: '1px 8px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        letterSpacing: '0.04em',
                                    }}>
                                        {persona.badge}
                                    </div>
                                )}

                                {/* Active checkmark */}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        width: '20px', height: '20px',
                                        background: persona.accentColor,
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '10px', color: '#fff', fontWeight: 700,
                                    }}>
                                        ✓
                                    </div>
                                )}

                                {/* Emoji */}
                                <div style={{ fontSize: '28px', marginBottom: '8px', lineHeight: 1 }}>
                                    {persona.emoji}
                                </div>

                                {/* Name */}
                                <div style={{
                                    fontSize: '14px', fontWeight: 700,
                                    color: isActive ? persona.textColor : '#f1f5f9',
                                    marginBottom: '3px',
                                }}>
                                    {persona.name}
                                </div>

                                {/* Tagline */}
                                <div style={{
                                    fontSize: '11px',
                                    color: isActive ? persona.textColor + 'cc' : '#64748b',
                                    fontStyle: 'italic',
                                    marginBottom: '8px',
                                }}>
                                    {persona.tagline}
                                </div>

                                {/* Description */}
                                <div style={{
                                    fontSize: '11px',
                                    color: isActive ? persona.textColor + 'aa' : '#475569',
                                    lineHeight: 1.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}>
                                    {persona.description}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <style>{`
                    @keyframes popIn {
                        from { opacity: 0; transform: translate(-50%, -46%); }
                        to   { opacity: 1; transform: translate(-50%, -50%); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to   { opacity: 1; }
                    }
                `}</style>
            </div>
        </>,
        document.body
    );
};
