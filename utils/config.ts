/**
 * Core Configuration Hub
 */

// Determine if running locally (e.g., localhost or 127.0.0.1)
export const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Resolve API_BASE_URL: (Internal context, resolves to local proxy if in Dev Mode)
export const API_BASE_URL = typeof window !== 'undefined' && localStorage.getItem('mailflow_api_url') 
    ? localStorage.getItem('mailflow_api_url')! 
    : (isLocal ? '/mail_api' : 'https://automation.ideas.edu.vn/mail_api');

// Resolve EXTERNAL_API_BASE: (External context for webhooks, embedded scripts, HTML image sources)
// ALWAYS returns absolute URL pointing to the production server.
export const EXTERNAL_API_BASE = 'https://automation.ideas.edu.vn/mail_api';

// Derived Asset Base for static UI images 
export const EXTERNAL_ASSET_BASE = EXTERNAL_API_BASE.replace('/mail_api', '');
