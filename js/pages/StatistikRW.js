// js/pages/StatistikRW.js
import { getWargaStatistics } from '../models/Warga.js';

export function renderStatistikRW() {
    const stats = getWargaStatistics();
    const totalWarga = stats.totalWarga;

    // 1. Total Warga per RT
    const rtMap = {};
    Object.keys(stats.byRT).forEach(rt => {
        rtMap[`RT ${rt}`] = stats.byRT[rt];
    });
    const sortedRTs = Object.keys(rtMap).sort();

    // 2. Distribusi Usia
    const countAnak = stats.byAge.anak;
    const countRemaja = stats.byAge.remaja;
    const countDewasa = stats.byAge.dewasa;
    const countLansia = stats.byAge.lansia;

    const pctAnak = totalWarga > 0 ? Math.round((countAnak / totalWarga) * 100) : 0;
    const pctRemaja = totalWarga > 0 ? Math.round((countRemaja / totalWarga) * 100) : 0;
    const pctDewasa = totalWarga > 0 ? Math.round((countDewasa / totalWarga) * 100) : 0;
    const pctLansia = totalWarga > 0 ? Math.round((countLansia / totalWarga) * 100) : 0;

    // 3. Status Kependudukan (Tetap vs Kontrak)
    const countTetap = stats.byStatus['Tetap'] || 0;
    const countKontrak = (stats.byStatus['Kontrak/Kos'] || 0) + (stats.byStatus['Pindah'] || 0);

    const pctTetap = totalWarga > 0 ? Math.round((countTetap / totalWarga) * 100) : 0;
    const pctKontrak = totalWarga > 0 ? (100 - pctTetap) : 0;

    // 4. Gender Composition
    const countL = stats.byGender.L || 0;
    const countP = stats.byGender.P || 0;
    const pctL = totalWarga > 0 ? Math.round((countL / totalWarga) * 100) : 0;
    const pctP = totalWarga > 0 ? (100 - pctL) : 0;

    // 5. Total Kepala Keluarga (Unique KK)
    const uniqueKK = stats.uniqueKK || 0;

    // Render RT Breakdown Bars
    let rtBarsHtml = '';
    if (sortedRTs.length === 0) {
        rtBarsHtml = '<p class="text-muted" style="font-size: 0.875rem;">Belum ada data RT terdaftar.</p>';
    } else {
        rtBarsHtml = sortedRTs.map((rtName, idx) => {
            const count = rtMap[rtName];
            const pct = totalWarga > 0 ? Math.round((count / totalWarga) * 100) : 0;
            const barColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
            const color = barColors[idx % barColors.length];

            return `
                <div style="margin-bottom: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.875rem;">
                        <span style="font-weight: 600; color: #1e293b;">${rtName}</span>
                        <span style="color: #64748b;"><strong style="color: #1e293b;">${count}</strong> orang (${pct}%)</span>
                    </div>
                    <div style="width: 100%; background-color: #f1f5f9; height: 10px; border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${pct}%; background-color: ${color}; height: 100%; border-radius: 9999px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    return `
        <div>
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="color: #1e293b; margin-bottom: 0.25rem;">Statistik & Demografi RW 05</h1>
                    <p class="text-muted" style="margin: 0;">Analisis data kependudukan, demografi usia, dan sebaran wilayah secara real-time.</p>
                </div>
                <div>
                    <a href="#/data-warga" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; border-radius: 8px; padding: 10px 18px;">
                        <i class="ph ph-users"></i> Kelola Data Warga
                    </a>
                </div>
            </div>

            <!-- Top Summary Stat Cards -->
            <div class="stats-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 24px;">
                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-users"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.6rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${totalWarga}</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Total Warga Terdaftar</div>
                    </div>
                </div>

                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-house-line"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.6rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${uniqueKK}</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Total Kepala Keluarga (KK)</div>
                    </div>
                </div>

                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #dcfce7; color: #166534; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-buildings"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.6rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${sortedRTs.length} RT</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Jumlah Rukun Tetangga</div>
                    </div>
                </div>

                <div class="card stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: #fae8ff; color: #a21caf; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="ph-fill ph-gender-intersex"></i>
                    </div>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #1e293b; line-height: 1.1;">${countL}L / ${countP}P</div>
                        <div style="font-size: 0.8125rem; color: #64748b;">Komposisi Gender</div>
                    </div>
                </div>
            </div>

            <!-- Detailed Breakdown Cards Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 24px;">
                <!-- Card 1: Total Warga per RT -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <i class="ph-fill ph-buildings" style="font-size: 1.25rem; color: #2563eb;"></i>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">Total Warga per RT</h3>
                    </div>
                    <div>
                        ${rtBarsHtml}
                    </div>
                </div>

                <!-- Card 2: Distribusi Usia -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <i class="ph-fill ph-chart-bar" style="font-size: 1.25rem; color: #10b981;"></i>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">Distribusi Kelompok Usia</h3>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        <!-- Anak-anak -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                <span style="font-weight: 600; color: #1e293b;">👶 Anak-anak (0 - 12 th)</span>
                                <span style="color: #64748b;"><strong style="color: #2563eb;">${countAnak}</strong> orang (${pctAnak}%)</span>
                            </div>
                            <div style="width: 100%; background-color: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden;">
                                <div style="width: ${pctAnak}%; background-color: #2563eb; height: 100%; border-radius: 9999px;"></div>
                            </div>
                        </div>

                        <!-- Remaja -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                <span style="font-weight: 600; color: #1e293b;">🎒 Remaja (13 - 18 th)</span>
                                <span style="color: #64748b;"><strong style="color: #f59e0b;">${countRemaja}</strong> orang (${pctRemaja}%)</span>
                            </div>
                            <div style="width: 100%; background-color: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden;">
                                <div style="width: ${pctRemaja}%; background-color: #f59e0b; height: 100%; border-radius: 9999px;"></div>
                            </div>
                        </div>

                        <!-- Dewasa -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                <span style="font-weight: 600; color: #1e293b;">💼 Dewasa (19 - 59 th)</span>
                                <span style="color: #64748b;"><strong style="color: #10b981;">${countDewasa}</strong> orang (${pctDewasa}%)</span>
                            </div>
                            <div style="width: 100%; background-color: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden;">
                                <div style="width: ${pctDewasa}%; background-color: #10b981; height: 100%; border-radius: 9999px;"></div>
                            </div>
                        </div>

                        <!-- Lansia -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.875rem;">
                                <span style="font-weight: 600; color: #1e293b;">🧓 Lansia (60+ th)</span>
                                <span style="color: #64748b;"><strong style="color: #ef4444;">${countLansia}</strong> orang (${pctLansia}%)</span>
                            </div>
                            <div style="width: 100%; background-color: #f1f5f9; height: 8px; border-radius: 9999px; overflow: hidden;">
                                <div style="width: ${pctLansia}%; background-color: #ef4444; height: 100%; border-radius: 9999px;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Status Kependudukan -->
                <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                        <i class="ph-fill ph-chart-pie" style="font-size: 1.25rem; color: #8b5cf6;"></i>
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0;">Status Kependudukan</h3>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0;">
                        <!-- Donut Chart -->
                        <div style="width: 130px; height: 130px; border-radius: 50%; background: conic-gradient(#10b981 0% ${pctTetap}%, #f59e0b ${pctTetap}% 100%); position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="width: 84px; height: 84px; background-color: #ffffff; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">TOTAL</span>
                                <span style="font-size: 1.15rem; font-weight: 700; color: #1e293b;">${totalWarga}</span>
                            </div>
                        </div>

                        <!-- Legend -->
                        <div style="display: flex; justify-content: center; gap: 1.5rem; margin-top: 1.25rem; font-size: 0.8125rem;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; background-color: #10b981; border-radius: 3px;"></div>
                                <span><strong>Tetap:</strong> ${countTetap} (${pctTetap}%)</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; background-color: #f59e0b; border-radius: 3px;"></div>
                                <span><strong>Kontrak/Kos:</strong> ${countKontrak} (${pctKontrak}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
