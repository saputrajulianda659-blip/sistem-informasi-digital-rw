<?php
// api/notification_engine.php
// Central Notification Dispatcher Engine for Digital RW (In-App, WhatsApp Fonnte, SMTP Email)

require_once __DIR__ . '/db_helper.php';
date_default_timezone_set('Asia/Jakarta');

// Helper: Resolve active Fonnte WhatsApp token from config or database
if (!function_exists('getFonnteToken')) {
    function getFonnteToken($waCfg = []) {
        if (!empty($waCfg['api_token'])) return trim($waCfg['api_token']);
        if (!empty($waCfg['access_token'])) return trim($waCfg['access_token']);

        $cfg = loadConfig();
        if (!empty($cfg['whatsapp']['api_token'])) return trim($cfg['whatsapp']['api_token']);
        if (!empty($cfg['whatsapp']['access_token'])) return trim($cfg['whatsapp']['access_token']);

        $db = loadDatabase();
        if (!empty($db['config']['whatsapp']['api_token'])) return trim($db['config']['whatsapp']['api_token']);
        if (!empty($db['config']['whatsapp']['access_token'])) return trim($db['config']['whatsapp']['access_token']);
        if (!empty($db['ai_config']['fonnte_token'])) return trim($db['ai_config']['fonnte_token']);

        return '65G3LsBQrNkQLSV1F9Dc';
    }
}

// Helper: Format Indonesian phone number to international 628... (08... -> 628...)
if (!function_exists('normalizePhoneNumber')) {
    function normalizePhoneNumber($phone) {
        if (empty($phone)) return '';
        $clean = preg_replace('/[^0-9]/', '', (string)$phone);
        if (strpos($clean, '08') === 0) {
            $clean = '628' . substr($clean, 2);
        } elseif (strpos($clean, '0') === 0) {
            $clean = '62' . substr($clean, 1);
        } elseif (strpos($clean, '8') === 0) {
            $clean = '628' . substr($clean, 1);
        }
        return $clean;
    }
}

// Helper: Send WhatsApp via Fonnte Gateway API (https://api.fonnte.com/send)
if (!function_exists('sendWhatsAppMessage')) {
    function sendWhatsAppMessage($waCfg, $recipientPhone, $judul, $pesan, $kategori, $link = '') {
        try {
            $token = getFonnteToken($waCfg);
            $normPhone = normalizePhoneNumber($recipientPhone);

            if (empty($normPhone) || strlen($normPhone) < 10) {
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error' => 'Nomor WhatsApp tidak valid atau belum terdaftar.'
                ];
            }

            if (strpos($pesan, '[DIGITAL RW 05') !== false) {
                $waText = $pesan;
            } else {
                $waktuWib = date('d F Y, H:i') . ' WIB';
                $waText = "🔔 *[DIGITAL RW 05 - " . strtoupper($kategori) . "]*\n\n*{$judul}*\n\n{$pesan}\n\n📅 " . $waktuWib . (!empty($link) ? "\n🔗 Buka Aplikasi: {$link}" : "");
            }

            // 1. Primary Engine: cURL with SSL bypass for local Laragon/XAMPP environments
            if (function_exists('curl_init')) {
                $ch = curl_init('https://api.fonnte.com/send');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, [
                    'target' => $normPhone,
                    'message' => $waText,
                    'countryCode' => '62'
                ]);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: ' . $token
                ]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                $res = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlErr = curl_error($ch);
                curl_close($ch);

                if ($curlErr) {
                    return [
                        'success' => false,
                        'status' => 'failed',
                        'error' => 'cURL Error: ' . $curlErr
                    ];
                }

                $resData = json_decode($res, true);
                $isHttpOk = ($httpCode >= 200 && $httpCode < 300);
                $isStatusOk = isset($resData['status']) ? ($resData['status'] == true) : false;

                if ($isHttpOk && $isStatusOk) {
                    return ['success' => true, 'status' => 'sent', 'response' => $resData];
                } else {
                    $err = $resData['reason'] ?? $resData['detail'] ?? ($res ?: ('HTTP ' . $httpCode));
                    return ['success' => false, 'status' => 'failed', 'error' => 'Fonnte API: ' . $err, 'response' => $resData];
                }
            }

            // 2. Fallback Engine: stream_socket / file_get_contents
            $postBody = http_build_query([
                'target' => $normPhone,
                'message' => $waText,
                'countryCode' => '62'
            ]);
            $opts = [
                'http' => [
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n" .
                                "Authorization: " . $token . "\r\n",
                    'content' => $postBody,
                    'timeout' => 15,
                    'ignore_errors' => true
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ];
            $context = stream_context_create($opts);
            $res = @file_get_contents('https://api.fonnte.com/send', false, $context);
            if ($res === false) {
                return ['success' => false, 'status' => 'failed', 'error' => 'Gagal membuka koneksi ke Fonnte API.'];
            }

            $resData = json_decode($res, true);
            $isStatusOk = isset($resData['status']) ? ($resData['status'] == true) : false;
            if ($isStatusOk) {
                return ['success' => true, 'status' => 'sent', 'response' => $resData];
            } else {
                $err = $resData['reason'] ?? $resData['detail'] ?? 'Pengiriman Fonnte tidak berhasil.';
                return ['success' => false, 'status' => 'failed', 'error' => 'Fonnte API: ' . $err, 'response' => $resData];
            }
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => 'WhatsApp exception: ' . $e->getMessage()
            ];
        }
    }
}

// Helper: Send Email via SMTP with STARTTLS (Official PHPMailer Engine with Socket Fallback)
if (!function_exists('sendSmtpMail')) {
    function sendSmtpMail($smtpCfg, $toEmail, $toName, $subject, $htmlContent) {
        $host = !empty($smtpCfg['smtp_host']) ? trim($smtpCfg['smtp_host']) : 'smtp.gmail.com';
        $port = !empty($smtpCfg['smtp_port']) ? (int)$smtpCfg['smtp_port'] : 587;
        $user = !empty($smtpCfg['smtp_user']) ? trim($smtpCfg['smtp_user']) : 'maulanasaputra2187@gmail.com';
        $pass = !empty($smtpCfg['smtp_pass']) ? trim($smtpCfg['smtp_pass']) : 'iomlctxromokqsgr';
        $fromEmail = !empty($smtpCfg['from_email']) ? trim($smtpCfg['from_email']) : 'maulanasaputra2187@gmail.com';
        $fromName = !empty($smtpCfg['from_name']) ? trim($smtpCfg['from_name']) : 'Digital RW 05';

        // 1. ENGINE UTAMA: PHPMailer Resmi (Port 587 STARTTLS)
        $phpMailerBase = __DIR__ . '/PHPMailer';
        if (file_exists($phpMailerBase . '/PHPMailer.php')) {
            require_once $phpMailerBase . '/Exception.php';
            require_once $phpMailerBase . '/PHPMailer.php';
            require_once $phpMailerBase . '/SMTP.php';

            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = $host;
                $mail->SMTPAuth   = true;
                $mail->Username   = $user;
                $mail->Password   = $pass;
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port       = $port;
                $mail->CharSet    = 'UTF-8';
                $mail->Timeout    = 20;

                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true
                    ]
                ];

                $mail->setFrom($fromEmail, $fromName);
                $mail->addAddress($toEmail, !empty($toName) ? $toName : '');

                $mail->isHTML(true);
                $mail->Subject = $subject;
                $mail->Body    = $htmlContent;
                $plainText = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</div>'], "\n", $htmlContent));
                $mail->AltBody = trim($plainText);

                $mail->send();
                return [
                    'success' => true,
                    'status'  => 'success',
                    'message' => 'Email SMTP berhasil dikirim.'
                ];
            } catch (\Throwable $e) {
                $errorInfo = !empty($mail->ErrorInfo) ? $mail->ErrorInfo : $e->getMessage();
                return [
                    'success' => false,
                    'status'  => 'error',
                    'message' => $errorInfo,
                    'error'   => $errorInfo
                ];
            }
        }

        // 2. ENGINE CADANGAN: Socket SMTP RFC 5321
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);

        $socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            $msg = "Gagal terhubung ke host SMTP {$host}:{$port} - {$errstr} (Kode: {$errno})";
            return ['success' => false, 'status' => 'error', 'message' => $msg, 'error' => $msg];
        }

        stream_set_timeout($socket, 15);

        $readResponse = function() use ($socket) {
            $data = '';
            while ($str = fgets($socket, 515)) {
                $data .= $str;
                if (substr($str, 3, 1) === ' ') break;
            }
            return $data;
        };

        $res = $readResponse();
        if (substr($res, 0, 3) !== '220') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "Koneksi SMTP ditolak server: " . trim($res)];
        }

        fwrite($socket, "EHLO localhost\r\n");
        $res = $readResponse();

        fwrite($socket, "STARTTLS\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '220') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "Perintah STARTTLS ditolak: " . trim($res)];
        }

        $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;

        if (!@stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "Handshake TLS gagal ke server SMTP."];
        }

        fwrite($socket, "EHLO localhost\r\n");
        $res = $readResponse();

        fwrite($socket, "AUTH LOGIN\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "AUTH LOGIN ditolak: " . trim($res)];
        }

        fwrite($socket, base64_encode($user) . "\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "Username SMTP ditolak: " . trim($res)];
        }

        fwrite($socket, base64_encode($pass) . "\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '235') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "Password SMTP ditolak: " . trim($res)];
        }

        fwrite($socket, "MAIL FROM:<{$fromEmail}>\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '250') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "MAIL FROM ditolak: " . trim($res)];
        }

        fwrite($socket, "RCPT TO:<{$toEmail}>\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '250') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "RCPT TO ditolak: " . trim($res)];
        }

        fwrite($socket, "DATA\r\n");
        $res = $readResponse();
        if (substr($res, 0, 3) !== '354') {
            fclose($socket);
            return ['success' => false, 'status' => 'error', 'message' => "DATA ditolak: " . trim($res)];
        }

        $headers = [];
        $headers[] = 'Date: ' . date('r');
        $headers[] = 'From: =?UTF-8?B?' . base64_encode($fromName) . '?= <' . $fromEmail . '>';
        $headers[] = 'To: ' . (!empty($toName) ? '=?UTF-8?B?' . base64_encode($toName) . '?= <' . $toEmail . '>' : '<' . $toEmail . '>');
        $headers[] = 'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/html; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: base64';
        $headers[] = 'X-Mailer: DigitalRW-PHPMailer/2.0';

        $bodyEncoded = chunk_split(base64_encode($htmlContent));
        $msg = implode("\r\n", $headers) . "\r\n\r\n" . $bodyEncoded . "\r\n.\r\n";

        fwrite($socket, $msg);
        $res = $readResponse();

        fwrite($socket, "QUIT\r\n");
        fclose($socket);

        if (substr($res, 0, 3) !== '250') {
            return ['success' => false, 'status' => 'error', 'message' => "Pesan email ditolak server: " . trim($res)];
        }

        return ['success' => true, 'status' => 'success', 'message' => 'Email SMTP berhasil dikirim.'];
    }
}

// Helper: Build branded HTML email body
if (!function_exists('buildHtmlEmail')) {
    function buildHtmlEmail($judul, $pesan, $kategori, $link = null, $detail = []) {
        $currentYear = date('Y');
        $categoryBadgeColors = [
            'Pengumuman' => '#2563eb',
            'Kegiatan' => '#10b981',
            'Pelayanan' => '#f59e0b',
            'Pengaduan' => '#ef4444',
            'Kas' => '#8b5cf6',
            'Darurat' => '#dc2626'
        ];
        $badgeColor = $categoryBadgeColors[$kategori] ?? '#2563eb';
        $btnHtml = '';
        if (!empty($link)) {
            $targetUrl = $link;
            if (strpos($targetUrl, 'http') !== 0) {
                $origin = isset($_SERVER['HTTP_HOST']) ? 'http://' . $_SERVER['HTTP_HOST'] : 'http://localhost';
                $targetUrl = $origin . '/project%20RPL/' . ltrim($targetUrl, '/');
            }
            $btnHtml = "
                <div style='margin-top: 25px; margin-bottom: 25px;'>
                    <a href='{$targetUrl}' target='_blank' style='display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;'>
                        Buka Detail di Aplikasi &rarr;
                    </a>
                </div>
            ";
        }

        $formattedDate = date('d F Y, H:i') . ' WIB';
        $nl2brPesan = nl2br(htmlspecialchars($pesan, ENT_QUOTES, 'UTF-8'));
        $safeJudul = htmlspecialchars($judul, ENT_QUOTES, 'UTF-8');
        $safeKategori = htmlspecialchars($kategori, ENT_QUOTES, 'UTF-8');

        return "
        <!DOCTYPE html>
        <html lang='id'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>{$safeJudul}</title>
        </head>
        <body style='margin:0; padding:0; background-color:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color:#1e293b;'>
            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='background-color:#f1f5f9; padding: 30px 15px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' max-width='600' border='0' cellspacing='0' cellpadding='0' style='max-width:600px; background-color:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border:1px solid #e2e8f0;'>
                            <tr>
                                <td style='background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 25px 30px; text-align: left;'>
                                    <h1 style='margin:0; color:#ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;'>Digital<span style='color:#93c5fd;'>RW</span></h1>
                                    <p style='margin: 4px 0 0 0; color:#bfdbfe; font-size: 12px; font-weight: 500;'>Sistem Informasi Pelayanan & Komunikasi RW 05</p>
                                </td>
                            </tr>
                            <tr>
                                <td style='padding: 30px;'>
                                    <div style='margin-bottom: 15px;'>
                                        <span style='display:inline-block; padding: 4px 12px; border-radius: 9999px; background-color: {$badgeColor}15; color: {$badgeColor}; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;'>
                                            {$safeKategori}
                                        </span>
                                        <span style='color: #64748b; font-size: 12px; margin-left: 8px;'>{$formattedDate}</span>
                                    </div>
                                    <h2 style='margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.4;'>{$safeJudul}</h2>
                                    <div style='font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;'>
                                        {$nl2brPesan}
                                    </div>
                                    {$btnHtml}
                                    <div style='border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 25px; font-size: 12px; color: #64748b;'>
                                        <p style='margin: 0;'>Pesan resmi diterbitkan secara otomatis oleh Sistem Pelayanan Terpadu RW 05.</p>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style='background-color:#f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;'>
                                    <p style='margin: 0 0 4px 0;'>&copy; {$currentYear} Rukun Warga 05. Hak cipta dilindungi.</p>
                                    <p style='margin: 0;'>Pemberitahuan Otomatis &bull; Mohon jangan membalas email ini.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        ";
    }
}

// -------------------------------------------------------------
// Resolvers for RT, RW, and Super Admin Accounts & Contacts
// -------------------------------------------------------------
function resolveKetuaRtAccount($database, $rt, $rw = '05') {
    $targetRt = str_pad($rt ?? '01', 2, '0', STR_PAD_LEFT);
    $targetRw = str_pad($rw ?? '05', 2, '0', STR_PAD_LEFT);

    $matchedUser = null;
    foreach (($database['users'] ?? []) as $u) {
        if (($u['role'] ?? '') === 'Ketua RT' && str_pad($u['rt'] ?? '', 2, '0', STR_PAD_LEFT) === $targetRt) {
            $matchedUser = $u;
            break;
        }
    }

    if (!$matchedUser) {
        return null;
    }

    $phone = trim($matchedUser['no_hp'] ?? '');
    $email = trim($matchedUser['email'] ?? '');
    $name  = trim($matchedUser['name'] ?? ($matchedUser['nama'] ?? 'Ketua RT ' . $targetRt));

    // Fallback phone from wilayah table
    if (empty($phone) || $phone === '-') {
        foreach (($database['wilayah'] ?? []) as $w) {
            if (str_pad($w['rt'] ?? '', 2, '0', STR_PAD_LEFT) === $targetRt) {
                if (!empty($w['kontak']) && $w['kontak'] !== '-') {
                    $phone = trim($w['kontak']);
                }
                break;
            }
        }
    }

    // Fallback phone & email from warga table
    if (empty($phone) || empty($email) || $phone === '-') {
        foreach (($database['warga'] ?? []) as $w) {
            if (str_pad($w['rt'] ?? '', 2, '0', STR_PAD_LEFT) === $targetRt && !empty($w['nama']) && stripos($name, $w['nama']) !== false) {
                if ((empty($phone) || $phone === '-') && !empty($w['no_hp']) && $w['no_hp'] !== '-') {
                    $phone = trim($w['no_hp']);
                }
                if (empty($email) && !empty($w['email'])) {
                    $email = trim($w['email']);
                }
            }
        }
    }

    if (empty($email)) {
        $email = ($matchedUser['username'] ?? 'rt' . $targetRt) . '@rwdigital.id';
    }

    return [
        'id' => $matchedUser['id'] ?? 3,
        'user_id' => $matchedUser['id'] ?? 3,
        'name' => $name,
        'username' => $matchedUser['username'] ?? '',
        'role' => 'Ketua RT',
        'rt' => $targetRt,
        'rw' => $targetRw,
        'phone' => $phone,
        'email' => $email
    ];
}

function resolveKetuaRwAccount($database, $rw = '05') {
    $targetRw = str_pad($rw ?? '05', 2, '0', STR_PAD_LEFT);
    $matchedUser = null;
    foreach (($database['users'] ?? []) as $u) {
        if (($u['role'] ?? '') === 'Ketua RW') {
            $matchedUser = $u;
            break;
        }
    }

    $name = $matchedUser['name'] ?? 'Bambang Mulyono';
    $phone = trim($matchedUser['no_hp'] ?? '');
    $email = trim($matchedUser['email'] ?? 'bambang@rwdigital.id');

    // Fallback phone from warga table (NIK 3201010101010008 Bambang Mulyono: 082114122927)
    if (empty($phone) || $phone === '-') {
        foreach (($database['warga'] ?? []) as $w) {
            if (($w['nik'] ?? '') === '3201010101010008' || stripos($w['nama'] ?? '', 'Bambang') !== false) {
                if (!empty($w['no_hp']) && $w['no_hp'] !== '-') {
                    $phone = trim($w['no_hp']);
                }
                if (empty($email) && !empty($w['email'])) {
                    $email = trim($w['email']);
                }
                break;
            }
        }
    }

    if (empty($phone) || $phone === '-') {
        $phone = '';
    }

    return [
        'id' => $matchedUser['id'] ?? 2,
        'user_id' => $matchedUser['id'] ?? 2,
        'name' => $name,
        'username' => $matchedUser['username'] ?? 'bambang',
        'role' => 'Ketua RW',
        'rw' => $targetRw,
        'phone' => $phone,
        'email' => $email
    ];
}

function resolveSuperAdminAccount($database) {
    $matchedUser = null;
    foreach (($database['users'] ?? []) as $u) {
        if (($u['role'] ?? '') === 'Super Admin') {
            $matchedUser = $u;
            break;
        }
    }

    $name = $matchedUser['name'] ?? 'Budi Santoso';
    $phone = trim($matchedUser['no_hp'] ?? ($matchedUser['telepon'] ?? ''));
    $email = trim($matchedUser['email'] ?? 'budi@rwdigital.id');

    return [
        'id' => $matchedUser['id'] ?? 1,
        'user_id' => $matchedUser['id'] ?? 1,
        'name' => $name,
        'username' => $matchedUser['username'] ?? 'budi',
        'role' => 'Super Admin',
        'phone' => $phone,
        'email' => $email
    ];
}

// -------------------------------------------------------------
// Official Ticketed WhatsApp Message Builders
// -------------------------------------------------------------
function buildSuratWaMessage($nama, $jenisSurat, $noBerkas, $statusLabel, $catatan = '', $link = '#/status-pengajuan') {
    $icon = '📄';
    $statusText = strtoupper($statusLabel);
    $instruksi = 'Silakan pantau status pengajuan berkas Anda melalui aplikasi Digital RW.';

    if (stripos($statusLabel, 'menunggu verifikasi rt') !== false || stripos($statusLabel, 'diajukan') !== false || stripos($statusLabel, 'baru') !== false) {
        $icon = '⏳';
        $statusText = 'MENUNGGU VERIFIKASI RT';
        $instruksi = 'Permohonan surat Anda telah diterima sistem dan sedang dalam antrean verifikasi oleh Ketua RT.';
    } elseif (stripos($statusLabel, 'menunggu_verifikasi_rw') !== false || stripos($statusLabel, 'disetujui rt') !== false || stripos($statusLabel, 'menunggu verifikasi rw') !== false) {
        $icon = '📋';
        $statusText = 'DISETUJUI RT (MENUNGGU VERIFIKASI RW)';
        $instruksi = 'Pengajuan telah disetujui oleh Ketua RT dan saat ini diteruskan ke Ketua RW untuk persetujuan akhir.';
    } elseif (stripos($statusLabel, 'selesai') !== false || stripos($statusLabel, 'disetujui rw') !== false) {
        $icon = '✅';
        $statusText = 'DISETUJUI RW (SELESAI)';
        $instruksi = 'Surat resmi telah diterbitkan dan dapat diunduh/dicetak langsung melalui aplikasi Digital RW atau diambil di kantor sekretariat RW.';
    } elseif (stripos($statusLabel, 'tolak') !== false) {
        $icon = '❌';
        $statusText = 'DITOLAK';
        $instruksi = 'Mohon periksa catatan pengurus di atas. Anda dapat mengajukan kembali permohonan baru setelah melengkapi dokumen.';
    } elseif (stripos($statusLabel, 'perlu diperbaiki') !== false || stripos($statusLabel, 'revisi') !== false) {
        $icon = '⚠️';
        $statusText = 'PERLU DIPERBAIKI';
        $instruksi = 'Mohon segera lakukan perbaikan dokumen pendukung pada menu Status Pengajuan di aplikasi Digital RW agar proses verifikasi dapat dilanjutkan.';
    }

    $waktuSekarang = date('d F Y, H:i') . ' WIB';

    $msg = "{$icon} *[DIGITAL RW 05 - LAYANAN SURAT WARGA]*\n\n"
         . "Halo Bapak/Ibu *{$nama}*,\n"
         . "Pemberitahuan resmi mengenai pengajuan surat pelayanan Anda:\n\n"
         . "📄 *Jenis Surat*: {$jenisSurat}\n"
         . "🆔 *Nomor Tiket*: {$noBerkas}\n"
         . "📌 *Status Terbaru*: *{$statusText}*\n"
         . "💬 *Catatan Pengurus*:\n"
         . "_" . (!empty($catatan) ? trim($catatan) : 'Tidak ada catatan tambahan.') . "_\n\n"
         . "📅 *Waktu Pembaruan*: {$waktuSekarang}\n\n"
         . "👉 {$instruksi}\n"
         . (!empty($link) ? "\n🔗 Buka Aplikasi: {$link}\n" : "\n")
         . "\n_Pesan otomatis dikirim oleh Layanan Notifikasi Digital RW 05._";

    return $msg;
}

function buildPengurusWaMessage($namaPengurus, $rolePengurus, $jenisSurat, $noBerkas, $namaPemohon, $rt, $judulAksi, $pesanAksi, $link = '#/verifikasi-pengajuan') {
    $waktuSekarang = date('d F Y, H:i') . ' WIB';
    $cleanRt = str_pad($rt ?? '01', 2, '0', STR_PAD_LEFT);

    $msg = "🔔 *[DIGITAL RW 05 - LAYANAN SURAT WARGA]*\n\n"
         . "Halo *{$namaPengurus}* ({$rolePengurus}),\n"
         . "*{$judulAksi}*\n\n"
         . "📄 *Jenis Surat*: {$jenisSurat}\n"
         . "🆔 *Nomor Tiket*: {$noBerkas}\n"
         . "👤 *Warga Pemohon*: {$namaPemohon} (RT {$cleanRt}/RW 05)\n"
         . "📌 *Keterangan*: {$pesanAksi}\n\n"
         . "📅 *Waktu*: {$waktuSekarang}\n"
         . (!empty($link) ? "\n🔗 Buka Aplikasi: {$link}\n" : "\n")
         . "\n_Pesan resmi otomatis dikirim oleh Sistem Layanan Digital RW 05._";

    return $msg;
}

// -------------------------------------------------------------
// Idempotency Protection: Prevent duplicate WhatsApp sends within 60s
// -------------------------------------------------------------
function isWhatsAppAlreadySent($database, $recipientPhone, $idempotencyKey, $maxSeconds = 60) {
    if (empty($recipientPhone) || empty($idempotencyKey)) return false;
    $normPhone = normalizePhoneNumber($recipientPhone);
    $now = time();

    foreach (($database['notification_logs'] ?? []) as $log) {
        if (($log['channel'] ?? '') !== 'whatsapp') continue;
        if (($log['status'] ?? '') !== 'sent') continue;

        $target = normalizePhoneNumber($log['recipient_target'] ?? '');
        if ($target !== $normPhone) continue;

        $eventId = $log['event_id'] ?? '';
        $logTime = strtotime($log['created_at'] ?? 'now');

        if (($now - $logTime) <= $maxSeconds) {
            if ($eventId === $idempotencyKey || strpos($eventId, $idempotencyKey) !== false) {
                return true;
            }
        }
    }
    return false;
}

// -------------------------------------------------------------
// Unified Dispatcher: Save In-App, Send WA, Send SMTP Mail, Save Logs
// -------------------------------------------------------------
function dispatchServiceNotification(
    $recipient,
    $judul,
    $pesan,
    $kategori = 'Pelayanan',
    $type = 'info',
    $link = '#/verifikasi-pengajuan',
    &$database = null,
    $config = null,
    $channels = ['in_app', 'whatsapp', 'email'],
    $targetRole = null,
    $targetRt = null,
    $customWaMessage = null,
    $idempotencyKey = null,
    $targetNik = null,
    $targetRw = null
) {
    if (!$recipient || empty($judul) || empty($pesan)) return false;

    if ($database === null) {
        $database = loadDatabase();
    }
    if ($config === null) {
        $config = loadConfig();
    }

    if (!isset($database['notifikasi']) || !is_array($database['notifikasi'])) {
        $database['notifikasi'] = [];
    }
    if (!isset($database['notification_logs']) || !is_array($database['notification_logs'])) {
        $database['notification_logs'] = [];
    }

    $userId = $recipient['id'] ?? ($recipient['user_id'] ?? null);
    $userName = $recipient['name'] ?? 'Pengurus';
    $userPhone = trim($recipient['phone'] ?? ($recipient['no_hp'] ?? ($recipient['telepon'] ?? '')));
    $userEmail = trim($recipient['email'] ?? '');
    $userNik = trim($recipient['nik'] ?? '');

    // Standarisasi Target Role: 'warga' | 'rt' | 'rw' | 'super_admin' | 'all'
    $rawRole = strtolower(trim((string)($targetRole ?: ($recipient['role'] ?? ''))));
    $canonicalTargetRole = 'all';
    if (strpos($rawRole, 'warga') !== false) {
        $canonicalTargetRole = 'warga';
    } elseif (strpos($rawRole, 'rt') !== false) {
        $canonicalTargetRole = 'rt';
    } elseif (strpos($rawRole, 'rw') !== false) {
        $canonicalTargetRole = 'rw';
    } elseif (strpos($rawRole, 'admin') !== false) {
        $canonicalTargetRole = 'super_admin';
    }

    // ATURAN MUTLAK: Super Admin HANYA menerima in-app di web (tidak boleh dikirimi WhatsApp atau Email untuk urusan operasional surat)
    if ($canonicalTargetRole === 'super_admin') {
        $channels = array_values(array_diff($channels, ['whatsapp', 'email']));
    }

    $rtVal = $targetRt ? str_pad($targetRt, 2, '0', STR_PAD_LEFT) : (!empty($recipient['rt']) ? str_pad($recipient['rt'], 2, '0', STR_PAD_LEFT) : '01');
    $rwVal = $targetRw ? str_pad($targetRw, 2, '0', STR_PAD_LEFT) : (!empty($recipient['rw']) ? str_pad($recipient['rw'], 2, '0', STR_PAD_LEFT) : '05');
    $resolvedNik = (string)($targetNik ?: ($recipient['nik'] ?? $userNik));

    // NIK Target hanya disematkan jika notifikasi ditujukan untuk warga pemohon spesifik
    $nikVal = ($canonicalTargetRole === 'warga') ? $resolvedNik : '';

    $notifId = 'NOTIF-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999);
    $eventId = 'EVT-SRV-' . round(microtime(true) * 1000) . '-' . mt_rand(10, 99);
    $now = date('c');

    // 1. IN-APP NOTIFICATION (Lonceng)
    if (in_array('in_app', $channels)) {
        $notifData = [
            'id' => $notifId,
            'target_role' => $canonicalTargetRole, // 'warga' | 'rt' | 'rw' | 'super_admin' | 'all'
            'targetRole' => $canonicalTargetRole,
            'target_nik' => $nikVal,              // NIK warga pemohon (hanya jika target warga)
            'target_rt' => $rtVal,                // untuk pengurus RT terkait
            'targetRt' => $rtVal,
            'target_rw' => $rwVal,                // untuk pengurus RW terkait
            'targetRw' => $rwVal,
            'judul' => $judul,
            'pesan' => $pesan,
            'is_read' => false,
            'isRead' => false,
            'createdAt' => $now,
            'created_at' => date('Y-m-d H:i:s'),
            'waktu' => date('Y-m-d H:i:s'),
            // Backward-compatibility properties:
            'userId' => $userId,
            'nik' => $nikVal,
            'target' => $canonicalTargetRole,
            'role' => $canonicalTargetRole,
            'kategori' => $kategori,
            'type' => $type,
            'link' => $link,
            'priority' => 'normal',
            'tanggal' => $now
        ];
        array_unshift($database['notifikasi'], $notifData);

        // Record in-app log
        array_unshift($database['notification_logs'], [
            'id' => 'LOG-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999),
            'notification_id' => $notifId,
            'event_id' => $eventId,
            'category' => $kategori,
            'channel' => 'in_app',
            'recipient_id' => $userId,
            'recipient_name' => $userName,
            'recipient_target' => 'In-App',
            'title' => $judul,
            'body' => $pesan,
            'link' => $link,
            'status' => 'sent',
            'attempts' => 1,
            'max_retries' => 3,
            'error_message' => null,
            'created_at' => $now,
            'sent_at' => $now
        ]);
    }

    // 2. WHATSAPP NOTIFICATION VIA FONNTE (Validasi Nomor HP & Idempotent 1x)
    if (in_array('whatsapp', $channels)) {
        $cleanPhone = preg_replace('/[^0-9]/', '', (string)$userPhone);

        // ATURAN MUTLAK: Jika nomor kosong atau kurang dari 10 digit, lewati (skip) pengiriman WA secara aman
        if (empty($userPhone) || $userPhone === '-' || strlen($cleanPhone) < 10) {
            error_log("Pengiriman WA dilewati: Nomor target kosong atau tidak valid (kurang dari 10 digit).");
            array_unshift($database['notification_logs'], [
                'id' => 'LOG-SKIP-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999),
                'notification_id' => $notifId,
                'event_id' => !empty($idempotencyKey) ? $idempotencyKey : $eventId,
                'category' => $kategori,
                'channel' => 'whatsapp',
                'recipient_id' => $userId,
                'recipient_name' => $userName,
                'recipient_target' => $userPhone ?: '(kosong)',
                'title' => $judul,
                'body' => !empty($customWaMessage) ? $customWaMessage : $pesan,
                'link' => $link,
                'status' => 'skipped',
                'attempts' => 0,
                'max_retries' => 0,
                'error_message' => 'Pengiriman WA dilewati: Nomor target kosong atau tidak valid (< 10 digit).',
                'created_at' => $now,
                'sent_at' => null
            ]);
        } else {
            $finalWaMessage = !empty($customWaMessage) ? $customWaMessage : $pesan;
            $alreadySent = !empty($idempotencyKey) && isWhatsAppAlreadySent($database, $userPhone, $idempotencyKey, 60);

            if ($alreadySent) {
                array_unshift($database['notification_logs'], [
                    'id' => 'LOG-DUP-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999),
                    'notification_id' => $notifId,
                    'event_id' => $idempotencyKey,
                    'category' => $kategori,
                    'channel' => 'whatsapp',
                    'recipient_id' => $userId,
                    'recipient_name' => $userName,
                    'recipient_target' => $userPhone,
                    'title' => $judul,
                    'body' => $finalWaMessage,
                    'link' => $link,
                    'status' => 'skipped_duplicate',
                    'attempts' => 1,
                    'max_retries' => 3,
                    'error_message' => 'Diabaikan: Notifikasi WhatsApp identik sudah terkirim dalam 60 detik terakhir.',
                    'created_at' => $now,
                    'sent_at' => null
                ]);
            } else {
                $waCfg = $config['whatsapp'] ?? [];
                $waRes = sendWhatsAppMessage($waCfg, $userPhone, $judul, $finalWaMessage, $kategori, $link);

                array_unshift($database['notification_logs'], [
                    'id' => 'LOG-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999),
                    'notification_id' => $notifId,
                    'event_id' => !empty($idempotencyKey) ? $idempotencyKey : $eventId,
                    'category' => $kategori,
                    'channel' => 'whatsapp',
                    'recipient_id' => $userId,
                    'recipient_name' => $userName,
                    'recipient_target' => $userPhone,
                    'title' => $judul,
                    'body' => $finalWaMessage,
                    'link' => $link,
                    'status' => ($waRes['success'] ?? false) ? 'sent' : (($waRes['status'] ?? '') === 'skipped' ? 'skipped' : 'failed'),
                    'attempts' => 1,
                    'max_retries' => 3,
                    'error_message' => ($waRes['success'] ?? false) ? null : ($waRes['error'] ?? 'Pengiriman WA gagal'),
                    'created_at' => $now,
                    'sent_at' => ($waRes['success'] ?? false) ? $now : null
                ]);
            }
        }
    }

    // 3. BRANDED SMTP EMAIL NOTIFICATION
    if (in_array('email', $channels) && !empty($userEmail) && filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
        $emailCfg = $config['email'] ?? [];
        $htmlContent = buildHtmlEmail($judul, $pesan, $kategori, $link);
        $emailRes = sendSmtpMail($emailCfg, $userEmail, $userName, $judul, $htmlContent);

        array_unshift($database['notification_logs'], [
            'id' => 'LOG-' . round(microtime(true) * 1000) . '-' . mt_rand(100, 999),
            'notification_id' => $notifId,
            'event_id' => $eventId,
            'category' => $kategori,
            'channel' => 'email',
            'recipient_id' => $userId,
            'recipient_name' => $userName,
            'recipient_target' => $userEmail,
            'title' => $judul,
            'body' => strip_tags($pesan),
            'link' => $link,
            'status' => ($emailRes['success'] ?? false) ? 'sent' : 'failed',
            'attempts' => 1,
            'max_retries' => 3,
            'error_message' => ($emailRes['success'] ?? false) ? null : ($emailRes['error'] ?? $emailRes['message'] ?? 'Pengiriman email gagal'),
            'created_at' => $now,
            'sent_at' => ($emailRes['success'] ?? false) ? $now : null
        ]);
    }

    return true;
}
