<?php
// api/db_helper.php
// Central database and request helper for Digital RW Backend

date_default_timezone_set('Asia/Jakarta');

function setCorsHeaders() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Role, X-User-Id, X-User-RT, X-User-NIK, *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT, PATCH");
    header("Content-Type: application/json; charset=UTF-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function getDatabasePath() {
    return __DIR__ . '/database.json';
}

function getConfigPath() {
    return __DIR__ . '/config.json';
}

function loadDatabase() {
    $filePath = getDatabasePath();
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $data = json_decode($content, true);
        if (is_array($data)) {
            // Ensure all essential collections exist
            if (!isset($data['warga']) || !is_array($data['warga'])) $data['warga'] = [];
            if (!isset($data['users']) || !is_array($data['users'])) $data['users'] = [];
            if (!isset($data['pelayanan']) || !is_array($data['pelayanan'])) $data['pelayanan'] = [];
            if (!isset($data['pengaduan']) || !is_array($data['pengaduan'])) $data['pengaduan'] = [];
            if (!isset($data['kegiatan']) || !is_array($data['kegiatan'])) $data['kegiatan'] = [];
            if (!isset($data['pengumuman']) || !is_array($data['pengumuman'])) $data['pengumuman'] = [];
            if (!isset($data['kas']) || !is_array($data['kas'])) $data['kas'] = [];
            if (!isset($data['wilayah']) || !is_array($data['wilayah'])) $data['wilayah'] = [];
            if (!isset($data['notifikasi']) || !is_array($data['notifikasi'])) $data['notifikasi'] = [];
            if (!isset($data['notification_logs']) || !is_array($data['notification_logs'])) $data['notification_logs'] = [];
            if (!isset($data['notification_preferences']) || !is_array($data['notification_preferences'])) $data['notification_preferences'] = [];
            return $data;
        }
    }
    return [
        'users' => [],
        'warga' => [],
        'pelayanan' => [],
        'pengaduan' => [],
        'kegiatan' => [],
        'pengumuman' => [],
        'kas' => [],
        'wilayah' => [],
        'notifikasi' => [],
        'notification_logs' => [],
        'notification_preferences' => [],
        'ai_config' => ['enabled' => true]
    ];
}

function saveDatabase($data) {
    $filePath = getDatabasePath();
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $res = file_put_contents($filePath, $json, LOCK_EX);

    // Mirroring otomatis ke file backup yang ada
    $backupFolders = glob(__DIR__ . '/backup_*', GLOB_ONLYDIR);
    if (!empty($backupFolders)) {
        foreach ($backupFolders as $folder) {
            $backupFile = $folder . '/database_laragon.json';
            @file_put_contents($backupFile, $json, LOCK_EX);
        }
    }

    return $res;
}

function syncDatabaseWithBackup($data) {
    return saveDatabase($data);
}

function loadConfig() {
    $configPath = getConfigPath();
    $defaultConfig = [
        'email' => [
            'enabled' => false,
            'provider' => 'smtp',
            'smtp_host' => '',
            'smtp_port' => 587,
            'smtp_user' => '',
            'smtp_pass' => '',
            'from_email' => 'no-reply@rwdigital.id',
            'from_name' => 'Sistem Digital RW 05',
            'configured' => false
        ],
        'whatsapp' => [
            'enabled' => false,
            'provider' => 'whatsapp_cloud_api',
            'api_url' => 'https://graph.facebook.com/v19.0',
            'phone_number_id' => '',
            'access_token' => '',
            'from_phone' => '',
            'template_namespace' => '',
            'configured' => false
        ]
    ];

    if (file_exists($configPath)) {
        $content = file_get_contents($configPath);
        $data = json_decode($content, true);
        if (is_array($data)) {
            return array_merge($defaultConfig, $data);
        }
    } else {
        file_put_contents($configPath, json_encode($defaultConfig, JSON_PRETTY_PRINT));
    }
    return $defaultConfig;
}

function saveConfig($config) {
    $configPath = getConfigPath();
    return file_put_contents($configPath, json_encode($config, JSON_PRETTY_PRINT), LOCK_EX);
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        $raw = @file_get_contents('php://stdin');
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getAuthenticatedUser($input = []) {
    // 1. Try from input userContext
    if (isset($input['userContext']) && is_array($input['userContext'])) {
        return $input['userContext'];
    }
    // 2. Try from headers
    $role = isset($_SERVER['HTTP_X_USER_ROLE']) ? $_SERVER['HTTP_X_USER_ROLE'] : null;
    $id = isset($_SERVER['HTTP_X_USER_ID']) ? $_SERVER['HTTP_X_USER_ID'] : null;
    $rt = isset($_SERVER['HTTP_X_USER_RT']) ? $_SERVER['HTTP_X_USER_RT'] : (isset($_GET['rt']) ? $_GET['rt'] : null);
    $nik = isset($_SERVER['HTTP_X_USER_NIK']) ? $_SERVER['HTTP_X_USER_NIK'] : (isset($_GET['nik']) ? $_GET['nik'] : null);
    if ($role) {
        return [
            'id' => $id,
            'role' => $role,
            'rt' => $rt,
            'nik' => $nik
        ];
    }
    return null;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}
