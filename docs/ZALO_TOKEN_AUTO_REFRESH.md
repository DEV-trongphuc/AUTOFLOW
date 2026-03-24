# Zalo Token Auto-Refresh Setup Guide

## Overview
This system automatically refreshes Zalo OA access tokens before they expire, preventing automation and tracking failures.

## Components

### 1. **worker_zalo_token.php**
- Checks all active Zalo OA configs
- Refreshes tokens expiring within 24 hours
- Updates token_status in database
- Logs results for monitoring

### 2. **ensureZaloToken() in zalo_helpers.php**
- Centralized token validation and refresh logic
- Used by all Zalo APIs (automation, tracking, broadcast)
- Automatically refreshes expired tokens
- 5-minute buffer before expiry

### 3. **Database Fields**
- `token_status`: healthy | expiring | expired | unknown
- `last_token_check`: Last check/refresh timestamp
- `token_expires_at`: Token expiration time

## Setup Instructions

### Step 1: Run Migration
```bash
# Add token status fields to database
curl http://localhost:3000/api/migrations/add_zalo_token_status.php
```

### Step 2: Setup Cron Job (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add this line to run every hour
0 * * * * curl http://localhost:3000/api/worker_zalo_token.php >> /var/log/zalo_token_refresh.log 2>&1
```

### Step 3: Setup Task Scheduler (Windows)
```powershell
# Create a scheduled task to run every hour
schtasks /create /tn "Zalo Token Refresh" /tr "curl http://localhost:3000/api/worker_zalo_token.php" /sc hourly /st 00:00
```

### Step 4: Manual Test
```bash
# Test the worker manually
curl http://localhost:3000/api/worker_zalo_token.php
```

## How It Works

### Automatic Refresh Flow
1. **Hourly Check**: Cron job runs `worker_zalo_token.php`
2. **Token Validation**: Checks all active OA configs
3. **Refresh Logic**:
   - If token expires < 24 hours → Refresh now
   - If token healthy → Update check timestamp
   - If refresh fails → Mark as expired
4. **Status Update**: Updates `token_status` field
5. **Logging**: Records results for monitoring

### Real-time Refresh
- All Zalo APIs use `ensureZaloToken()`
- Checks token before each API call
- Auto-refreshes if expired or expiring < 5 minutes
- Transparent to end users

## Token Status Values

| Status | Description | Action |
|--------|-------------|--------|
| `healthy` | Token valid for > 24 hours | No action needed |
| `expiring` | Token expires < 24 hours | Will be refreshed soon |
| `expired` | Token has expired | Requires refresh |
| `unknown` | Status not yet checked | Will be checked on next run |

## Monitoring

### Check Token Status
```sql
SELECT 
    oa_name,
    token_status,
    token_expires_at,
    last_token_check,
    TIMESTAMPDIFF(HOUR, NOW(), token_expires_at) as hours_until_expiry
FROM zalo_oa_configs
WHERE status = 'active'
ORDER BY token_expires_at ASC;
```

### View Worker Logs
```bash
# Linux/Mac
tail -f /var/log/zalo_token_refresh.log

# Windows Event Viewer
eventvwr.msc
```

### Manual Refresh
```bash
# Force refresh for specific OA
curl "http://localhost:3000/api/worker_zalo_token.php"
```

## Troubleshooting

### Token Refresh Fails
**Symptoms**: `token_status = 'expired'` after refresh attempt

**Possible Causes**:
1. Invalid `refresh_token` in database
2. Zalo API endpoint down
3. App credentials (`app_id`, `app_secret`) incorrect
4. Network connectivity issues

**Solution**:
1. Check error logs: `error_log` in PHP
2. Verify app credentials in Zalo Developer Console
3. Re-authenticate OA via OAuth flow
4. Check `zalo_oa_configs` table for correct values

### Cron Job Not Running
**Check**:
```bash
# Linux/Mac
crontab -l  # List all cron jobs
grep CRON /var/log/syslog  # Check cron execution logs

# Windows
schtasks /query /tn "Zalo Token Refresh"
```

### Token Expires Too Quickly
**Note**: Zalo access tokens typically last 90 days, refresh tokens last 1 year.

**If tokens expire faster**:
1. Check Zalo Developer Console for app settings
2. Verify `token_expires_at` calculation in code
3. Contact Zalo support if issue persists

## Best Practices

1. **Monitor Regularly**: Check token status weekly
2. **Log Rotation**: Rotate worker logs to prevent disk fill
3. **Alert Setup**: Set up alerts for failed refreshes
4. **Backup Tokens**: Store refresh tokens securely
5. **Test After Updates**: Test token refresh after Zalo API changes

## API Integration

All Zalo APIs automatically use token refresh:

### ✅ Already Integrated
- `webhook.php` - Zalo webhook handler
- `zalo_sender.php` - ZNS message sending
- `zalo_broadcast.php` - Broadcast campaigns
- `zalo_automation.php` - Automation flows

### Example Usage
```php
// In any Zalo API endpoint
require_once 'zalo_helpers.php';

$accessToken = ensureZaloToken($pdo, $oaConfigId);

if (!$accessToken) {
    // Token refresh failed
    return ['error' => 'Unable to authenticate with Zalo'];
}

// Use $accessToken for API calls
```

## Security Notes

- Tokens are stored encrypted in database
- Refresh tokens are never exposed to frontend
- All token operations logged for audit
- Failed refresh attempts trigger alerts

## Support

For issues or questions:
1. Check error logs first
2. Verify database migration completed
3. Test manual token refresh
4. Contact system administrator

---

**Last Updated**: 2026-01-07
**Version**: 1.0
