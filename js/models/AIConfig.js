// js/models/AIConfig.js
import { getCollection, saveCollection, initDB } from '../utils/db.js';

const DEFAULT_AI_CONFIG = {
    enabled: true,
    provider: 'NVIDIA',
    model: 'meta/llama-3.2-11b-vision-instruct',
    modelDisplay: 'NVIDIA AI (Llama 3.2 NIM)',
    connectionStatus: 'Terhubung',
    lastChecked: new Date().toISOString(),
    lastStatus: 'Normal',
    totalTests: 0,
    allowedTopics: [
        'Pelayanan RT/RW',
        'Pengajuan pelayanan',
        'Pengajuan surat',
        'Persyaratan surat',
        'Status pengajuan',
        'Pengaduan warga',
        'Pengumuman',
        'Kas & iuran',
        'Penggunaan aplikasi Digital RW',
        'Informasi umum pelayanan warga'
    ],
    securityRules: [
        'Tidak memberikan data pribadi warga',
        'Tidak memberikan NIK',
        'Tidak memberikan nomor KK',
        'Tidak memberikan nomor HP',
        'Tidak memberikan alamat pribadi',
        'Tidak memberikan data warga lain',
        'Tidak mengungkap password/token/API Key',
        'Tidak mengarang data warga',
        'Tidak mengarang status pengajuan',
        'Tidak memberikan kode pemrograman'
    ]
};

export function getAIConfig() {
    initDB();
    const configs = getCollection('ai_config');
    if (!configs || configs.length === 0) {
        saveCollection('ai_config', [DEFAULT_AI_CONFIG]);
        return { ...DEFAULT_AI_CONFIG };
    }
    return { ...DEFAULT_AI_CONFIG, ...configs[0] };
}

export function updateAIStatus(enabled) {
    initDB();
    const current = getAIConfig();
    current.enabled = Boolean(enabled);
    current.lastChecked = new Date().toISOString();
    saveCollection('ai_config', [current]);

    // Sinkronisasi status aktif/nonaktif ke backend server
    try {
        const endpoints = [
            "api/nvidia.php",
            "./api/nvidia.php",
            "http://localhost/project%20RPL/api/nvidia.php"
        ];
        endpoints.forEach(ep => {
            fetch(ep, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "set_ai_status", enabled: current.enabled })
            }).catch(() => {});
        });
    } catch (e) {}

    return current;
}

export function logAIActivity(isSuccess = true) {
    initDB();
    const current = getAIConfig();
    current.lastChecked = new Date().toISOString();
    current.lastStatus = isSuccess ? 'Normal' : 'Terjadi Masalah Koneksi AI';
    current.totalTests = (current.totalTests || 0) + 1;
    saveCollection('ai_config', [current]);
    return current;
}

export function isAIEnabled() {
    const config = getAIConfig();
    return config.enabled !== false;
}
