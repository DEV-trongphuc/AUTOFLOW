$lines = Get-Content e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql
$output = @()
$currentTable = ""

foreach ($line in $lines) {
    if ($line -match "ALTER TABLE ``([^``]+)``") {
        $currentTable = $matches[1]
    }
    
    $skip = $false
    if ($line -match "ADD KEY ``([^``]+)``") {
        $keyName = $matches[1]
        
        if ($currentTable -eq "subscribers" -and ($keyName -eq "idx_sub_zalo" -or $keyName -eq "idx_meta_psid" -or $keyName -eq "idx_status" -or $keyName -eq "idx_sub_workspace_status")) { $skip = $true }
        if ($currentTable -eq "web_sessions" -and ($keyName -eq "idx_property_id" -or $keyName -eq "idx_prop_visitor")) { $skip = $true }
        if ($currentTable -eq "raw_event_buffer" -and ($keyName -eq "idx_processed" -or $keyName -eq "idx_processing")) { $skip = $true }
        if ($currentTable -eq "zalo_message_queue" -and ($keyName -eq "idx_zalo_user_processed")) { $skip = $true }
        if ($currentTable -eq "mail_delivery_logs" -and ($keyName -eq "idx_subscriber_id" -or $keyName -eq "idx_status" -or $keyName -eq "idx_recipient" -or $keyName -eq "idx_campaign_status")) { $skip = $true }
        if ($currentTable -eq "ai_conversations" -and ($keyName -eq "property_id" -or $keyName -eq "idx_conv_last_msg" -or $keyName -eq "visitor_id")) { $skip = $true }
        if ($currentTable -eq "subscriber_flow_states" -and ($keyName -eq "idx_sfs_sub_flow" -or $keyName -eq "idx_sfs_status_sched")) { $skip = $true }
    }
    
    if (-not $skip) {
        $output += $line
    }
}

Set-Content -Path e:\AUTOFLOW\AUTOMATION_FLOW\api\database.sql -Value $output -Encoding UTF8
