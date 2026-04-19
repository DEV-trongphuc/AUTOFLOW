<?php
// api/sync_engine.php

class SyncEngine
{
    private $pdo;
    private $mapEmail = [];
    private $mapPhone = [];
    private $mapMeta = [];
    private $mapZalo = [];

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Load existing identity maps from database to memory
     * Optimized for bulk processing
     */
    public function loadMaps()
    {
        // Load Email Map
        $stmt = $this->pdo->query("SELECT email, id FROM subscribers WHERE email IS NOT NULL AND email != ''");
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $this->mapEmail[strtolower(trim($row[0]))] = $row[1];
        }

        // Load Phone Map (Normalized)
        $stmt = $this->pdo->query("SELECT phone_number, id FROM subscribers WHERE phone_number IS NOT NULL AND phone_number != ''");
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $norm = self::normalizePhone($row[0]);
            if ($norm) {
                $this->mapPhone[$norm] = $row[1];
            }
        }

        // Load Meta PSID Map
        $stmt = $this->pdo->query("SELECT meta_psid, id FROM subscribers WHERE meta_psid IS NOT NULL AND meta_psid != ''");
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $this->mapMeta[$row[0]] = $row[1];
        }

        // Load Zalo User ID Map
        $stmt = $this->pdo->query("SELECT zalo_user_id, id FROM subscribers WHERE zalo_user_id IS NOT NULL AND zalo_user_id != ''");
        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
            $this->mapZalo[$row[0]] = $row[1];
        }
    }

    /**
     * Resolve Subscriber ID based on any available identifier.
     * Order of Precedence: Meta PSID > Zalo ID > Email > Phone
     */
    public function resolveId($email, $phone, $psid = null, $zaloId = null)
    {
        // 1. Check Social IDs (Strongest Link)
        if ($psid && isset($this->mapMeta[$psid])) {
            return $this->mapMeta[$psid];
        }
        if ($zaloId && isset($this->mapZalo[$zaloId])) {
            return $this->mapZalo[$zaloId];
        }

        // 2. Check Email
        $cleanEmail = strtolower(trim($email));
        if ($cleanEmail && isset($this->mapEmail[$cleanEmail])) {
            return $this->mapEmail[$cleanEmail];
        }

        // 3. Check Phone
        $normPhone = self::normalizePhone($phone);
        if ($normPhone && isset($this->mapPhone[$normPhone])) {
            return $this->mapPhone[$normPhone];
        }

        return null; // New Subscriber
    }

    /**
     * Helper to normalize phone numbers for consistent comparison
     * Handles +84, 84, 0... format -> 0... format (Standard VN)
     */
    public static function normalizePhone($phone)
    {
        if (!$phone)
            return '';

        // Remove non-digits
        $digits = preg_replace('/[^0-9]/', '', $phone);

        // Remove leading 84 if present and long enough (e.g. 8490... -> 090...)
        if (substr($digits, 0, 2) === '84' && strlen($digits) > 9) {
            $digits = '0' . substr($digits, 2);
        }

        return $digits;
    }

    /**
     * Get Identity Maps (Debugging/Stats)
     */
    public function getStats()
    {
        return [
            'emails' => count($this->mapEmail),
            'phones' => count($this->mapPhone),
            'meta_ids' => count($this->mapMeta),
            'zalo_ids' => count($this->mapZalo)
        ];
    }
}
?>
