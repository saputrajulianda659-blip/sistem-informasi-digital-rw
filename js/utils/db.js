// js/utils/db.js
import { callBackendApi, getApiUrl, getDatabaseUrl, getDbUrl } from '../services/apiClient.js';

export { getDatabaseUrl, getDbUrl };

const DB_KEY = 'rwdigital_db_v3';
// Initial Mock Data
const initialData = {
    warga: [
        {
            nik: '3201010101010001',
            nama: 'Budi Santoso',
            no_kk: '3201011111111110',
            tempat_lahir: 'Cirebon',
            tanggal_lahir: '1997-11-29',
            jenis_kelamin: 'L',
            alamat: 'Jl. Melati No.1',
            rt: '01',
            rw: '05',
            no_hp: '082135409820',
            email: 'budi@rwdigital.id',
            status: 'Tetap',
            agama: 'Islam',
            pekerjaan: 'PNS'
        },
        {
            nik: '3201010101010002',
            nama: 'Julianda Saputra',
            no_kk: '3201011111111112',
            tempat_lahir: 'Cirebon',
            tanggal_lahir: '2007-07-08',
            jenis_kelamin: 'L',
            alamat: 'Jl. Melati No.4',
            rt: '01',
            rw: '05',
            no_hp: '0895386105537',
            email: 'saputrajulianda659@gmail.com',
            status: 'Kontrak/Kos',
            agama: 'Islam',
            pekerjaan: 'Pelajar/Mahasiswa'
        },
        {
            nik: '3201010101010004',
            nama: 'Rian Pratama',
            no_kk: '3201011111111111',
            tempat_lahir: 'Cirebon',
            tanggal_lahir: '2018-04-10',
            jenis_kelamin: 'L',
            alamat: 'Jl. Melati No.3',
            rt: '01',
            rw: '05',
            no_hp: '-',
            email: '',
            status: 'Tetap',
            agama: 'Islam',
            pekerjaan: 'Pelajar'
        },
        {
            nik: '3201010101010008',
            nama: 'Bambang Mulyono',
            no_kk: '3201011111111113',
            tempat_lahir: 'Cirebon',
            tanggal_lahir: '1982-06-23',
            jenis_kelamin: 'L',
            alamat: 'Jl. Melati No.2',
            rt: '01',
            rw: '05',
            no_hp: '082114122927',
            email: '',
            status: 'Tetap',
            agama: 'Islam',
            pekerjaan: 'Pensiunan'
        },
        {
            nik: '3201010101010003',
            nama: 'Siti Aminah',
            no_kk: '3201011111111114',
            tempat_lahir: 'Cirebon',
            tanggal_lahir: '1998-10-15',
            jenis_kelamin: 'P',
            alamat: 'Jl. Merdeka No.5',
            rt: '02',
            rw: '05',
            no_hp: '083827740391',
            status: 'Tetap',
            email: 'iqisssss26@gmail.com',
            agama: 'Islam',
            pekerjaan: 'Mengurus Rumah Tangga'
        },
        {
            nik: '3201010101010011',
            nama: 'Ahmad Fauzi',
            no_kk: '3201011111111110',
            email: 'rt01@rwdigital.id',
            telepon: '081234567891',
            no_hp: '081234567891',
            rt: '01',
            rw: '05',
            jenis_kelamin: 'L',
            tempat_lahir: 'Bogor',
            tanggal_lahir: '1978-03-12',
            status_warga: 'Tetap',
            status: 'Tetap',
            pekerjaan: 'Wiraswasta',
            agama: 'Islam',
            role: 'rt',
            alamat: 'Jl. Melati No.3'
        },
        {
            nik: '3201010101010012',
            nama: 'Eko Prasetyo',
            no_kk: '3201011111111120',
            email: 'rt02@rwdigital.id',
            telepon: '081234567892',
            no_hp: '081234567892',
            rt: '02',
            rw: '05',
            jenis_kelamin: 'L',
            tempat_lahir: 'Jakarta',
            tanggal_lahir: '1982-07-25',
            status_warga: 'Tetap',
            status: 'Tetap',
            pekerjaan: 'Karyawan Swasta',
            agama: 'Islam',
            role: 'rt',
            alamat: 'Jl. Merdeka No.5'
        }
    ],
    pelayanan: [
        {
            id: 'SRT-20261030-3377',
            no_berkas: 'SRT-20261030-3377',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010003',
            nik_pemohon: '3201010101010003',
            nama_pemohon: 'Siti Aminah',
            rt: '02',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Persyaratan Beasiswa Kuliah',
            created_at: '2026-10-30T08:19:53.212Z',
            tanggal_pengajuan: '2026-10-30T15:19:53+07:00',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261029-2711',
            no_berkas: 'SRT-20261029-2711',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010003',
            nik_pemohon: '3201010101010003',
            nama_pemohon: 'Siti Aminah',
            rt: '02',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Ingin membuat SKTM untuk mendaptakan biaya siswa kampus',
            created_at: '2026-10-29T02:28:36.425Z',
            tanggal_pengajuan: '2026-10-29T02:28:36.504Z',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261029-3445',
            no_berkas: 'SRT-20261029-3445',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010003',
            nik_pemohon: '3201010101010003',
            nama_pemohon: 'Siti Aminah',
            rt: '02',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Ingi membuat SKTM untuk mendapatkan biaya siswa',
            created_at: '2026-10-29T02:23:03.165Z',
            tanggal_pengajuan: '2026-10-29T02:23:03.165Z',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261029-8568',
            no_berkas: 'SRT-20261029-8568',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010003',
            nik_pemohon: '3201010101010003',
            nama_pemohon: 'Siti Aminah',
            rt: '02',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Ingi membuat SKTM untuk mendapatkan biaya siswa',
            created_at: '2026-10-29T02:22:52.581Z',
            tanggal_pengajuan: '2026-10-29T02:22:52.581Z',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261029-2419',
            no_berkas: 'SRT-20261029-2419',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010003',
            nik_pemohon: '3201010101010003',
            nama_pemohon: 'Siti Aminah',
            rt: '02',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Ingin membuat SKTM untuk mendapatkan beasiswa',
            created_at: '2026-10-29T08:57:01+07:00',
            tanggal_pengajuan: '2026-10-29T01:57:01.585Z',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261029-1989',
            no_berkas: 'SRT-20261029-1989',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010002',
            nik_pemohon: '3201010101010002',
            nama_pemohon: 'Julianda Saputra',
            rt: '01',
            rw: '05',
            status: 'Menunggu Verifikasi RT',
            keperluan: 'Pengajuan SKTM untuk Persyaratan Beasiswa Sekolah / Bantuan Sosial',
            tanggal_pengajuan: '2026-10-29T08:30:00+07:00',
            catatan_rt: '',
            catatan_rw: '',
            tanggal_selesai: null
        },
        {
            id: 'SRT-20261026-1521',
            no_berkas: 'SRT-20261026-1521',
            jenis_pelayanan: 'Surat Pengantar SKCK',
            jenis_surat: 'Surat Pengantar SKCK',
            nik: '3201010101010002',
            nik_pemohon: '3201010101010002',
            nama_pemohon: 'Julianda Saputra',
            rt: '01',
            rw: '05',
            status: 'Selesai',
            keperluan: 'ingin membuat skck untuk melamar pekerjaan',
            tanggal_pengajuan: '2026-10-26T08:25:31.836Z',
            catatan_rt: 'Disetujui oleh Ketua RT dan meneruskan ke Ketua RW.',
            catatan_rw: 'Disetujui oleh Ketua RW. Surat resmi telah diterbitkan.',
            tanggal_selesai: '2026-10-26T14:37:35+00:00'
        },
        {
            id: 'SRT-20261026-4884',
            no_berkas: 'SRT-20261026-4884',
            jenis_pelayanan: 'Surat Keterangan Usaha (SKU)',
            jenis_surat: 'Surat Keterangan Usaha (SKU)',
            nik: '3201010101010002',
            nik_pemohon: '3201010101010002',
            nama_pemohon: 'Budi Santoso',
            rt: '01',
            rw: '05',
            status: 'Ditolak RT',
            keperluan: 'Pengajuan KUR Bank Mandiri untuk Modal Usaha Toko Kelontong',
            tanggal_pengajuan: '2026-10-26T22:21:26+07:00',
            catatan_rt: 'tidak ada foto - foto persyaratannya',
            catatan_rw: '',
            tanggal_selesai: '2026-10-26T22:25:21+07:00'
        },
        {
            id: 'SRT-20261026-5145',
            no_berkas: 'SRT-20261026-5145',
            jenis_pelayanan: 'Surat Keterangan Domisili',
            jenis_surat: 'Surat Keterangan Domisili',
            nik: '3201010101010002',
            nik_pemohon: '3201010101010002',
            nama_pemohon: 'Julianda Saputra',
            rt: '01',
            rw: '05',
            status: 'Selesai',
            keperluan: 'Ingin berpindah tempat',
            tanggal_pengajuan: '2026-10-26T15:28:39.686Z',
            catatan_rt: 'Disetujui oleh Ketua RT dan meneruskan ke Ketua RW.',
            catatan_rw: 'Disetujui oleh Ketua RW. Surat resmi telah diterbitkan.',
            tanggal_selesai: '2026-10-28T08:01:23+07:00'
        },
        {
            id: 'SRT-20260901-1001',
            no_berkas: 'SRT-20260901-1001',
            jenis_pelayanan: 'Surat Keterangan Tidak Mampu (SKTM)',
            jenis_surat: 'Surat Keterangan Tidak Mampu (SKTM)',
            nik: '3201010101010002',
            nik_pemohon: '3201010101010002',
            nama_pemohon: 'Julianda Saputra',
            rt: '01',
            rw: '05',
            status: 'Selesai',
            keperluan: 'Pengajuan SKTM untuk Persyaratan Beasiswa Sekolah / Bantuan Sosial',
            tanggal_pengajuan: '2026-09-01T08:00:00Z',
            catatan_rt: 'Disetujui oleh Ketua RT dan meneruskan ke Ketua RW.',
            catatan_rw: 'Disetujui oleh Ketua RW. Surat resmi telah diterbitkan.',
            tanggal_selesai: '2026-10-19T15:37:56+07:00'
        }
    ],
    pengumuman: [
        {
            id: 'INFO-1709420000000',
            judul: 'Kerja Bakti Bulanan Bersama',
            isi: 'Diinformasikan kepada seluruh warga RW 05, kita akan mengadakan kegiatan kerja bakti bulanan pada hari Minggu ini di area balai warga dan lapangan olahraga.',
            tanggal_dibuat: '2026-09-01T10:00:00Z',
            penulis: 'Bapak Ketua RW',
            kategori: 'Kegiatan',
            status_publikasi: 'Published',
            lampiran: 'Jadwal_Alat_Kebersihan.pdf'
        }
    ],
    pengaduan: [
        {
            id: 'ADU-1709420000000',
            judul: 'Lampu Jalan Mati di RT 01',
            kategori: 'Infrastruktur',
            deskripsi: 'Lampu jalan utama di depan pertigaan RT 01 mati sejak 3 hari yang lalu. Mohon segera diperbaiki karena jalanan menjadi sangat gelap.',
            lokasi: 'Pertigaan Utama RT 01',
            lampiran: 'lampu_mati.jpg',
            status: 'Baru',
            tanggal_pengaduan: '2026-09-02T08:30:00Z',
            nik_pelapor: '3201010101010001',
            nama_pelapor: 'Budi Santoso',
            tanggapan: []
        },
        {
            id: 'ADU-1709420000001',
            judul: 'Tumpukan Sampah',
            kategori: 'Kebersihan',
            deskripsi: 'Ada tumpukan sampah yang belum diangkut di ujung jalan gang.',
            lokasi: 'Gang Merdeka',
            lampiran: '',
            status: 'Diproses',
            tanggal_pengaduan: '2026-09-01T14:15:00Z',
            nik_pelapor: '3201010101010002',
            nama_pelapor: 'Julianda Saputra',
            tanggapan: [
                {
                    penanggap: 'Bapak Ketua RW',
                    role: 'Ketua RW',
                    pesan: 'Terima kasih laporannya, sedang kami koordinasikan dengan petugas kebersihan.',
                    tanggal: '2026-09-01T16:00:00Z'
                }
            ]
        }
    ],
    kas: [
        {
            id: 'KAS-20261028-5001',
            tanggal: '2026-10-28',
            tipe: 'masuk',
            jenis: 'Pemasukan',
            kategori: 'Iuran Warga',
            keterangan: 'Iuran Kebersihan & Keamanan Kolektif Warga RT 01',
            nominal: 500000,
            rt: '01',
            rw: '05',
            wilayah: 'RT 01 / RW 05',
            created_at: '2026-10-28 10:00:00'
        },
        {
            id: 'KAS-1709420000000',
            jenis: 'Pemasukan',
            tipe: 'masuk',
            kategori: 'Iuran Keamanan',
            nominal: 50000,
            tanggal: '2026-09-01T10:00:00Z',
            keterangan: 'Iuran Keamanan warga Julianda Saputra (Bulan September)',
            rt: '01',
            rw: '05',
            wilayah: 'RT 01 / RW 05'
        },
        {
            id: 'KAS-1709420000001',
            jenis: 'Pengeluaran',
            tipe: 'keluar',
            kategori: 'Infrastruktur',
            nominal: 150000,
            tanggal: '2026-09-05T09:00:00Z',
            keterangan: 'Perbaikan Lampu Gang RT 01',
            rt: '01',
            rw: '05',
            wilayah: 'RT 01 / RW 05'
        },
        {
            id: 'KAS-RT02-001',
            tanggal: '2026-10-15',
            tipe: 'masuk',
            jenis: 'Pemasukan',
            kategori: 'Iuran Warga',
            keterangan: 'Iuran Bulanan Warga RT 02',
            nominal: 300000,
            rt: '02',
            rw: '05',
            wilayah: 'RT 02 / RW 05'
        },
        {
            id: 'KAS-RT02-002',
            tanggal: '2026-10-20',
            tipe: 'keluar',
            jenis: 'Pengeluaran',
            kategori: 'Operasional',
            keterangan: 'Beli Tempat Sampah Lingkungan RT 02',
            nominal: 50000,
            rt: '02',
            rw: '05',
            wilayah: 'RT 02 / RW 05'
        }
    ],
    notifikasi: [
        {
            id: 'NTF-1794538450858-RT',
            targetRole: 'rt',
            target_role: 'rt',
            target: 'rt',
            role: 'rt',
            target_rt: '01',
            userId: 3,
            nik: '',
            judul: 'Status Pelayanan RT: SRT-20261113-3257 Telah Selesai',
            pesan: 'Pengajuan Surat Pengantar SKCK (SRT-20261113-3257) warga RT 01 telah diproses oleh Ketua RW dengan status: Selesai.',
            kategori: 'surat',
            type: 'info',
            link: '#/verifikasi-pengajuan',
            waktu: '2026-11-13 09:54:10',
            created_at: '2026-11-13 09:54:10',
            tanggal: '2026-11-13T09:54:10+07:00',
            isRead: false,
            is_read: false
        },
        {
            id: 'NTF-1794538441724-W',
            targetRole: 'warga',
            target_role: 'warga',
            target: 'warga',
            role: 'warga',
            nik: '3201010101010002',
            target_nik: '3201010101010002',
            userId: 5,
            username: 'julianda',
            pemohon: 'Julianda Saputra',
            nama_pemohon: 'Julianda Saputra',
            target_rt: '01',
            target_rw: '05',
            judul: 'Pengajuan Surat Selesai',
            pesan: 'Pengajuan Surat Pengantar SKCK (SRT-20261113-3257) Anda telah diproses dan dinyatakan Selesai oleh Ketua RW.',
            kategori: 'surat',
            type: 'success',
            link: '#/status-pengajuan',
            waktu: '2026-11-13 09:54:01',
            created_at: '2026-11-13 09:54:01',
            tanggal: '2026-11-13T09:54:01+07:00',
            isRead: false,
            is_read: false
        },
        {
            id: 'NOTIF-1794538362993-527',
            target_role: 'rw',
            targetRole: 'rw',
            target_nik: '',
            target_rt: '01',
            targetRt: '01',
            target_rw: '05',
            targetRw: '05',
            judul: 'Persetujuan Surat Menunggu Tindakan',
            pesan: 'Pengajuan Surat Pengantar SKCK dari Julianda Saputra telah diverifikasi RT 01 dan menunggu persetujuan RW.',
            is_read: false,
            isRead: false,
            createdAt: '2026-11-13T09:52:42+07:00',
            created_at: '2026-11-13 09:52:42',
            waktu: '2026-11-13 09:52:42',
            userId: 2,
            nik: '',
            target: 'rw',
            role: 'rw',
            kategori: 'Pelayanan',
            type: 'warning',
            link: '#/persetujuan-pelayanan',
            priority: 'normal',
            tanggal: '2026-11-13T09:52:42+07:00'
        },
        {
            id: 'NTF-1794538350239-W',
            targetRole: 'warga',
            target_role: 'warga',
            target: 'warga',
            role: 'warga',
            nik: '3201010101010002',
            target_nik: '3201010101010002',
            userId: 5,
            username: 'julianda',
            pemohon: 'Julianda Saputra',
            nama_pemohon: 'Julianda Saputra',
            target_rt: '01',
            target_rw: '05',
            judul: 'Pengajuan Surat Disetujui RT',
            pesan: 'Pengajuan Surat Pengantar SKCK (SRT-20261113-3257) Anda telah disetujui oleh Ketua RT dan diteruskan ke Ketua RW.',
            kategori: 'surat',
            type: 'success',
            link: '#/status-pengajuan',
            waktu: '2026-11-13 09:52:30',
            created_at: '2026-11-13 09:52:30',
            tanggal: '2026-11-13T09:52:30+07:00',
            isRead: false,
            is_read: false
        },
        {
            id: 'NOTIF-1794538276139-642',
            target_role: 'super_admin',
            targetRole: 'super_admin',
            target_nik: '',
            target_rt: '01',
            targetRt: '01',
            target_rw: '05',
            targetRw: '05',
            judul: 'Pengajuan Surat Baru Perlu Verifikasi',
            pesan: 'Warga Julianda Saputra mengajukan Surat Pengantar SKCK (No: SRT-20261113-3257) di RT 01. Silakan pantau verifikasi berkas.',
            is_read: false,
            isRead: false,
            createdAt: '2026-11-13T09:51:16+07:00',
            created_at: '2026-11-13 09:51:16',
            waktu: '2026-11-13 09:51:16',
            userId: 1,
            nik: '',
            target: 'super_admin',
            role: 'super_admin',
            kategori: 'Pelayanan',
            type: 'info',
            link: '#/pelayanan',
            priority: 'normal',
            tanggal: '2026-11-13T09:51:16+07:00'
        },
        {
            id: 'NOTIF-1794538263441-625',
            target_role: 'rt',
            targetRole: 'rt',
            target_nik: '',
            target_rt: '01',
            targetRt: '01',
            target_rw: '05',
            targetRw: '05',
            judul: 'Pengajuan Surat Baru Perlu Verifikasi',
            pesan: 'Warga Julianda Saputra mengajukan Surat Pengantar SKCK (No: SRT-20261113-3257). Silakan lakukan verifikasi berkas.',
            is_read: false,
            isRead: false,
            createdAt: '2026-11-13T09:51:03+07:00',
            created_at: '2026-11-13 09:51:03',
            waktu: '2026-11-13 09:51:03',
            userId: 3,
            nik: '',
            target: 'rt',
            role: 'rt',
            kategori: 'Pelayanan',
            type: 'info',
            link: '#/verifikasi-pengajuan',
            priority: 'normal',
            tanggal: '2026-11-13T09:51:03+07:00'
        },
        {
            id: 'NOTIF-1794447730870-658',
            target_role: 'rt',
            targetRole: 'rt',
            target_nik: '',
            target_rt: '02',
            targetRt: '02',
            target_rw: '05',
            targetRw: '05',
            judul: 'Pengajuan Surat Baru Perlu Verifikasi',
            pesan: 'Warga Siti Aminah mengajukan Surat Keterangan Tidak Mampu (SKTM) (No: SRT-20261029-2711). Silakan lakukan verifikasi berkas.',
            is_read: false,
            isRead: false,
            createdAt: '2026-11-11T08:42:10+07:00',
            created_at: '2026-11-11 08:42:10',
            waktu: '2026-11-11 08:42:10',
            userId: 4,
            nik: '',
            target: 'rt',
            role: 'rt',
            kategori: 'Pelayanan',
            type: 'info',
            link: '#/verifikasi-pengajuan',
            priority: 'normal',
            tanggal: '2026-11-11T08:42:10+07:00'
        },
        {
            id: 'NTF-1794361175390-W',
            targetRole: 'warga',
            target_role: 'warga',
            target: 'warga',
            role: 'warga',
            nik: '3201010101010003',
            target_nik: '3201010101010003',
            userId: 6,
            username: 'siti',
            pemohon: 'Siti Aminah',
            nama_pemohon: 'Siti Aminah',
            target_rt: '02',
            target_rw: '05',
            judul: 'Pengajuan Surat Perlu Diperbaiki',
            pesan: 'Pengajuan Surat Keterangan Tidak Mampu (SKTM) (SRT-20261029-2711) Anda memerlukan perbaikan dokumen. Catatan RT: Tidak ada dokumen pendukung seperti foto KK, KTP, dan lain". Tolong tambahkan terlebih dahulu',
            kategori: 'surat',
            type: 'warning',
            link: '#/status-pengajuan',
            waktu: '2026-11-11 08:39:35',
            created_at: '2026-11-11 08:39:35',
            tanggal: '2026-11-11T08:39:35+07:00',
            isRead: false,
            is_read: false
        },
        {
            id: 'NTF-1794275321854-RT',
            targetRole: 'rt',
            target_role: 'rt',
            target: 'rt',
            role: 'rt',
            target_rt: '02',
            userId: 4,
            nik: '',
            judul: 'Status Pelayanan RT: SRT-20261029-3445 Telah Selesai',
            pesan: 'Pengajuan Surat Keterangan Tidak Mampu (SKTM) (SRT-20261029-3445) warga RT 02 telah diproses oleh Ketua RW dengan status: Selesai.',
            kategori: 'surat',
            type: 'info',
            link: '#/verifikasi-pengajuan',
            waktu: '2026-11-10 08:48:41',
            created_at: '2026-11-10 08:48:41',
            tanggal: '2026-11-10T08:48:41+07:00',
            isRead: false,
            is_read: false
        },
        {
            id: 'NOTIF-1794274812217-588',
            target_role: 'rw',
            targetRole: 'rw',
            target_nik: '',
            target_rt: '02',
            targetRt: '02',
            target_rw: '05',
            targetRw: '05',
            judul: 'Persetujuan Surat Menunggu Tindakan',
            pesan: 'Pengajuan Surat Keterangan Tidak Mampu (SKTM) dari Siti Aminah telah diverifikasi RT 02 dan menunggu persetujuan RW.',
            is_read: false,
            isRead: false,
            createdAt: '2026-11-10T08:40:12+07:00',
            created_at: '2026-11-10 08:40:12',
            waktu: '2026-11-10 08:40:12',
            userId: 2,
            nik: '',
            target: 'rw',
            role: 'rw',
            kategori: 'Pelayanan',
            type: 'warning',
            link: '#/persetujuan-pelayanan',
            priority: 'normal',
            tanggal: '2026-11-10T08:40:12+07:00'
        }
    ],
    notification_logs: [],
    notification_preferences: {
        email: true,
        whatsapp: true,
        in_app: true,
        categories: {
            Pengumuman: true,
            Kegiatan: true,
            Pelayanan: true,
            Pengaduan: true,
            Kas: true,
            Darurat: true
        }
    }
};

// Initialize DB if not exists
export function initDB() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
        localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    } else {
        try {
            let db = {};
            try {
                db = JSON.parse(data) || {};
            } catch (errJson) {
                db = { ...initialData };
            }
            let updated = false;

            if (!Array.isArray(db.warga) || db.warga.length === 0) {
                db.warga = initialData.warga;
                updated = true;
            } else {
                initialData.warga.forEach(dw => {
                    const existingIdx = db.warga.findIndex(w => w.nik === dw.nik);
                    if (existingIdx !== -1) {
                        // Perbarui atribut warga jika berbeda/usang di local storage
                        const existing = db.warga[existingIdx];
                        let wMod = false;
                        ['nama', 'no_kk', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'rt', 'rw', 'no_hp', 'email', 'status', 'agama', 'pekerjaan'].forEach(k => {
                            if (dw[k] !== undefined && (existing[k] === undefined || existing[k] === null || existing[k] === '')) {
                                existing[k] = dw[k];
                                wMod = true;
                            }
                        });
                        if (wMod) updated = true;
                    } else {
                        db.warga.push(dw);
                        updated = true;
                    }
                });
            }

            if (!Array.isArray(db.kas) || db.kas.length === 0) {
                db.kas = initialData.kas;
                updated = true;
            } else {
                // Pastikan seluruh transaksi RT 01 memiliki properti rt: '01'
                db.kas.forEach(k => {
                    if (k.id !== 'KAS-RT02-001' && k.id !== 'KAS-RT02-002' && (!k.rt || k.rt !== '01')) {
                        k.rt = '01';
                        k.rw = '05';
                        k.wilayah = 'RT 01 / RW 05';
                        updated = true;
                    }
                });
                // Pastikan transaksi RT 02 tersedia di localStorage
                if (!db.kas.some(k => k.id === 'KAS-RT02-001')) {
                    db.kas.push({
                        id: 'KAS-RT02-001',
                        tanggal: '2026-10-15',
                        tipe: 'masuk',
                        jenis: 'Pemasukan',
                        kategori: 'Iuran Warga',
                        keterangan: 'Iuran Bulanan Warga RT 02',
                        nominal: 300000,
                        rt: '02',
                        rw: '05',
                        wilayah: 'RT 02 / RW 05'
                    });
                    updated = true;
                }
                if (!db.kas.some(k => k.id === 'KAS-RT02-002')) {
                    db.kas.push({
                        id: 'KAS-RT02-002',
                        tanggal: '2026-10-20',
                        tipe: 'keluar',
                        jenis: 'Pengeluaran',
                        kategori: 'Operasional',
                        keterangan: 'Beli Tempat Sampah Lingkungan RT 02',
                        nominal: 50000,
                        rt: '02',
                        rw: '05',
                        wilayah: 'RT 02 / RW 05'
                    });
                    updated = true;
                }
                const prevKasLen = db.kas.length;
                db.kas = db.kas.filter(k => k.id !== 'KAS-1792652557512');
                if (db.kas.length !== prevKasLen) updated = true;
                db.kas_iuran = db.kas;
            }

            if (!Array.isArray(db.notifikasi) || db.notifikasi.length === 0) {
                const standaloneNotif = typeof localStorage !== 'undefined' ? localStorage.getItem('notifikasi') : null;
                let loadedStandalone = false;
                if (standaloneNotif) {
                    try {
                        const parsed = JSON.parse(standaloneNotif);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            db.notifikasi = parsed;
                            loadedStandalone = true;
                            updated = true;
                        }
                    } catch (e) {}
                }
                if (!loadedStandalone && Array.isArray(initialData.notifikasi) && initialData.notifikasi.length > 0) {
                    db.notifikasi = initialData.notifikasi;
                    updated = true;
                }
            } else if (db.notifikasi.some(n => n && n.id && (n.id.startsWith('NOTIF-SEED-') || n.id.startsWith('NOTIF-DEMO-')))) {
                db.notifikasi = db.notifikasi.filter(n => !n || !n.id || (!n.id.startsWith('NOTIF-SEED-') && !n.id.startsWith('NOTIF-DEMO-')));
                updated = true;
            }

            if (!Array.isArray(db.notification_logs)) {
                db.notification_logs = [];
                updated = true;
            }

            if (!db.notification_preferences) {
                db.notification_preferences = initialData.notification_preferences;
                updated = true;
            }

            if (db.pengaduan && Array.isArray(db.pengaduan)) {
                db.pengaduan.forEach(p => {
                    if (p.nik_pelapor === '3201010101010002' && (p.nama_pelapor === 'Agus' || !p.nama_pelapor)) {
                        p.nama_pelapor = 'Julianda Saputra';
                        updated = true;
                    }
                });
            }

            if (!Array.isArray(db.pelayanan) || db.pelayanan.length === 0) {
                db.pelayanan = initialData.pelayanan;
                updated = true;
            } else {
                const prevLen = db.pelayanan.length;
                db.pelayanan = db.pelayanan.filter(p => p && p.id !== 'SRT-20260902-1002');
                const existingIds = new Set(db.pelayanan.map(p => p && (p.id || p.no_berkas)));
                initialData.pelayanan.forEach(defItem => {
                    if (!existingIds.has(defItem.id)) {
                        db.pelayanan.push(defItem);
                        updated = true;
                    }
                });
                if (db.pelayanan.length !== prevLen) {
                    updated = true;
                }
            }

            if (updated) {
                localStorage.setItem(DB_KEY, JSON.stringify(db));
            }
        } catch (e) {}
    }

    // Non-blocking background sync with backend database (Apache / Port 80)
    if (typeof window !== 'undefined' && !isSyncing) {
        syncWithBackend().catch(() => {});
    }
}

// Get collection (table) with safe array / object fallback
export function getCollection(collectionName) {
    try {
        initDB();
        const data = localStorage.getItem(DB_KEY);
        let db = {};
        try {
            db = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Gagal parse storage:", e);
            db = { pelayanan: [], notifikasi: [], warga: [] };
        }
        if (db && Array.isArray(db[collectionName]) && db[collectionName].length > 0) {
            return db[collectionName];
        }
        // Fallback ke standalone localStorage key jika koleksi di db utama kosong
        if (typeof localStorage !== 'undefined') {
            const standaloneData = localStorage.getItem(collectionName);
            if (standaloneData) {
                try {
                    const parsed = JSON.parse(standaloneData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        db[collectionName] = parsed;
                        localStorage.setItem(DB_KEY, JSON.stringify(db));
                        return parsed;
                    }
                } catch (errParse) {}
            }
        }
        if (db && Array.isArray(db[collectionName])) {
            return db[collectionName];
        }
        if (db && db[collectionName] !== undefined && db[collectionName] !== null) {
            return db[collectionName];
        }
        return initialData[collectionName] || [];
    } catch (e) {
        console.error(`Error reading collection ${collectionName}:`, e);
        return initialData[collectionName] || [];
    }
}

// Save collection (table) with error safety
export function saveCollection(collectionName, dataArray) {
    try {
        const data = localStorage.getItem(DB_KEY);
        let db = {};
        try {
            db = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Gagal parse storage:", e);
            db = { pelayanan: [], notifikasi: [], warga: [] };
        }
        db[collectionName] = dataArray;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        if (collectionName === 'notifikasi' && typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('notifikasi', JSON.stringify(dataArray));
            } catch (e) {}
        }
    } catch (e) {
        console.error(`Error saving collection ${collectionName}:`, e);
    }
}

// Pending backend save & sync promise tracker to protect against premature logout
const pendingPromises = new Set();

export function trackPendingSave(promise) {
    if (!promise || typeof promise.then !== 'function') return promise;
    pendingPromises.add(promise);
    const cleanup = () => pendingPromises.delete(promise);
    promise.then(cleanup, cleanup);
    return promise;
}

export function hasPendingSaves() {
    return pendingPromises.size > 0;
}

export async function waitForPendingSaves(timeoutMs = 6000) {
    if (pendingPromises.size === 0) return true;
    const allPending = Promise.allSettled(Array.from(pendingPromises));
    if (timeoutMs <= 0) {
        await allPending;
        return true;
    }
    let timer;
    const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve('timeout'), timeoutMs);
    });
    try {
        await Promise.race([allPending, timeoutPromise]);
    } finally {
        clearTimeout(timer);
    }
    return pendingPromises.size === 0;
}

let isSyncing = false;

// Realtime Two-Way Synchronization between Local Storage and Backend (XAMPP / Port 80)
export async function syncWithBackend() {
    if (isSyncing) return;
    isSyncing = true;
    const doSync = async () => {
        try {
            let res = await callBackendApi('sync.php', { _t: Date.now() }, 'GET');
            let database = res && res.success ? res.database : null;

            // Fallback: fetch langsung dari api/database.json anti-cache jika sync.php tidak mengembalikan database
            if (!database) {
                try {
                    const targetDbUrl = typeof getDbUrl === 'function' ? getDbUrl() : (typeof getDatabaseUrl === 'function' ? getDatabaseUrl() : 'api/database.json');
                    const rawRes = await fetch(`${targetDbUrl}${targetDbUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`, {
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });
                    if (rawRes.ok) {
                        database = await rawRes.json();
                        res = { success: true, database: database };
                    }
                } catch (errDb) {}
            }

            if (database) {
                let currentDb = {};
                try {
                    currentDb = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
                } catch (e) {
                    console.error("Gagal parse storage:", e);
                    currentDb = { pelayanan: [], notifikasi: [], warga: [] };
                }
                const merged = {
                    ...currentDb,
                    ...database
                };
                // Preserve user passwords and default credentials if missing from backend payload
                if (Array.isArray(database.users)) {
                    const currentUsers = Array.isArray(currentDb.users) ? currentDb.users : [];
                    merged.users = database.users.map(u => {
                        const existing = currentUsers.find(cu => cu.id === u.id || cu.username === u.username);
                        return {
                            ...u,
                            password: u.password || existing?.password || 'h_4889ba9bcGFz',
                            status: u.status || 'Aktif'
                        };
                    });
                }

                // Safely merge pelayanan collection: combine backend and local items
                if (Array.isArray(database.pelayanan)) {
                    const backendList = database.pelayanan.filter(p => p && p.id !== 'SRT-20260902-1002');
                    const localList = Array.isArray(currentDb.pelayanan) ? currentDb.pelayanan.filter(p => p && p.id !== 'SRT-20260902-1002') : [];
                    const mergedMap = new Map();

                    // Put backend items
                    backendList.forEach(p => { if (p && p.id) mergedMap.set(p.id, p); });

                    // Keep local items, preserving full docs and new submissions
                    localList.forEach(p => {
                        if (p && p.id && p.id !== 'SRT-20260902-1002') {
                            if (mergedMap.has(p.id)) {
                                const bItem = mergedMap.get(p.id);
                                const mergedDocs = (p.dokumen_pendukung && Array.isArray(p.dokumen_pendukung) && p.dokumen_pendukung.some(d => d && (d.data || d.url)))
                                    ? p.dokumen_pendukung
                                    : (bItem.dokumen_pendukung || p.dokumen_pendukung);
                                mergedMap.set(p.id, { ...p, ...bItem, dokumen_pendukung: mergedDocs });
                            } else {
                                mergedMap.set(p.id, p);
                            }
                        }
                    });

                    const mergedList = Array.from(mergedMap.values());
                    mergedList.sort((a, b) => {
                        const timeA = new Date(a.created_at || a.tanggal_pengajuan || 0).getTime();
                        const timeB = new Date(b.created_at || b.tanggal_pengajuan || 0).getTime();
                        if (timeB !== timeA) return timeB - timeA;
                        return String(b.id || '').localeCompare(String(a.id || ''));
                    });
                    merged.pelayanan = mergedList;
                }

                // Safely merge notifikasi collection: combine backend and local items
                if (Array.isArray(database.notifikasi) && database.notifikasi.length > 0) {
                    const backendNotifs = database.notifikasi;
                    const localNotifs = Array.isArray(currentDb.notifikasi) ? currentDb.notifikasi : [];
                    const notifMap = new Map();

                    // Put backend items
                    backendNotifs.forEach(n => {
                        if (n && n.id) notifMap.set(n.id, n);
                    });

                    // Merge local items, preserving read status if marked as read locally
                    localNotifs.forEach(n => {
                        if (n && n.id) {
                            if (notifMap.has(n.id)) {
                                const bNotif = notifMap.get(n.id);
                                const isRead = Boolean(n.isRead || n.is_read || bNotif.isRead || bNotif.is_read);
                                notifMap.set(n.id, { ...bNotif, ...n, isRead, is_read: isRead });
                            } else {
                                notifMap.set(n.id, n);
                            }
                        }
                    });

                    const mergedNotifs = Array.from(notifMap.values());
                    mergedNotifs.sort((a, b) => {
                        const timeA = new Date(a.createdAt || a.created_at || a.waktu || a.tanggal || 0).getTime();
                        const timeB = new Date(b.createdAt || b.created_at || b.waktu || b.tanggal || 0).getTime();
                        return timeB - timeA;
                    });
                    merged.notifikasi = mergedNotifs;
                } else if (Array.isArray(currentDb.notifikasi) && currentDb.notifikasi.length > 0) {
                    merged.notifikasi = currentDb.notifikasi;
                }

                if (Array.isArray(merged.notifikasi) && merged.notifikasi.length > 0) {
                    try {
                        localStorage.setItem('notifikasi', JSON.stringify(merged.notifikasi));
                    } catch (e) {}
                }

                localStorage.setItem(DB_KEY, JSON.stringify(merged));
                window.dispatchEvent(new CustomEvent('db:synced', { detail: res }));
                return merged;
            }
        } catch (e) {
            // Fallback to localStorage on network glitch
        } finally {
            isSyncing = false;
        }
    };

    const syncPromise = doSync();
    trackPendingSave(syncPromise);
    return await syncPromise;
}
