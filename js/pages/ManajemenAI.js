// js/pages/ManajemenAI.js
import { getAIConfig, updateAIStatus, isAIEnabled } from '../models/AIConfig.js';
export function renderManajemenAI() {
    const config = getAIConfig();
    const isEnabled = config.enabled;
    const formattedDate = config.lastChecked ? new Date(config.lastChecked).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleString('id-ID');

    // Baca custom provider yang ditambahkan manual oleh user ke localStorage
    let customProviders = [];
    try {
        if (typeof localStorage !== 'undefined') {
            const storedProviders = localStorage.getItem('ai_custom_providers');
            if (storedProviders) {
                const parsed = JSON.parse(storedProviders);
                if (Array.isArray(parsed)) customProviders = parsed;
            }
            const storedModels = localStorage.getItem('ai_custom_models');
            if (storedModels) {
                const parsedModels = JSON.parse(storedModels);
                if (Array.isArray(parsedModels)) {
                    parsedModels.forEach(m => {
                        if (m.provider && !customProviders.includes(m.provider) && m.provider !== 'NVIDIA') {
                            customProviders.push(m.provider);
                        }
                    });
                }
            }
        }
    } catch (e) {}

    const allProviders = Array.from(new Set(['NVIDIA', ...customProviders]));
    const savedProvider = (typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_provider')) || 'NVIDIA';
    const savedModel = (typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_model')) || 'meta/llama-3.2-11b-vision-instruct';

    return `
        <div class="manajemen-ai-page" style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- Page Header Area -->
            <div class="card" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; border-radius: 16px; padding: 1.75rem 2rem; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1.25rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.5rem;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                                <i class="ph-fill ph-robot"></i>
                            </div>
                            <h1 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #ffffff;">Manajemen AI</h1>
                            <span class="badge" style="background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.3); font-size: 0.75rem; padding: 3px 10px; border-radius: 9999px;">
                                Super Admin
                            </span>
                        </div>
                        <p style="color: #94a3b8; font-size: 0.95rem; margin: 0; max-width: 700px; line-height: 1.5;">
                            Kelola konfigurasi, batasan pengetahuan, keamanan, dan pengujian RW Assistant.
                        </p>
                    </div>

                    <!-- Header Quick Info Badges -->
                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
                        <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Status AI:</span>
                            <span id="headerStatusBadge" style="font-size: 0.85rem; font-weight: 700; color: ${isEnabled ? '#4ade80' : '#f87171'}; display: inline-flex; align-items: center; gap: 5px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isEnabled ? '#4ade80' : '#f87171'}; display: inline-block;"></span>
                                ${isEnabled ? 'Aktif' : 'Dinonaktifkan'}
                            </span>
                        </div>
                        <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Model AI:</span>
                            <span id="headerModelBadge" style="font-size: 0.85rem; font-weight: 700; color: #f1f5f9;">${savedModel}</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Provider:</span>
                            <span id="headerProviderBadge" style="font-size: 0.85rem; font-weight: 700; color: ${savedProvider === 'NVIDIA' ? '#76b900' : (savedProvider === 'Google Gemini' ? '#60a5fa' : (savedProvider === 'Groq' ? '#f97316' : '#a855f7'))};">${savedProvider}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Grid: Status & Konfigurasi -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem;">
                
                <!-- Card 1: Status AI & Kontrol Aktif/Nonaktif -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                    <i class="ph-fill ph-power"></i>
                                </div>
                                <div>
                                    <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">1. Status AI Assistant</h3>
                                    <span style="font-size: 0.8rem; color: #64748b;">Kontrol operasional RW Assistant</span>
                                </div>
                            </div>
                            <span id="aiStatePill" class="badge" style="background: ${isEnabled ? '#dcfce7' : '#fee2e2'}; color: ${isEnabled ? '#166534' : '#991b1b'}; border: 1px solid ${isEnabled ? '#bbf7d0' : '#fecaca'}; font-size: 0.8rem; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">
                                ${isEnabled ? '🟢 AKTIF' : '🔴 NONAKTIF'}
                            </span>
                        </div>

                        <p id="aiStateDesc" style="font-size: 0.875rem; color: #475569; line-height: 1.5; margin: 0;">
                            ${isEnabled 
                                ? 'RW Assistant saat ini <strong>AKTIF</strong> dan dapat digunakan oleh warga serta pengguna sistem Digital RW.' 
                                : 'RW Assistant sedang <strong>DINONAKTIFKAN</strong>. Warga yang membuka AI Assistant akan menerima pesan pemberitahuan bahwa asisten dinonaktifkan sementara.'}
                        </p>

                        <!-- Kotak Info Ringkas Status Operasional -->
                        <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; padding-bottom: 0.5rem; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; display: flex; align-items: center; gap: 6px;">
                                    <i class="ph-bold ph-users-three" style="color: #3b82f6;"></i> Akses Pengguna
                                </span>
                                <span style="font-weight: 600; color: #1e293b;">Warga & Pengurus RT/RW</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem; padding-bottom: 0.5rem; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; display: flex; align-items: center; gap: 6px;">
                                    <i class="ph-bold ph-clock" style="color: #10b981;"></i> Mode Layanan
                                </span>
                                <span style="font-weight: 600; color: #1e293b;">Otomatis 24/7 (Real-time)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.825rem;">
                                <span style="color: #64748b; display: flex; align-items: center; gap: 6px;">
                                    <i class="ph-bold ph-database" style="color: #8b5cf6;"></i> Basis Pengetahuan
                                </span>
                                <span style="font-weight: 600; color: #1e293b;">Data & Layanan Digital RW</span>
                            </div>
                        </div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: auto;">
                        <div>
                            <span style="font-weight: 600; font-size: 0.9rem; color: #1e293b; display: block;">Sakelar AI Assistant</span>
                            <span style="font-size: 0.775rem; color: #64748b;">Ubah status aktif untuk seluruh pengguna</span>
                        </div>
                        <button id="btnToggleAIStatus" class="btn" style="background-color: ${isEnabled ? '#dc2626' : '#16a34a'}; color: white; font-weight: 600; font-size: 0.875rem; padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;">
                            <i class="ph-bold ${isEnabled ? 'ph-power' : 'ph-check'}"></i>
                            ${isEnabled ? 'Nonaktifkan AI' : 'Aktifkan AI'}
                        </button>
                    </div>
                </div>

                <!-- Card 2: Konfigurasi AI -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.25rem;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                                <i class="ph-fill ph-sliders"></i>
                            </div>
                            <div>
                                <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">2. Konfigurasi AI</h3>
                                <span style="font-size: 0.8rem; color: #64748b;">Pengaturan provider, model, dan kredensial AI</span>
                            </div>
                        </div>

                        <!-- Success Toast Alert Container inside Card 2 -->
                        <div id="aiConfigAlert" style="display: none; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 8px; padding: 10px 14px; font-size: 0.825rem; font-weight: 600; margin-bottom: 1rem; align-items: center; gap: 8px;">
                            <i class="ph-fill ph-check-circle" style="font-size: 1.1rem; color: #10b981;"></i>
                            <span id="aiConfigAlertText">Konfigurasi AI berhasil diperbarui!</span>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.875rem;">
                            <!-- 1. Dropdown Provider -->
                            <div style="display: flex; flex-direction: column; gap: 0.35rem; padding-bottom: 0.75rem; border-bottom: 1px dashed #e2e8f0;">
                                <label for="selectAIProvider" style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Provider AI</label>
                                <div style="position: relative;">
                                    <select id="selectAIProvider" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; font-weight: 600; color: #1e293b; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; cursor: pointer; transition: all 0.2s;">
                                        ${allProviders.map(p => `<option value="${p}" ${savedProvider === p ? 'selected' : ''}>${p}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- 2. Dropdown Model Digunakan & Tombol Tambah Model -->
                            <div style="display: flex; flex-direction: column; gap: 0.35rem; padding-bottom: 0.75rem; border-bottom: 1px dashed #e2e8f0;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label for="selectAIModel" style="color: #64748b; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Model Digunakan</label>
                                    <button id="btnToggleTambahModel" type="button" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 0.775rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;">
                                        <i class="ph-bold ph-plus"></i> Tambah Model
                                    </button>
                                </div>
                                <div style="position: relative;">
                                    <select id="selectAIModel" style="width: 100%; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: #2563eb; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; cursor: pointer; transition: all 0.2s;">
                                        <option value="${savedModel}" selected>${savedModel}</option>
                                    </select>
                                </div>

                                <!-- 3. Form Dinamis Tambah Model Baru (Collapsible) -->
                                <div id="formTambahModelContainer" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-top: 8px; flex-direction: column; gap: 10px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 700; font-size: 0.825rem; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                            <i class="ph-fill ph-plus-circle" style="color: #2563eb;"></i> Form Tambah Provider & Model Kustom
                                        </span>
                                        <button id="btnTutupTambahModel" type="button" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; padding: 2px;">
                                            <i class="ph-bold ph-x"></i>
                                        </button>
                                    </div>

                                    <!-- Tombol Pintasan Isi Cepat -->
                                    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                                        <span style="font-size: 0.725rem; font-weight: 600; color: #64748b;">Isi Cepat:</span>
                                        <button id="btnQuickGemini" type="button" title="Isi cepat Google Gemini" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 0.725rem; font-weight: 600; color: #1e40af; padding: 3px 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;">
                                            <i class="ph-bold ph-lightning" style="color: #3b82f6;"></i> Google Gemini
                                        </button>
                                        <button id="btnQuickGroq" type="button" title="Isi cepat Groq" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 0.725rem; font-weight: 600; color: #c2410c; padding: 3px 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;">
                                            <i class="ph-bold ph-lightning" style="color: #f97316;"></i> Groq
                                        </button>
                                        <button id="btnQuickOpenRouter" type="button" title="Isi cepat OpenRouter" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 5px; font-size: 0.725rem; font-weight: 600; color: #0369a1; padding: 3px 8px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;">
                                            <i class="ph-bold ph-lightning" style="color: #0284c7;"></i> OpenRouter
                                        </button>
                                    </div>

                                    <div>
                                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Nama Provider</label>
                                        <input id="inputProviderBaru" type="text" placeholder="Contoh: NVIDIA atau nama provider baru (misal: Google Gemini)" style="width: 100%; padding: 7px 10px; font-size: 0.825rem; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box;" />
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">Nama Model Baru</label>
                                        <input id="inputNamaModelBaru" type="text" placeholder="Contoh: meta/llama-3.2-11b-vision-instruct atau model baru" style="width: 100%; padding: 7px 10px; font-size: 0.825rem; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box;" />
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.75rem; font-weight: 600; color: #475569; margin-bottom: 4px;">API Key Baru (Opsional)</label>
                                        <input id="inputApiKeyBaru" type="password" placeholder="Masukkan API Key untuk model ini..." style="width: 100%; padding: 7px 10px; font-size: 0.825rem; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box;" />
                                    </div>
                                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
                                        <button id="btnBatalTambahModel" type="button" style="background: #ffffff; border: 1px solid #cbd5e1; color: #64748b; font-size: 0.8rem; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                            Batal
                                        </button>
                                        <button id="btnSimpanModelBaru" type="button" style="background: #2563eb; border: none; color: white; font-size: 0.8rem; font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
                                            <i class="ph-bold ph-floppy-disk"></i> Simpan Model
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Status Koneksi -->
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b;">Status Koneksi</span>
                                <span style="font-weight: 600; color: #16a34a; display: inline-flex; align-items: center; gap: 5px;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a; display: inline-block;"></span>
                                    Terhubung
                                </span>
                            </div>

                            <!-- API Key Display & Toggle -->
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px dashed #e2e8f0;">
                                <span style="color: #64748b; white-space: nowrap;">API Key</span>
                                <div style="display: inline-flex; align-items: center; gap: 6px; max-width: calc(100% - 70px); justify-content: flex-end;">
                                    <span id="apiKeyDisplay" style="font-family: monospace; letter-spacing: 2px; color: #64748b; background: #f1f5f9; padding: 3px 10px; border-radius: 6px; font-size: 0.85rem; word-break: break-all; transition: all 0.2s ease;">••••••••••••••••</span>
                                    <button id="btnToggleApiKey" type="button" title="Tampilkan API Key" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 7px; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: all 0.2s ease; flex-shrink: 0;">
                                        <i id="iconToggleApiKey" class="ph-bold ph-eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Tombol Simpan & Aktifkan Konfigurasi -->
                        <div style="margin-top: 1.25rem;">
                            <button id="btnSimpanKonfigurasiAI" type="button" style="width: 100%; background: #2563eb; color: #ffffff; border: none; font-weight: 600; font-size: 0.9rem; padding: 10px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(37,99,235,0.25); transition: all 0.2s;">
                                <i class="ph-bold ph-check-circle" style="font-size: 1.1rem;"></i>
                                Simpan & Aktifkan Konfigurasi
                            </button>
                        </div>
                    </div>

                    <div style="margin-top: 1rem; padding: 0.65rem 0.85rem; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; font-size: 0.775rem; color: #64748b; display: flex; align-items: center; gap: 6px;">
                        <i class="ph-fill ph-shield-check" style="color: #16a34a; font-size: 1rem;"></i>
                        <span>Kredensial API Key diisolasi pada backend server (Proxy) demi keamanan data.</span>
                    </div>
                </div>

            </div>

            <!-- Middle Grid: Batasan Pengetahuan & Aturan Keamanan -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.25rem;">
                
                <!-- Card 3: Batasan Pengetahuan RW Assistant -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="ph-fill ph-book-open"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">3. Batasan Pengetahuan RW Assistant</h3>
                            <span style="font-size: 0.8rem; color: #64748b;">Topik yang diperbolehkan dijawab AI</span>
                        </div>
                    </div>

                    <p style="font-size: 0.825rem; color: #475569; margin-bottom: 0.85rem;">
                        RW Assistant <strong>hanya menjawab topik resmi</strong> dalam lingkup sistem Digital RW:
                    </p>

                    <div style="display: grid; grid-template-columns: 1fr; gap: 0.45rem;">
                        ${config.allowedTopics.map(topic => `
                            <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #f1f5f9; padding: 7px 12px; border-radius: 8px; font-size: 0.85rem; color: #1e293b;">
                                <i class="ph-bold ph-check" style="color: #2563eb; font-size: 0.95rem;"></i>
                                <span>${topic}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; font-size: 0.775rem; color: #92400e;">
                        <i class="ph-fill ph-info"></i> <strong>Pemberitahuan:</strong> Jika user menanyakan di luar topik, AI akan menjawab: <em>"Maaf, saya hanya dapat membantu mengenai pelayanan dan informasi dalam sistem Digital RW."</em>
                    </div>
                </div>

                <!-- Card 4: Aturan Keamanan & Perlindungan Data -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                            <i class="ph-fill ph-shield-warning"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">4. Aturan Keamanan & Larangan AI</h3>
                            <span style="font-size: 0.8rem; color: #64748b;">Proteksi data pribadi & larangan coding</span>
                        </div>
                    </div>

                    <p style="font-size: 0.825rem; color: #475569; margin-bottom: 0.85rem;">
                        Aturan ketat yang <strong>wajib berlaku</strong> pada seluruh prompt & interaksi AI:
                    </p>

                    <div style="display: grid; grid-template-columns: 1fr; gap: 0.45rem;">
                        ${config.securityRules.map(rule => `
                            <div style="display: flex; align-items: center; gap: 8px; background: #fef2f2; border: 1px solid #fee2e2; padding: 7px 12px; border-radius: 8px; font-size: 0.85rem; color: #991b1b;">
                                <i class="ph-bold ph-shield-check" style="color: #dc2626; font-size: 0.95rem;"></i>
                                <span>${rule}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 1rem; padding: 0.75rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.775rem; color: #475569;">
                        <i class="ph-fill ph-lock-key"></i> <strong>Larangan Coding:</strong> Permintaan kode Python, HTML, CSS, JS, SQL, PHP, dll akan langsung ditolak secara tegas.
                    </div>
                </div>

            </div>

            <!-- Footer: Status Sistem AI -->
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569;">
                    <span style="font-weight: 600; color: #1e293b;">Status API:</span>
                    <span style="color: #16a34a; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a; display: inline-block;"></span>
                        🟢 Normal
                    </span>
                </div>
                <div style="font-size: 0.85rem; color: #64748b;">
                    Terakhir diperiksa: <span id="lastCheckedTime" style="font-weight: 600; color: #1e293b;">${formattedDate}</span>
                </div>
            </div>

        </div>
    `;
}

export function setupManajemenAIEvents() {
    const btnToggleAIStatus = document.getElementById('btnToggleAIStatus');
    const headerStatusBadge = document.getElementById('headerStatusBadge');
    const aiStatePill = document.getElementById('aiStatePill');
    const aiStateDesc = document.getElementById('aiStateDesc');
    const lastCheckedTime = document.getElementById('lastCheckedTime');

    // 1. Toggle Active / Disabled State
    if (btnToggleAIStatus) {
        btnToggleAIStatus.addEventListener('click', () => {
            const currentlyEnabled = isAIEnabled();
            const nextState = !currentlyEnabled;
            const updatedConfig = updateAIStatus(nextState);

            // Update UI components
            if (nextState) {
                headerStatusBadge.innerHTML = `
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #4ade80; display: inline-block;"></span>
                    Aktif
                `;
                headerStatusBadge.style.color = '#4ade80';

                aiStatePill.style.background = '#dcfce7';
                aiStatePill.style.color = '#166534';
                aiStatePill.style.borderColor = '#bbf7d0';
                aiStatePill.textContent = '🟢 AKTIF';

                aiStateDesc.innerHTML = 'RW Assistant saat ini <strong>AKTIF</strong> dan dapat digunakan oleh warga serta pengguna sistem Digital RW.';

                btnToggleAIStatus.style.backgroundColor = '#dc2626';
                btnToggleAIStatus.innerHTML = '<i class="ph-bold ph-power"></i> Nonaktifkan AI';
            } else {
                headerStatusBadge.innerHTML = `
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #f87171; display: inline-block;"></span>
                    Dinonaktifkan
                `;
                headerStatusBadge.style.color = '#f87171';

                aiStatePill.style.background = '#fee2e2';
                aiStatePill.style.color = '#991b1b';
                aiStatePill.style.borderColor = '#fecaca';
                aiStatePill.textContent = '🔴 NONAKTIF';

                aiStateDesc.innerHTML = 'RW Assistant sedang <strong>DINONAKTIFKAN</strong>. Warga yang membuka AI Assistant akan menerima pesan pemberitahuan bahwa asisten dinonaktifkan sementara.';

                btnToggleAIStatus.style.backgroundColor = '#16a34a';
                btnToggleAIStatus.innerHTML = '<i class="ph-bold ph-check"></i> Aktifkan AI';
            }

            if (lastCheckedTime) {
                lastCheckedTime.textContent = new Date().toLocaleString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
        });
    }

    // 2. Konfigurasi Provider, Model, & Custom Model Management
    const selectAIProvider = document.getElementById('selectAIProvider');
    const selectAIModel = document.getElementById('selectAIModel');
    const btnToggleTambahModel = document.getElementById('btnToggleTambahModel');
    const formTambahModelContainer = document.getElementById('formTambahModelContainer');
    const btnTutupTambahModel = document.getElementById('btnTutupTambahModel');
    const btnBatalTambahModel = document.getElementById('btnBatalTambahModel');
    const btnSimpanModelBaru = document.getElementById('btnSimpanModelBaru');
    const inputProviderBaru = document.getElementById('inputProviderBaru');
    const inputNamaModelBaru = document.getElementById('inputNamaModelBaru');
    const inputApiKeyBaru = document.getElementById('inputApiKeyBaru');
    const btnSimpanKonfigurasiAI = document.getElementById('btnSimpanKonfigurasiAI');
    const aiConfigAlert = document.getElementById('aiConfigAlert');
    const aiConfigAlertText = document.getElementById('aiConfigAlertText');
    const headerModelBadge = document.getElementById('headerModelBadge');
    const headerProviderBadge = document.getElementById('headerProviderBadge');

    // Fungsi sinkronisasi banner header gelap di atas secara real-time
    function syncHeaderBadges(prov, mod) {
        const activeProv = prov || (typeof localStorage !== 'undefined' ? localStorage.getItem('ai_selected_provider') : null) || 'NVIDIA';
        const activeMod = mod || (typeof localStorage !== 'undefined' ? localStorage.getItem('ai_selected_model') : null) || 'meta/llama-3.2-11b-vision-instruct';

        if (headerModelBadge) {
            headerModelBadge.textContent = activeMod;
        }
        if (headerProviderBadge) {
            headerProviderBadge.textContent = activeProv;
            if (activeProv === 'NVIDIA') {
                headerProviderBadge.style.color = '#76b900';
            } else if (activeProv === 'Google Gemini') {
                headerProviderBadge.style.color = '#60a5fa';
            } else if (activeProv === 'Groq') {
                headerProviderBadge.style.color = '#f97316';
            } else {
                headerProviderBadge.style.color = '#38bdf8';
            }
        }
    }

    // Default awal HANYA NVIDIA dengan model meta/llama-3.2-11b-vision-instruct
    const defaultProviderModels = {
        'NVIDIA': [
            'meta/llama-3.2-11b-vision-instruct'
        ]
    };

    function getCustomProviders() {
        try {
            let providers = [];
            const raw = localStorage.getItem('ai_custom_providers');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) providers = parsed;
            }
            const rawModels = localStorage.getItem('ai_custom_models');
            if (rawModels) {
                const parsedModels = JSON.parse(rawModels);
                if (Array.isArray(parsedModels)) {
                    parsedModels.forEach(m => {
                        if (m.provider && !providers.includes(m.provider) && m.provider !== 'NVIDIA') {
                            providers.push(m.provider);
                        }
                    });
                }
            }
            return providers;
        } catch (e) {
            console.error('Gagal membaca custom providers:', e);
            return [];
        }
    }

    function populateProviderOptions(preferredSelected = null) {
        if (!selectAIProvider) return;
        const customs = getCustomProviders();
        const providers = Array.from(new Set(['NVIDIA', ...customs]));
        const current = preferredSelected || selectAIProvider.value || localStorage.getItem('ai_selected_provider') || 'NVIDIA';

        selectAIProvider.innerHTML = '';
        providers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            if (p === current) opt.selected = true;
            selectAIProvider.appendChild(opt);
        });
    }

    function getCustomModels(provider) {
        try {
            const raw = localStorage.getItem('ai_custom_models');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed
                        .filter(item => !item.provider || item.provider === provider)
                        .map(item => (typeof item === 'string' ? item : item.name));
                }
            }
        } catch (e) {
            console.error('Gagal membaca custom models:', e);
        }
        return [];
    }

    function populateModelOptions(provider, preferredSelectedModel = null) {
        if (!selectAIModel) return;
        selectAIModel.innerHTML = '';

        const defaults = defaultProviderModels[provider] || [];
        const customs = getCustomModels(provider);
        const combined = Array.from(new Set([...defaults, ...customs]));

        if (combined.length === 0) {
            if (preferredSelectedModel) {
                combined.push(preferredSelectedModel);
            } else {
                combined.push('meta/llama-3.2-11b-vision-instruct');
            }
        }

        let selectedToUse = preferredSelectedModel || localStorage.getItem('ai_selected_model') || combined[0];
        if (!combined.includes(selectedToUse)) {
            selectedToUse = combined[0];
        }

        combined.forEach(modelName => {
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName;
            if (modelName === selectedToUse) {
                option.selected = true;
            }
            selectAIModel.appendChild(option);
        });
    }

    // Inisialisasi dropdown provider & model pertama kali dari localStorage
    const initialProvider = (typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_provider')) || 'NVIDIA';
    const initialSavedModel = (typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_model')) || 'meta/llama-3.2-11b-vision-instruct';
    populateProviderOptions(initialProvider);
    populateModelOptions(initialProvider, initialSavedModel);
    syncHeaderBadges(initialProvider, initialSavedModel);

    // Event pergantian Provider
    if (selectAIProvider) {
        selectAIProvider.addEventListener('change', (e) => {
            const chosenProvider = e.target.value;
            populateModelOptions(chosenProvider);
        });
    }

    // Toggle Form Tambah Model
    if (btnToggleTambahModel && formTambahModelContainer) {
        btnToggleTambahModel.addEventListener('click', () => {
            const isHidden = formTambahModelContainer.style.display === 'none' || !formTambahModelContainer.style.display;
            formTambahModelContainer.style.display = isHidden ? 'flex' : 'none';
            if (isHidden) {
                if (inputProviderBaru) {
                    inputProviderBaru.value = selectAIProvider ? selectAIProvider.value : 'NVIDIA';
                }
                if (inputNamaModelBaru) {
                    inputNamaModelBaru.focus();
                }
            }
        });
    }

    const closeTambahModelForm = () => {
        if (formTambahModelContainer) {
            formTambahModelContainer.style.display = 'none';
        }
        if (inputProviderBaru) inputProviderBaru.value = '';
        if (inputNamaModelBaru) inputNamaModelBaru.value = '';
        if (inputApiKeyBaru) inputApiKeyBaru.value = '';
    };

    if (btnTutupTambahModel) btnTutupTambahModel.addEventListener('click', closeTambahModelForm);
    if (btnBatalTambahModel) btnBatalTambahModel.addEventListener('click', closeTambahModelForm);

    // Tombol Pintasan Isi Cepat (Google Gemini, Groq, OpenRouter)
    const btnQuickGemini = document.getElementById('btnQuickGemini');
    const btnQuickGroq = document.getElementById('btnQuickGroq');
    const btnQuickOpenRouter = document.getElementById('btnQuickOpenRouter');

    if (btnQuickGemini) {
        btnQuickGemini.addEventListener('click', () => {
            if (inputProviderBaru) inputProviderBaru.value = 'Google Gemini';
            if (inputNamaModelBaru) inputNamaModelBaru.value = 'gemini-2.5-flash';
            if (inputApiKeyBaru) inputApiKeyBaru.focus();
        });
    }

    if (btnQuickGroq) {
        btnQuickGroq.addEventListener('click', () => {
            if (inputProviderBaru) inputProviderBaru.value = 'Groq';
            if (inputNamaModelBaru) inputNamaModelBaru.value = 'llama-3.3-70b-versatile';
            if (inputApiKeyBaru) inputApiKeyBaru.focus();
        });
    }

    if (btnQuickOpenRouter) {
        btnQuickOpenRouter.addEventListener('click', () => {
            if (inputProviderBaru) inputProviderBaru.value = 'OpenRouter';
            if (inputNamaModelBaru) inputNamaModelBaru.value = 'meta-llama/llama-3.3-70b-instruct:free';
            if (inputApiKeyBaru) inputApiKeyBaru.focus();
        });
    }

    // Simpan Model Baru (Mendukung provider baru & model baru yang diketik manual)
    if (btnSimpanModelBaru && inputNamaModelBaru) {
        btnSimpanModelBaru.addEventListener('click', () => {
            const providerName = (inputProviderBaru ? inputProviderBaru.value.trim() : '') || (selectAIProvider ? selectAIProvider.value : 'NVIDIA');
            const modelName = inputNamaModelBaru.value.trim();
            const apiKeyVal = inputApiKeyBaru ? inputApiKeyBaru.value.trim() : '';

            if (!modelName) {
                alert('Silakan masukkan nama model baru terlebih dahulu.');
                inputNamaModelBaru.focus();
                return;
            }

            try {
                // 1. Simpan provider baru jika belum ada dan bukan NVIDIA
                if (providerName && providerName !== 'NVIDIA') {
                    let customProviders = getCustomProviders();
                    if (!customProviders.includes(providerName)) {
                        customProviders.push(providerName);
                        localStorage.setItem('ai_custom_providers', JSON.stringify(customProviders));
                    }
                }

                // 2. Simpan custom model
                let customs = [];
                const rawCustoms = localStorage.getItem('ai_custom_models');
                if (rawCustoms) {
                    customs = JSON.parse(rawCustoms);
                    if (!Array.isArray(customs)) customs = [];
                }

                // Tambahkan model jika belum ada
                const alreadyExists = customs.some(m => (typeof m === 'string' ? m : m.name) === modelName && m.provider === providerName);
                if (!alreadyExists) {
                    customs.push({
                        provider: providerName,
                        name: modelName,
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem('ai_custom_models', JSON.stringify(customs));
                }

                // 3. Simpan API Key kustom jika diisi
                if (apiKeyVal) {
                    localStorage.setItem('custom_api_key', apiKeyVal);
                }

                // Simpan juga sebagai pilihan aktif
                localStorage.setItem('ai_selected_provider', providerName);
                localStorage.setItem('ai_selected_model', modelName);

                // 4. Perbarui dropdown provider & model dan pilih model baru ini
                populateProviderOptions(providerName);
                populateModelOptions(providerName, modelName);
                syncHeaderBadges(providerName, modelName);
                closeTambahModelForm();

                // 5. Feedback notifikasi ringan
                if (aiConfigAlert && aiConfigAlertText) {
                    aiConfigAlertText.textContent = `Model "${modelName}" (${providerName}) berhasil ditambahkan & diaktifkan!`;
                    aiConfigAlert.style.display = 'flex';
                    setTimeout(() => {
                        aiConfigAlert.style.display = 'none';
                    }, 3500);
                }
            } catch (err) {
                console.error('Gagal menyimpan model baru:', err);
                alert('Terjadi kesalahan saat menyimpan model baru ke memori browser.');
            }
        });
    }

    // Simpan & Aktifkan Konfigurasi Button
    if (btnSimpanKonfigurasiAI) {
        btnSimpanKonfigurasiAI.addEventListener('click', () => {
            const prov = selectAIProvider ? selectAIProvider.value : ((typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_provider')) || 'NVIDIA');
            const mod = selectAIModel ? selectAIModel.value : ((typeof localStorage !== 'undefined' && localStorage.getItem('ai_selected_model')) || 'meta/llama-3.2-11b-vision-instruct');

            localStorage.setItem('ai_selected_provider', prov);
            localStorage.setItem('ai_selected_model', mod);

            // Perbarui lencana teks banner header atas secara real-time
            syncHeaderBadges(prov, mod);

            // Tampilkan feedback notifikasi sukses
            if (aiConfigAlert && aiConfigAlertText) {
                aiConfigAlertText.textContent = `Konfigurasi AI berhasil diperbarui! Provider: ${prov} | Model: ${mod}`;
                aiConfigAlert.style.display = 'flex';
                setTimeout(() => {
                    aiConfigAlert.style.display = 'none';
                }, 4000);
            }
        });
    }

    // 3. Toggle Show / Hide API Key
    const btnToggleApiKey = document.getElementById('btnToggleApiKey');
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    const iconToggleApiKey = document.getElementById('iconToggleApiKey');
    const aiConfig = getAIConfig();
    const customStoredKey = (typeof localStorage !== 'undefined') ? localStorage.getItem('custom_api_key') : null;
    const rawApiKey = customStoredKey || ((aiConfig && aiConfig.apiKey) ? aiConfig.apiKey : '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');
    const maskedApiKey = '••••••••••••••••';
    let isApiKeyVisible = false;

    if (btnToggleApiKey && apiKeyDisplay && iconToggleApiKey) {
        // Efek hover halus
        btnToggleApiKey.addEventListener('mouseenter', () => {
            btnToggleApiKey.style.backgroundColor = '#f1f5f9';
            btnToggleApiKey.style.borderColor = '#cbd5e1';
            btnToggleApiKey.style.color = '#1e293b';
        });
        btnToggleApiKey.addEventListener('mouseleave', () => {
            btnToggleApiKey.style.backgroundColor = '#f8fafc';
            btnToggleApiKey.style.borderColor = '#e2e8f0';
            btnToggleApiKey.style.color = '#64748b';
        });

        // Event klik toggle show / hide
        btnToggleApiKey.addEventListener('click', () => {
            isApiKeyVisible = !isApiKeyVisible;

            if (isApiKeyVisible) {
                const currentStoredKey = localStorage.getItem('custom_api_key') || rawApiKey;
                apiKeyDisplay.textContent = currentStoredKey;
                apiKeyDisplay.style.letterSpacing = 'normal';
                apiKeyDisplay.style.fontSize = '0.75rem';
                apiKeyDisplay.style.color = '#1e293b';
                btnToggleApiKey.title = 'Sembunyikan API Key';
                iconToggleApiKey.className = 'ph-bold ph-eye-slash';
            } else {
                apiKeyDisplay.textContent = maskedApiKey;
                apiKeyDisplay.style.letterSpacing = '2px';
                apiKeyDisplay.style.fontSize = '0.85rem';
                apiKeyDisplay.style.color = '#64748b';
                btnToggleApiKey.title = 'Tampilkan API Key';
                iconToggleApiKey.className = 'ph-bold ph-eye';
            }
        });
    }
}
