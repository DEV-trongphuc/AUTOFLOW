import fs from 'fs';
const fn = 'f:/DOWNLOAD/copy-of-mailflow-pro (2) - Copy/copy-of-mailflow-pro3/copy-of-mailflow-pro/AUTOFLOW/copy-of-mailflow-pro/components/templates/EmailEditor/utils/htmlCompiler.ts';
let code = fs.readFileSync(fn, 'utf-8');

if (!code.includes('const wrapWithMargin = (innerTdHtml: string): string => {')) {
    code = code.replace(
        /const radiusStyle = s\.borderRadius \?([^:\n]+) : '';/,
        `const radiusStyle = s.borderRadius ?$1 : '';

        const wrapWithMargin = (innerTdHtml: string): string => {
            const hasMargin = [s.marginTop, s.marginBottom, s.marginLeft, s.marginRight].some(m => m && m !== '0' && m !== '0px' && m !== 'auto');
            if (hasMargin) return \`<tr><td style="padding: 0;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; \${marginCss}"><tr>\${innerTdHtml}</tr></table></td></tr>\`;
            return \`<tr>\${innerTdHtml}</tr>\`;
        };`
    );

    code = code.replace(
        /return `<tr><td align="\${s\.textAlign \|\| 'center'}" \${getBgColorHtmlAttr\(s\)} style="\${getBackgroundStyle\(s\)} \${paddingCss} \${radiusStyle}"><table class="\${rowClass}" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width: 100%;"><tr>\${columnsHtml}<\/tr><\/table><\/td><\/tr>`;/,
        'return wrapWithMargin(`<td align="${s.textAlign || \'center\'}" ${getBgColorHtmlAttr(s)} style="${getBackgroundStyle(s)} ${paddingCss} ${radiusStyle}"><table class="${rowClass}" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width: 100%;"><tr>${columnsHtml}</tr></table></td>`);'
    );

    code = code.replace(
        /return `<tr><td style="\${paddingCss} \${getBackgroundStyle\(s\)}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse;">\${items\.map\(([\s\S]*?)\)\.join\(''\)}<\/table><\/td><\/tr>`;/,
        'return wrapWithMargin(`<td style="${paddingCss} ${getBackgroundStyle(s)}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse;">${items.map($1).join(\'\')}</table></td>`);'
    );

    code = code.replace(
        /return `<tr><td align="\${videoAlign}" style="\${paddingCss} \${getBackgroundStyle\(s\)}"><a href="\${b\.videoUrl \|\| '#'}" target="_blank" style="display: inline-block; text-decoration: none;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td style="padding: 0;"><img src="\${b\.thumbnailUrl \|\| 'https:\/\/via\.placeholder\.com\/600x340\?text=Video\+Thumbnail'}" width="100%" style="display: block; max-width: 100%; border-radius: \${sanitizeRadius\(s\.borderRadius \|\| '12px'\)};" \/><\/td><\/tr><tr><td align="center" style="margin-top: -80px; position: relative;"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" bgcolor="\${playBtnColor}" style="width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 12px rgba\(0,0,0,0\.4\);"><img src="https:\/\/cdn-icons-png\.flaticon\.com\/512\/0\/375\.png" width="30" height="30" style="display: block; filter: invert\(1\); margin-left: 4px;" \/><\/td><\/tr><\/table><\/td><\/tr><\/table><\/a><\/td><\/tr>`;/,
        'return wrapWithMargin(`<td align="${videoAlign}" style="${paddingCss} ${getBackgroundStyle(s)}"><a href="${b.videoUrl || \'#\'}" target="_blank" style="display: inline-block; text-decoration: none;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td style="padding: 0;"><img src="${b.thumbnailUrl || \'https://via.placeholder.com/600x340?text=Video+Thumbnail\'}" width="100%" style="display: block; max-width: 100%; border-radius: ${sanitizeRadius(s.borderRadius || \'12px\')};" /></td></tr><tr><td align="center" style="margin-top: -80px; position: relative;"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td align="center" valign="middle" bgcolor="${playBtnColor}" style="width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"><img src="https://cdn-icons-png.flaticon.com/512/0/375.png" width="30" height="30" style="display: block; filter: invert(1); margin-left: 4px;" /></td></tr></table></td></tr></table></a></td>`);'
    );

    code = code.replace(
        /return `<tr><td style="\${marginCss} \${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-left: \${quoteBorderWidth} solid \${quoteBorderColor}; border-radius: \${sanitizeRadius\(s\.borderRadius \|\| '0'\)}; background-color: \${s\.backgroundColor \|\| 'transparent'};"><tr><td style="padding: \${paddingVertical} \${s\.paddingRight \|\| '25px'} \${s\.paddingBottom \|\| '15px'} \${paddingHorizontal}; font-family: \${bodyStyle\.fontFamily \|\| "Arial, sans-serif"}; font-size: \${s\.fontSize \|\| '15px'}; font-style: \${s\.fontStyle \|\| 'italic'}; line-height: 1\.6; color: \${s\.color \|\| 'inherit'}; text-align: \${s\.textAlign \|\| 'left'}; font-weight: \${s\.fontWeight \|\| 'normal'};">\${b\.content}<\/td><\/tr><\/table><\/td><\/tr>`;/,
        'return wrapWithMargin(`<td style="${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-left: ${quoteBorderWidth} solid ${quoteBorderColor}; border-radius: ${sanitizeRadius(s.borderRadius || \'0\')}; background-color: ${s.backgroundColor || \'transparent\'};"><tr><td style="padding: ${paddingVertical} ${s.paddingRight || \'25px\'} ${s.paddingBottom || \'15px\'} ${paddingHorizontal}; font-family: ${bodyStyle.fontFamily || "Arial, sans-serif"}; font-size: ${s.fontSize || \'15px\'}; font-style: ${s.fontStyle || \'italic\'}; line-height: 1.6; color: ${s.color || \'inherit\'}; text-align: ${s.textAlign || \'left\'}; font-weight: ${s.fontWeight || \'normal\'};">${b.content}</td></tr></table></td>`);'
    );

    code = code.replace(
        /return `\s*<tr>\s*<td style="\${paddingCss} \${getBackgroundStyle\(s\)}">\s*<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse; background-color: \${s\.backgroundColor \|\| '#ffffff'}; border-radius: \${sanitizeRadius\(s\.borderRadius \|\| '12px'\)}; border: 1px solid #eeeeee;">([\s\S]*?)<\/table>\s*<\/td>\s*<\/tr>\s*`;/g,
        'return wrapWithMargin(`\\n                    <td style="${paddingCss} ${getBackgroundStyle(s)}">\\n                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse: collapse; background-color: ${s.backgroundColor || \'#ffffff\'}; border-radius: ${sanitizeRadius(s.borderRadius || \'12px\')}; border: 1px solid #eeeeee;">$1</table>\\n                    </td>\\n                `);'
    );

    code = code.replace(
        /return `\s*<tr>\s*<td align="center" style="\${paddingCss} \${getBackgroundStyle\(s\)}">\s*(<!-- Timer Container -->[\s\S]*?)<\/td>\s*<\/tr>\s*`;/g,
        'return wrapWithMargin(`\\n                    <td align="center" style="${paddingCss} ${getBackgroundStyle(s)}">\\n                        $1                    </td>\\n                `);'
    );

    code = code.replace(
        /return `\s*<tr>\s*<td style="\${paddingCss} \${getBackgroundStyle\(s\)} border-radius: \${sanitizeRadius\(s\.borderRadius \|\| '0'\)}; overflow: hidden;">\s*<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="\${maxW}">([\s\S]*?)<\/td><\/tr><\/tbody><\/table>\s*<\/td>\s*<\/tr>\s*`;/g,
        'return wrapWithMargin(`\\n                    <td style="${paddingCss} ${getBackgroundStyle(s)} border-radius: ${sanitizeRadius(s.borderRadius || \'0\')}; overflow: hidden;">\\n                        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="${maxW}">$1</td></tr></tbody></table>\\n                    </td>\\n                `);'
    );

    code = code.replace(
        /return `\s*<tr>\s*<td style="\${paddingCss}">\s*(<!--\[if mso\]><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td><!\[endif\]-->[\s\S]*?<!--\[if mso\]><\/td><\/tr><\/table><!\[endif\]-->)\s*<\/td>\s*<\/tr>\s*`\.trim\(\);/g,
        'return wrapWithMargin(`\\n                    <td style="${paddingCss}">\\n                        $1\\n                    </td>\\n                `).trim();'
    );
    
    code = code.replace(
        /return `\s*<tr>\s*<td align="center">\s*<table border="0" cellpadding="0" cellspacing="0" width="\${s\.width \|\| '100%'}" style="display: inline-table; max-width: 100%; \${marginCss} border-radius: \${sanitizeRadius\(s\.borderRadius \|\| '8px'\)}; overflow: hidden; border-collapse: separate;">([\s\S]*?)<\/td>\s*<\/tr>\s*`\.trim\(\);/g,
        'return wrapWithMargin(`\\n                    <td align="center">\\n                        <table border="0" cellpadding="0" cellspacing="0" width="${s.width || \'100%\'}" style="display: inline-table; max-width: 100%; border-radius: ${sanitizeRadius(s.borderRadius || \'8px\')}; overflow: hidden; border-collapse: separate;">$1\\n                    </td>\\n                `).trim();'
    );

    code = code.replace(
        /return `<tr><td align="\${align}" style="\${paddingCss} \${getBackgroundStyle\(s\)} \${radiusStyle} text-align: \${align};"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display: inline-table;"><tr>\${icons}<\/tr><\/table><\/td><\/tr>`;/,
        'return wrapWithMargin(`<td align="${align}" style="${paddingCss} ${getBackgroundStyle(s)} ${radiusStyle} text-align: ${align};"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="display: inline-table;"><tr>${icons}</tr></table></td>`);'
    );

    code = code.replace(
        /const hasMargin = \[s\.marginTop, s\.marginBottom, s\.marginLeft, s\.marginRight\]\s*\.some\(m => m && m !== '0' && m !== '0px' && m !== 'auto'\);\s*if \(hasMargin\) \{\s*return `<tr><td style="padding: 0;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; \${marginCss}"><tr><td align="\${align}" style="\${paddingCss} \${commonStyle} font-size: \${s\.fontSize \|\| '14px'}; line-height: \${s\.lineHeight \|\| '1\.5'}; \${getBackgroundStyle\(s\)} \${radiusStyle} \${borderCss} \${overflowCss} text-align: \${align};">\${b\.content}<\/td><\/tr><\/table><\/td><\/tr>`;\s*\}\s*return `<tr><td align="\${align}" style="\${paddingCss} \${commonStyle} font-size: \${s\.fontSize \|\| '14px'}; line-height: \${s\.lineHeight \|\| '1\.5'}; \${getBackgroundStyle\(s\)} \${radiusStyle} \${borderCss} \${overflowCss} text-align: \${align};">\${b\.content}<\/td><\/tr>`;/g,
        'return wrapWithMargin(`<td align="${align}" style="${paddingCss} ${commonStyle} font-size: ${s.fontSize || \'14px\'}; line-height: ${s.lineHeight || \'1.5\'}; ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} ${overflowCss} text-align: ${align};">${b.content}</td>`);'
    );

    code = code.replace(
        /if \(b\.url\) \{\s*return `<tr><td align="\${align}" width="100%" style="width: 100%; \${marginCss} \${paddingCss} \${getBackgroundStyle\(s\)} \${radiusStyle} \${borderCss} text-align: \${align};"><a href="\${b\.url}" target="_blank" style="display: block; text-decoration: none; width: 100%;">\${imgHtml}<\/a><\/td><\/tr>`;\s*\}\s*return `<tr><td align="\${align}" width="100%" style="width: 100%; \${marginCss} \${paddingCss} \${getBackgroundStyle\(s\)} \${radiusStyle} \${borderCss} text-align: \${align};">\${imgHtml}<\/td><\/tr>`;/g,
        `if (b.url) {
                return wrapWithMargin(\`<td align="\${align}" width="100%" style="width: 100%; \${paddingCss} \${getBackgroundStyle(s)} \${radiusStyle} \${borderCss} text-align: \${align};"><a href="\${b.url}" target="_blank" style="display: block; text-decoration: none; width: 100%;">\${imgHtml}</a></td>\`);
            }
            return wrapWithMargin(\`<td align="\${align}" width="100%" style="width: 100%; \${paddingCss} \${getBackgroundStyle(s)} \${radiusStyle} \${borderCss} text-align: \${align};">\${imgHtml}</td>\`);`
    );

    code = code.replace(
        /if \(b\.type === 'divider'\) return `<tr><td style="\${marginCss} \${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td height="1" style="font-size: 1px; line-height: 1px; border-top: \${s\.borderTopWidth \|\| '1px'} \${s\.borderStyle \|\| 'solid'} \${s\.borderColor \|\| '#eeeeee'}; mso-line-height-rule: exactly;">&nbsp;<\/td><\/tr><\/table><\/td><\/tr>`;/,
        'if (b.type === \'divider\') return wrapWithMargin(`<td style="${paddingCss}"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td height="1" style="font-size: 1px; line-height: 1px; border-top: ${s.borderTopWidth || \'1px\'} ${s.borderStyle || \'solid\'} ${s.borderColor || \'#eeeeee\'}; mso-line-height-rule: exactly;">&nbsp;</td></tr></table></td>`);'
    );

    code = code.replace(
        /if \(b\.type === 'spacer'\) \{ const h = parseInt\(s\.height\?\.replace\('px', ''\) \|\| '20'\); return `<tr><td height="\${h}" style="font-size: \${h}px; line-height: \${h}px; mso-line-height-rule: exactly; \${getBackgroundStyle\(s\)}">&nbsp;<\/td><\/tr>`; \}/g,
        'if (b.type === \'spacer\') { const h = parseInt(s.height?.replace(\'px\', \'\') || \'20\'); return wrapWithMargin(`<td height="${h}" style="font-size: ${h}px; line-height: ${h}px; mso-line-height-rule: exactly; ${getBackgroundStyle(s)}">&nbsp;</td>`); }'
    );

    // Default fallback
    code = code.replace(
        /return `<tr><td align="\${align}" style="\${marginCss} \${paddingCss} \${commonStyle} \${getBackgroundStyle\(s\)} \${radiusStyle} \${borderCss} text-align: \${align};">\${b\.content}<\/td><\/tr>`;/,
        'return wrapWithMargin(`<td align="${align}" style="${paddingCss} ${commonStyle} ${getBackgroundStyle(s)} ${radiusStyle} ${borderCss} text-align: ${align};">${b.content}</td>`);'
    );
}

fs.writeFileSync(fn, code);
console.log("Done");
