// components/templates/EmailEditor/utils/blockUtils.ts
import { EmailBlock, EmailBlockType, EmailBlockStyle, ListItem } from '../../../../types';

const createUniqueId = () => crypto.randomUUID();

const createStyle = (overrides: EmailBlockStyle = {}): EmailBlockStyle => ({
    paddingTop: '0px', paddingBottom: '0px', paddingLeft: '0px', paddingRight: '0px',
    marginTop: '0px', marginBottom: '0px', marginLeft: '0px', marginRight: '0px',
    ...overrides
});

export const createBlock = (type: string, layout?: string): EmailBlock => {
    const id = createUniqueId();
    if (type === 'layout') {
        const count = parseInt(layout || '1');
        const widths = layout === '1-2' ? ['33%', '67%'] : (layout === '2-1' ? ['67%', '33%'] : Array(count).fill(`${100 / count}%`));
        const cols = widths.map((w, i) => ({
            id: createUniqueId(), type: 'column' as const, content: '',
            style: createStyle({
                width: w,
                paddingTop: '0px',
                paddingRight: (count > 1 && i < count - 1) ? '10px' : '0px',
                paddingBottom: '0px',
                paddingLeft: (count > 1 && i > 0) ? '10px' : '0px',
                verticalAlign: 'top' as const
            }),
            children: []
        }));
        return {
            id, type: 'section', content: '',
            style: createStyle({ paddingTop: '0px', paddingBottom: '0px', backgroundColor: 'transparent', contentBackgroundColor: 'transparent' }),
            children: [{ id: createUniqueId(), type: 'row', content: '', style: createStyle({ display: 'table', backgroundColor: 'transparent', width: '100%', paddingTop: '15px', paddingRight: '15px', paddingBottom: '15px', paddingLeft: '15px' }), children: cols }]
        };
    }

    let content = '';
    let items: ListItem[] = [];
    let rating = 5;
    let styleOverrides: EmailBlockStyle = { paddingTop: '15px', paddingRight: '15px', paddingBottom: '15px', paddingLeft: '15px', textAlign: 'center' };

    if (type === 'text') { content = '<p style="margin: 0;">Nhập văn bản...</p>'; styleOverrides.textAlign = 'left'; }
    if (type === 'button') {
        content = 'Nút Bấm';
        styleOverrides.contentBackgroundColor = '#f59e0b';
        styleOverrides.color = '#ffffff';
        styleOverrides.display = 'inline-block';
        styleOverrides.paddingTop = '12px';
        styleOverrides.paddingBottom = '12px';
        styleOverrides.paddingLeft = '24px';
        styleOverrides.paddingRight = '24px';
        styleOverrides.marginTop = '10px';
        styleOverrides.marginBottom = '10px';
        styleOverrides.fontSize = '16px';
        styleOverrides.fontWeight = 'bold';
        styleOverrides.width = 'auto'; // Default to auto width
        styleOverrides.borderRadius = '8px';
    }
    if (type === 'quote') {
        content = 'Đây là nội dung trích dẫn nổi bật của bạn.';
        styleOverrides = createStyle({
            paddingTop: '20px', paddingRight: '20px', paddingBottom: '20px', paddingLeft: '20px', textAlign: 'left',
            backgroundColor: '#f8fafc', borderLeftWidth: '4px', borderStyle: 'solid', borderColor: '#f59e0b', fontStyle: 'italic', color: '#334155',
        });
    }
    if (type === 'timeline') {
        items = [
            { id: createUniqueId(), title: 'Sự kiện 1', date: '09:00', description: 'Mô tả sự kiện quan trọng' },
            { id: createUniqueId(), title: 'Sự kiện 2', date: '10:30', description: 'Mô tả bước tiếp theo' },
        ];
        styleOverrides.backgroundColor = 'transparent';
        styleOverrides.timelineDotColor = '#f59e0b';
        styleOverrides.timelineLineColor = '#e2e8f0';
        styleOverrides.timelineLineStyle = 'solid';
        styleOverrides.textAlign = 'left';
    }
    if (type === 'review') {
        content = 'Dịch vụ tuyệt vời, tôi rất hài lòng với trải nghiệm này!';
        rating = 5;
        styleOverrides.backgroundColor = 'transparent';
        styleOverrides.borderRadius = '8px';
        styleOverrides.paddingTop = '20px';
        styleOverrides.paddingBottom = '20px';
        styleOverrides.color = '#334155';
    }
    if (type === 'countdown') {
        styleOverrides.targetDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        styleOverrides.backgroundColor = 'transparent';
        styleOverrides.contentBackgroundColor = '#1e293b';
        styleOverrides.digitColor = '#ffffff';
        styleOverrides.labelColor = '#64748b';
        styleOverrides.borderRadius = '8px';
        styleOverrides.paddingTop = '20px';
        styleOverrides.paddingBottom = '20px';
    }

    if (type === 'image') {
        content = ''; // Standard image block doesn't need content if it's just a URL
        styleOverrides.paddingTop = '10px';
        styleOverrides.paddingBottom = '10px';
        styleOverrides.borderRadius = '8px';
    }
    if (type === 'video') {
        styleOverrides.paddingTop = '10px';
        styleOverrides.paddingBottom = '10px';
        styleOverrides.borderRadius = '12px';
        styleOverrides.playButtonColor = '#f59e0b';
    }
    if (type === 'order_list') {
        styleOverrides.paddingTop = '20px';
        styleOverrides.paddingBottom = '20px';
        styleOverrides.backgroundColor = '#ffffff';
    }
    if (type === 'social') {
        styleOverrides.iconMode = 'color';
        styleOverrides.iconSize = '32';
        styleOverrides.gap = '10';
        styleOverrides.textAlign = 'center';
        styleOverrides.paddingTop = '15px';
        styleOverrides.paddingBottom = '15px';
    }
    if (type === 'divider') {
        styleOverrides.paddingTop = '15px';
        styleOverrides.paddingBottom = '15px';
        styleOverrides.borderTopWidth = '1px';
        styleOverrides.borderStyle = 'solid';
        styleOverrides.borderColor = '#eeeeee';
    }
    if (type === 'spacer') {
        styleOverrides.height = '20px';
        styleOverrides.paddingTop = '0px';
        styleOverrides.paddingBottom = '0px';
    }

    if (type === 'check_list') {
        items = [
            { id: createUniqueId(), title: 'Tính năng 1', description: 'Mô tả ngắn gọn về tính năng hoặc lợi ích tuyệt vời của sản phẩm.' },
            { id: createUniqueId(), title: 'Tính năng 2', description: 'Mô tả ngắn gọn về tính năng hoặc lợi ích tuyệt vời của sản phẩm.' },
            { id: createUniqueId(), title: 'Tính năng 3', description: 'Mô tả ngắn gọn về tính năng hoặc lợi ích tuyệt vời của sản phẩm.' },
        ];
        styleOverrides.checkIconColor = '#f59e0b';
        styleOverrides.checkIconSize = '20';
        styleOverrides.showCheckListTitle = true;
        styleOverrides.textAlign = 'left';
        styleOverrides.paddingTop = '20px';
        styleOverrides.paddingBottom = '20px';
    }

    if (type === 'table') {
        const rows = 3; // 1 header + 2 data rows
        const cols = 4;
        const headerLabels = ['Tiêu đề 1', 'Tiêu đề 2', 'Tiêu đề 3', 'Tiêu đề 4'];
        const cells: { content: string; align: 'left' | 'center' | 'right' }[][] = [];
        // Header row
        cells.push(headerLabels.slice(0, cols).map(h => ({ content: h, align: 'center' as const })));
        // Data rows
        for (let r = 0; r < rows - 1; r++) {
            cells.push(Array.from({ length: cols }, (_, c) => ({ content: `Ô ${r + 1}-${c + 1}`, align: 'left' as const })));
        }
        return {
            id, type: 'table' as EmailBlockType,
            content: JSON.stringify(cells),
            style: createStyle({
                paddingTop: '15px', paddingRight: '15px', paddingBottom: '15px', paddingLeft: '15px',
                tableRows: rows,
                tableCols: cols,
                tableHeaderRow: true,
                tableHeaderBg: '#1e293b',
                tableHeaderTextColor: '#ffffff',
                tableStripe: 'alternate',
                tableEvenBg: '#f8fafc',
                tableOddBg: '#ffffff',
                tableSolidBg: '#ffffff',
                tableBorderColor: '#e2e8f0',
                tableBorderWidth: '1px',
                tableCellPadding: '10px 14px',
                tableColWidths: Array(cols).fill('auto'),
                tableColAligns: Array(cols).fill('left'),
            })
        };
    }

    // NEW: Footer Block
    if (type === 'footer') {
        content = '<p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">' +
            '© 2024 Your Company. All rights reserved.<br>' +
            '<a href="#" style="text-decoration: underline; color: #64748b;">Terms of Service</a>' +
            '&nbsp;&nbsp;|&nbsp;&nbsp;' +
            '<a href="#" style="text-decoration: underline; color: #64748b;">Privacy Policy</a>' +
            '&nbsp;&nbsp;|&nbsp;&nbsp;' +
            '<a href="{{unsubscribe_url}}" style="text-decoration: underline; color: #64748b;">Unsubscribe</a>' +
            '</p>';
        styleOverrides.backgroundColor = '#f8fafc';
        styleOverrides.paddingTop = '30px';
        styleOverrides.paddingBottom = '30px';
        styleOverrides.paddingLeft = '20px';
        styleOverrides.paddingRight = '20px';
        styleOverrides.textAlign = 'center';
    }

    // NEW: Job Card (Refined & Editable)
    if (type === 'job_card') {
        const createBadge = (text: string, bg: string, color: string) => ({
            id: createUniqueId(), type: 'button' as const, content: `<div style="text-align: center;">${text}</div>`, url: '#',
            style: createStyle({
                backgroundColor: bg, color: color, fontSize: '11px', fontWeight: 'bold',
                borderRadius: '99px', paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px',
                width: 'auto', textAlign: 'center', display: 'inline-block'
            })
        });

        // Nested Row for Footer (Badges + Button)
        const footerRow = {
            id: createUniqueId(), type: 'row' as const, content: '',
            style: createStyle({ display: 'table', width: '100%', backgroundColor: 'transparent', noStack: true }),
            children: [
                // Col 1: Badges Area
                {
                    id: createUniqueId(), type: 'column' as const, content: '',
                    style: createStyle({ width: '65%', verticalAlign: 'middle', textAlign: 'left' }),
                    children: [{
                        id: createUniqueId(), type: 'row' as const, content: '', // Inner row for badges
                        style: createStyle({ display: 'table', width: 'auto', backgroundColor: 'transparent', noStack: true }),
                        children: [
                            {
                                id: createUniqueId(), type: 'column' as const, content: '',
                                style: createStyle({ width: 'auto', paddingRight: '8px' }),
                                children: [createBadge('Thoả thuận', '#fef3c7', '#92400e')]
                            },
                            {
                                id: createUniqueId(), type: 'column' as const, content: '',
                                style: createStyle({ width: 'auto' }),
                                children: [createBadge('Hồ Chí Minh', '#f1f5f9', '#475569')]
                            }
                        ]
                    }]
                },
                // Col 2: Apply Button
                {
                    id: createUniqueId(), type: 'column' as const, content: '',
                    style: createStyle({ width: '35%', verticalAlign: 'middle', textAlign: 'right' }),
                    children: [{
                        id: createUniqueId(), type: 'button' as const, content: 'Ứng tuyển', url: '#',
                        style: createStyle({
                            backgroundColor: '#f59e0b', color: '#ffffff', fontSize: '12px', fontWeight: 'bold',
                            borderRadius: '99px', paddingLeft: '20px', paddingRight: '20px', paddingTop: '8px', paddingBottom: '8px',
                            width: 'auto', textAlign: 'center', display: 'inline-block'
                        })
                    }]
                }
            ]
        };

        return {
            id, type: 'section', content: '',
            style: createStyle({ backgroundColor: 'transparent' }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({
                    display: 'table', width: '100%', backgroundColor: '#ffffff',
                    paddingTop: '20px', paddingRight: '20px', paddingBottom: '20px', paddingLeft: '20px',
                    borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderRightWidth: '1px',
                    borderStyle: 'solid', borderColor: '#e2e8f0', borderRadius: '12px'
                }),
                children: [
                    // Logo Column
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: '60px', verticalAlign: 'top', paddingRight: '16px' }),
                        children: [{
                            id: createUniqueId(), type: 'image' as const,
                            content: 'https://cdn-icons-png.flaticon.com/512/3003/3003984.png',
                            style: createStyle({ width: '48px', height: '48px', borderRadius: '10px' }),
                            altText: 'Company Logo'
                        }]
                    },
                    // Content Column
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: 'auto', verticalAlign: 'top' }),
                        children: [
                            // Title
                            {
                                id: createUniqueId(), type: 'text' as const,
                                content: '<h3 style="margin: 0 0 4px 0; font-size: 15px; color: #0f172a; font-weight: 700; line-height: 1.4;">Senior Digital Marketer</h3>',
                                style: createStyle()
                            },
                            // Company
                            {
                                id: createUniqueId(), type: 'text' as const,
                                content: '<p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">MAJOR EDUCATION JSC</p>',
                                style: createStyle()
                            },
                            // FOOTER (Badges + Button)
                            footerRow
                        ]
                    }
                ]
            }]
        };
    }

    // NEW: Header Gradient (Google AI Style)
    if (type === 'header_gradient') {
        return {
            id, type: 'section', content: '',
            style: createStyle({
                backgroundImage: 'linear-gradient(180deg, #fdfbf7 0%, #fae8ff 25%, #ffe4e6 50%, #ccfbf1 100%)', // Approximate gradient
                backgroundColor: '#ffffff', // Fallback
                paddingTop: '40px', paddingBottom: '40px'
            }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({ display: 'table', width: '100%', textAlign: 'center' }),
                children: [{
                    id: createUniqueId(), type: 'column' as const, content: '',
                    style: createStyle({ width: '100%', textAlign: 'center' }),
                    children: [
                        {
                            id: createUniqueId(), type: 'image' as const,
                            content: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/2560px-Google_Gemini_logo.svg.png',
                            style: createStyle({ width: '60px', height: 'auto', display: 'block' }),
                            altText: 'Logo'
                        },
                        {
                            id: createUniqueId(), type: 'text' as const,
                            content: '<h1 style="margin: 0 0 16px; font-size: 32px; font-weight: 400; color: #1e1e1e; font-family: Google Sans, Roboto, sans-serif;">Welcome to Google AI Pro</h1>',
                            style: createStyle()
                        },
                        {
                            id: createUniqueId(), type: 'text' as const,
                            content: '<p style="margin: 0 auto; max-width: 600px; font-size: 16px; color: #444746; line-height: 1.5;">Nice to see you again. You’ve unlocked higher access to Google AI. With your Google AI Pro plan, you can now generate even more cinematic videos.</p>',
                            style: createStyle()
                        }
                    ]
                }]
            }]
        };
    }

    // NEW: Double Card (Gemini Style)
    if (type === 'double_card') {
        const createCardCol = (img: string, title: string) => ({
            id: createUniqueId(), type: 'column' as const, content: '',
            style: createStyle({ width: '48%', verticalAlign: 'top', backgroundColor: '#f8fafc', borderRadius: '16px', paddingBottom: '20px', paddingLeft: '0px', paddingRight: '0px' }),
            children: [
                { id: createUniqueId(), type: 'image' as const, content: img, style: createStyle({ width: '100%', borderRadius: '16px 16px 0 0' }) },
                { id: createUniqueId(), type: 'text' as const, content: `<h3 style="margin: 20px 20px 8px; padding: 0; font-size: 16px; font-weight: bold; color: #1e293b; text-align: center;">${title}</h3><p style="margin: 0; padding: 0 20px 20px; color: #64748b; font-size: 13px; line-height: 1.6; text-align: center;">Khám phá bộ sưu tập mới nhất với phong cách độc đáo của chúng tôi.</p>`, style: createStyle() },
                { id: createUniqueId(), type: 'text' as const, content: '<p style="margin: 0; padding: 0 20px; text-align: center;"><a href="#" style="text-decoration: none; color: #2563eb; font-weight: 600; font-size: 13px;">Xem chi tiết →</a></p>', style: createStyle() }
            ]
        });

        // Column for Gap (using empty column with width)
        const gapCol = {
            id: createUniqueId(), type: 'column' as const, content: '',
            style: createStyle({ width: '4%', verticalAlign: 'top' }),
            children: [{ id: createUniqueId(), type: 'spacer' as const, content: '', style: createStyle({ height: '1px' }) }]
        };

        return {
            id, type: 'section', content: '',
            style: createStyle({ backgroundColor: 'transparent' }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({ display: 'table', width: '100%', backgroundColor: '#ffffff', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '20px', paddingRight: '20px' }), // Added white bg and padding
                children: [
                    createCardCol('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=350&fit=crop&auto=format', 'Architecture & Design'),
                    gapCol,
                    createCardCol('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=350&fit=crop&auto=format', 'Business Strategy')
                ]
            }]
        };
    }

    // NEW: Review Card (Avatar + Text)
    if (type === 'review_card') {
        return {
            id, type: 'section', content: '',
            style: createStyle({ backgroundColor: 'transparent' }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({ display: 'table', width: '100%', backgroundColor: '#ffffff', paddingTop: '24px', paddingRight: '24px', paddingBottom: '24px', paddingLeft: '24px', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderRightWidth: '1px', borderStyle: 'solid', borderColor: '#f1f5f9', borderRadius: '16px' }), // Removed boxShadow
                children: [
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: '60px', verticalAlign: 'top', paddingRight: '16px' }),
                        children: [{ id: createUniqueId(), type: 'image' as const, content: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&auto=format', style: createStyle({ width: '48px', height: '48px', borderRadius: '50%' }) }]
                    },
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: 'auto', verticalAlign: 'top' }),
                        children: [
                            { id: createUniqueId(), type: 'text' as const, content: '<h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">Sarah Johnston</h4><div style="color: #fbbf24; font-size: 12px; margin-bottom: 8px;">★★★★★</div>', style: createStyle() },
                            { id: createUniqueId(), type: 'text' as const, content: '<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5; font-style: italic;">"MailFlow đã giúp đội nhóm của tôi tiết kiệm 50% thời gian xử lý email mỗi ngày. Một công cụ tuyệt vời!"</p>', style: createStyle() }
                        ]
                    }
                ]
            }]
        };
    }

    // NEW: Download Badges (Gemini App Style)
    if (type === 'download_badges') {
        const createBadgeCol = (imgData: { url: string, alt: string }) => ({
            id: createUniqueId(), type: 'column' as const, content: '',
            style: createStyle({ width: '50%', verticalAlign: 'middle', paddingLeft: '4px', paddingRight: '4px', textAlign: 'center' }),
            children: [{
                id: createUniqueId(), type: 'image' as const,
                content: imgData.url,
                altText: imgData.alt,
                url: '#',
                style: createStyle({ width: '135px', height: 'auto', display: 'block', marginLeft: 'auto', marginRight: 'auto', borderRadius: '0px' })
            }]
        });

        const badgesRow = {
            id: createUniqueId(), type: 'row' as const, content: '',
            style: createStyle({
                display: 'table',
                width: '300px', // Fixed width for the buttons container
                marginLeft: 'auto',
                marginRight: 'auto',
                backgroundColor: 'transparent',
                noStack: true
            }),
            children: [
                createBadgeCol({ url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg', alt: 'Google Play' }),
                createBadgeCol({ url: 'https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg', alt: 'App Store' })
            ]
        };

        return {
            id, type: 'section', content: '',
            style: createStyle({ backgroundColor: 'transparent' }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({
                    display: 'table', width: '100%', textAlign: 'center', backgroundColor: '#ffffff',
                    paddingTop: '32px', paddingBottom: '32px', paddingLeft: '24px', paddingRight: '24px',
                    borderRadius: '16px', borderTopWidth: '1px', borderLeftWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderColor: '#e2e8f0', borderStyle: 'solid'
                }),
                children: [{
                    id: createUniqueId(), type: 'column' as const, content: '',
                    style: createStyle({ width: '100%', textAlign: 'center' }), // Ensure column is full width
                    children: [
                        { id: createUniqueId(), type: 'image' as const, content: 'https://cdn-icons-png.flaticon.com/512/6124/6124998.png', style: createStyle({ width: '48px', height: 'auto', marginBottom: '16px' }), altText: 'Gemini Logo' }, // Restored stable logo
                        { id: createUniqueId(), type: 'text' as const, content: '<h2 style="font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 12px; font-family: sans-serif; text-align: center; width: 100%;">Get the Gemini app</h2>', style: createStyle({ textAlign: 'center', width: '100%' }) },
                        { id: createUniqueId(), type: 'text' as const, content: '<p style="font-size: 15px; color: #64748b; margin: 0 auto 32px; max-width: 480px; line-height: 1.6; text-align: center; width: 100%;">Try features like Gemini Live and get access to Google AI wherever you go.</p>', style: createStyle({ textAlign: 'center', width: '100%' }) },
                        badgesRow
                    ]
                }]
            }]
        };
    }

    // NEW: Feature Card (Jules Style)
    if (type === 'feature_card') {
        return {
            id, type: 'section', content: '',
            style: createStyle({ backgroundColor: 'transparent' }),
            children: [{
                id: createUniqueId(), type: 'row' as const, content: '',
                style: createStyle({
                    display: 'table', width: '100%', backgroundColor: '#ffffff', // White BG
                    paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
                    borderRadius: '16px', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderRightWidth: '1px', borderStyle: 'solid', borderColor: '#e2e8f0', // Card border
                    noStack: true
                }),
                children: [
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: '40%', verticalAlign: 'middle', paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px', textAlign: 'center' }),
                        children: [{ id: createUniqueId(), type: 'image' as const, content: 'https://cdn-icons-png.flaticon.com/512/2040/2040504.png', style: createStyle({ width: '120px', height: 'auto', display: 'block', marginLeft: 'auto', marginRight: 'auto' }), altText: 'Icon' }]
                    },
                    {
                        id: createUniqueId(), type: 'column' as const, content: '',
                        style: createStyle({ width: '60%', verticalAlign: 'middle', paddingRight: '24px', paddingLeft: '24px', paddingTop: '24px', paddingBottom: '24px' }),
                        children: [
                            { id: createUniqueId(), type: 'text' as const, content: '<h3 style="font-size: 20px; font-weight: bold; margin: 0 0 8px; color: #1e1b4b; text-align: left;">Hệ sinh thái học tập</h3>', style: createStyle({ textAlign: 'left' }) },
                            { id: createUniqueId(), type: 'text' as const, content: '<p style="font-size: 14px; color: #475569; margin: 0 0 16px; line-height: 1.6; text-align: left;">Mô tả ngắn gọn về tính năng hoặc dịch vụ của bạn tại đây để thu hút người dùng.</p>', style: createStyle({ textAlign: 'left' }) },
                            { id: createUniqueId(), type: 'text' as const, content: '<a href="#" style="font-size: 14px; font-weight: 600; color: #2563eb; text-decoration: none; text-align: left;">Xem chi tiết ></a>', style: createStyle({ textAlign: 'left' }) }
                        ]
                    }
                ]
            }]
        };
    }

    return {
        id, type: (type === 'footer' ? 'text' : type) as EmailBlockType,
        content,
        url: (type === 'button' || type === 'image') ? '#' : undefined,
        socialLinks: type === 'social' ? [
            { id: createUniqueId(), network: 'facebook', url: '#' },
            { id: createUniqueId(), network: 'instagram', url: '#' },
            { id: createUniqueId(), network: 'twitter', url: '#' },
            { id: createUniqueId(), network: 'website', url: '#' }
        ] : undefined,
        items: items.length > 0 ? items : undefined,
        rating: type === 'review' ? rating : undefined,
        style: createStyle(styleOverrides),
        checkListTitle: type === 'check_list' ? 'VÌ SAO NÊN CHỌN CHÚNG TÔI?' : undefined,
        videoUrl: type === 'video' ? '' : undefined,
        thumbnailUrl: type === 'video' ? '' : undefined,
    };
};

export const wrapElement = (block: EmailBlock): EmailBlock => {
    if (block.type === 'section') return block;

    const col = {
        id: createUniqueId(), type: 'column' as const, content: '',
        style: createStyle({ width: '100%', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', verticalAlign: 'top' }),
        children: [block]
    };

    const row = {
        id: createUniqueId(), type: 'row' as const, content: '',
        style: createStyle({ display: 'table', backgroundColor: '#ffffff', width: '100%', paddingTop: '15px', paddingRight: '15px', paddingBottom: '15px', paddingLeft: '15px' }),
        children: [col]
    };

    const sec = {
        id: createUniqueId(), type: 'section' as const, content: '',
        style: createStyle({ paddingTop: '0px', paddingBottom: '0px', backgroundColor: 'transparent', contentBackgroundColor: 'transparent' }),
        children: [row]
    };

    return sec;
};

export const findBlock = (id: string, list: EmailBlock[]): EmailBlock | null => {
    for (const b of list) {
        if (b.id === id) return b;
        if (b.children) {
            const found = findBlock(id, b.children);
            if (found) return found;
        }
    }
    return null;
};

export const isDescendant = (parentId: string, childId: string, list: EmailBlock[]): boolean => {
    const parent = findBlock(parentId, list);
    if (!parent || !parent.children) return false;
    return !!findBlock(childId, parent.children);
};

export const deleteBlockDeep = (list: EmailBlock[], id: string): EmailBlock[] => {
    return list.filter(b => b.id !== id).map(b => {
        if (b.children) return { ...b, children: deleteBlockDeep(b.children, id) };
        return b;
    });
};

export const duplicateBlockDeep = (b: EmailBlock): EmailBlock => ({
    ...b,
    id: createUniqueId(),
    children: b.children?.map(duplicateBlockDeep)
});

export const insertDeep = (list: EmailBlock[], targetId: string, block: EmailBlock, pos: 'top' | 'bottom' | 'inside' | 'left' | 'right'): EmailBlock[] => {
    if (targetId === 'root') {
        const finalBlock = (block.type !== 'section') ? wrapElement(block) : block;
        return pos === 'top' ? [finalBlock, ...list] : [...list, finalBlock];
    }
    const idx = list.findIndex(b => b.id === targetId);
    if (idx !== -1) {
        const copy = [...list];
        // Determine the parent's type to decide on wrapping
        // We need to know what the target's siblings are to know the parent type.
        // Actually, we can check the target's type if we are inserting AT the target's level.
        // If we are at this level, we are essentially children of some parent.
        // We need to know that parent's type.
        // Since we don't have parentType here, we can infer it from the target type if they are siblings.
        // In this editor:
        // - Siblings of a 'section' are always 'section's. Parent is root.
        // - Siblings of a 'row' are always 'row's. Parent is 'section'.
        // - Siblings of a 'column' are always 'column's. Parent is 'row'.
        // - Siblings of a content block are always in a 'column'.

        const targetSibling = copy[idx];
        let blockToInsert = block;

        if (pos === 'inside') {
            if (['section', 'row', 'column'].includes(targetSibling.type)) {
                if (targetSibling.type === 'section' && block.type !== 'row') {
                    const wrapped = wrapElement(block); blockToInsert = wrapped.children![0];
                } else if (targetSibling.type === 'row' && block.type !== 'column') {
                    const col = createBlock('column'); col.children = [block]; col.style.width = '100%'; blockToInsert = col;
                }
                copy[idx] = { ...targetSibling, children: [...(targetSibling.children || []), blockToInsert] };
            }
        } else if (pos === 'left' || pos === 'right') {
            if (targetSibling.type === 'column') {
                if (block.type !== 'column') {
                    blockToInsert = createBlock('column');
                    blockToInsert.children = [block];
                }
                copy.splice(pos === 'left' ? idx : idx + 1, 0, blockToInsert);
                const newCount = copy.length;
                const equalWidth = (100 / newCount).toFixed(2) + '%';
                copy.forEach((c, i) => {
                    if (c.style) {
                        c.style.width = equalWidth;
                        if (newCount > 1) {
                            c.style.paddingLeft = i > 0 ? '10px' : '0px';
                            c.style.paddingRight = i < newCount - 1 ? '10px' : '0px';
                        }
                    }
                });
            } else {
                copy.splice(pos === 'left' ? idx : idx + 1, 0, block);
            }
        } else {
            // Top/Bottom drop. Check if we are inside a section/row/column by checking sibling type.
            if (targetSibling.type === 'section' && block.type !== 'section') {
                // If dropping next to a section (at root), must be a section
                blockToInsert = wrapElement(block);
            } else if (targetSibling.type === 'row' && block.type !== 'row' && block.type !== 'section') {
                // We are inside a section, but trying to drop a non-row block. Wrap it.
                const wrapped = wrapElement(block); blockToInsert = wrapped.children![0];
            } else if (targetSibling.type === 'column' && block.type !== 'column') {
                // This shouldn't happen much as columns are side-by-side, but if so:
                blockToInsert = createBlock('column'); blockToInsert.children = [block];
            }
            copy.splice(pos === 'top' ? idx : idx + 1, 0, blockToInsert);
        }
        return copy;
    }
    return list.map(b => b.children ? { ...b, children: insertDeep(b.children, targetId, block, pos) } : b);
};

export const moveBlockOrder = (id: string, direction: 'up' | 'down', blocks: EmailBlock[]): EmailBlock[] => {
    const process = (items: EmailBlock[]): EmailBlock[] => {
        const idx = items.findIndex(x => x.id === id);
        if (idx !== -1) {
            const copy = [...items];
            if (direction === 'up' && idx > 0) [copy[idx], copy[idx - 1]] = [copy[idx - 1], copy[idx]];
            else if (direction === 'down' && idx < copy.length - 1) [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
            return copy;
        }
        return items.map(item => item.children ? { ...item, children: process(item.children) } : item);
    };
    return process(blocks);
};

export const swapColumnsInRow = (colId: string, blocks: EmailBlock[]): EmailBlock[] => {
    const process = (items: EmailBlock[]): EmailBlock[] => {
        return items.map(item => {
            if (item.type === 'row' && item.children) {
                const idx = item.children.findIndex(c => c.id === colId);
                if (idx !== -1) {
                    const newCols = [...item.children];
                    const nextIdx = (idx + 1) % newCols.length;
                    [newCols[idx], newCols[nextIdx]] = [newCols[nextIdx], newCols[idx]];
                    return { ...item, children: newCols };
                }
            }
            return item.children ? { ...item, children: process(item.children) } : item;
        });
    };
    return process(blocks);
};
