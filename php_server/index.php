<?php
// index.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

// ── ADMS hardening / observability config ───────────────────────────────────
// All overridable via environment (cPanel → Environment Variables or .env).
if (!defined('ADMS_DEVICE_TZ')) {
    // Device stamps punches in its own local time (handshake sends TimeZone=6).
    // Fixed offset avoids any tz-database dependency on the host.
    define('ADMS_DEVICE_TZ',        getenv('ADMS_DEVICE_TZ')        ?: '+06:00');
    // No push seen within this many seconds ⇒ "stale".
    define('ADMS_STALE_SECONDS',    (int)(getenv('ADMS_STALE_SECONDS') ?: 600));
    // Business-hours window (device-local hour, 24h) used to decide when a
    // stale device should actually raise an alert.
    define('ADMS_BUSINESS_START',   getenv('ADMS_BUSINESS_START') !== false ? (int)getenv('ADMS_BUSINESS_START') : 8);
    define('ADMS_BUSINESS_END',     getenv('ADMS_BUSINESS_END')   !== false ? (int)getenv('ADMS_BUSINESS_END')   : 20);
    // Reserved SN used by the external HTTP canary — never a real device.
    define('ADMS_CANARY_SN',        getenv('ADMS_CANARY_SN')       ?: '__CANARY__');
    // Rolling latency sample cap (keeps the metrics file bounded).
    define('ADMS_LATENCY_MAX',      (int)(getenv('ADMS_LATENCY_MAX') ?: 5000));
    define('ADMS_SLA_SECONDS',      (int)(getenv('ADMS_SLA_SECONDS') ?: 30));
}

// Read–modify–write a JSON file under an exclusive lock, so concurrent device
// pushes (or a push racing the /api/zkt/sync path) can never clobber each other
// and lose records. This is the file-store equivalent of an idempotent,
// serialized INSERT. $mutator receives the decoded array and returns the array
// to persist (or null to abort the write).
function adms_locked_json_update($file, callable $mutator) {
    $fh = @fopen($file, 'c+');            // create if missing, don't truncate
    if (!$fh) return false;
    try {
        if (!flock($fh, LOCK_EX)) { fclose($fh); return false; }
        $raw  = stream_get_contents($fh);
        $data = ($raw !== false && $raw !== '') ? json_decode($raw, true) : [];
        if (!is_array($data)) $data = [];
        $new = $mutator($data);
        if ($new === null) { flock($fh, LOCK_UN); fclose($fh); return false; }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($new));
        fflush($fh);
        flock($fh, LOCK_UN);
    } finally {
        fclose($fh);
    }
    return true;
}

function adms_read_json($file) {
    if (!file_exists($file)) return [];
    $d = json_decode(@file_get_contents($file), true);
    return is_array($d) ? $d : [];
}

// Interpret a device-local "YYYY-MM-DDTHH:MM:SS" string as an absolute unix
// epoch, so latency math is correct regardless of the PHP server's timezone.
function adms_device_epoch($iso) {
    $dt = DateTime::createFromFormat('Y-m-d\TH:i:s', $iso, new DateTimeZone(ADMS_DEVICE_TZ));
    return $dt ? (float)$dt->getTimestamp() : null;
}

// Nearest-rank-with-interpolation percentile over a pre-sorted numeric array.
function adms_percentile(array $sorted, $p) {
    $n = count($sorted);
    if ($n === 0) return null;
    if ($n === 1) return $sorted[0];
    $rank = ($p / 100) * ($n - 1);
    $lo = (int)floor($rank); $hi = (int)ceil($rank);
    if ($lo === $hi) return $sorted[$lo];
    return round($sorted[$lo] + ($sorted[$hi] - $sorted[$lo]) * ($rank - $lo), 3);
}

// Append end-to-end latency samples (one per genuinely-new punch) to a bounded
// rolling file. transport_s = T1(request received) − T0(punch); it captures the
// device push cadence + network. backend_ms = T2(committed) − T1.
function adms_record_latency(array $samples) {
    $t2 = microtime(true);
    adms_locked_json_update(__DIR__ . '/zkt_latency.json', function($data) use ($samples, $t2) {
        foreach ($samples as $s) {
            $data[] = [
                'punch'       => $s['punch'],
                'transport_s' => round($s['t1'] - $s['t0'], 3),
                'backend_ms'  => round(($t2 - $s['t1']) * 1000, 1),
                'at'          => date('c'),
            ];
        }
        $n = count($data);
        if ($n > ADMS_LATENCY_MAX) $data = array_slice($data, $n - ADMS_LATENCY_MAX);
        return $data;
    });
}

// Simple Router
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Strip query string
$uri = strtok($uri, '?');

// Remove leading slash and split
// Assuming hosted at root or /api...
// If using built-in server at root: /api/auth/login
// We need to handle the base path.

// ── ZKTeco ADMS Device Push (/iclock/*) ─────────────────────────────────────
// The ZKT device calls these endpoints directly to push attendance in real-time.
// No port forwarding needed — device makes outbound HTTP to this server.
if (strpos($uri, '/iclock/') !== false) {
    $iaction = ltrim(substr($uri, strpos($uri, '/iclock/') + 7), '/'); // "cdata","getrequest","devicecmd"
    $sn      = $_GET['SN'] ?? 'device';
    $table   = $_GET['table'] ?? '';
    $pushedFile = __DIR__ . '/zkt_pushed_attendance.json';

    // Read raw POST body ONCE and reuse — php://input can't be re-read reliably
    $rawBody = ($method === 'POST' || $method === 'PUT') ? file_get_contents('php://input') : '';

    // ── HTTP canary short-circuit ──────────────────────────────────────────
    // The external canary hits /iclock/cdata?SN=__CANARY__ purely to prove this
    // path is reachable over plain HTTP and is NOT redirected to HTTPS. It must
    // NOT be logged or counted as a device contact (that would keep the health
    // monitor permanently "healthy" even if the real device were dead).
    if ($sn === ADMS_CANARY_SN) {
        header('Content-Type: text/plain');
        echo "OK CANARY\n";
        exit;
    }

    // Rolling diagnostic log of the last 60 device requests (exact protocol
    // trace). Locked read-modify-write so concurrent requests can't lose entries.
    adms_locked_json_update(__DIR__ . '/zkt_device_log.json', function($dlog) use ($iaction, $method, $table, $rawBody) {
        $dlog[] = [
            'time'    => date('c'),
            'action'  => $iaction,
            'method'  => $method,
            'query'   => $_SERVER['QUERY_STRING'] ?? '',
            'table'   => $table,
            'bodyLen' => strlen($rawBody),
            'bodyHead'=> substr($rawBody, 0, 300),
        ];
        if (count($dlog) > 60) $dlog = array_slice($dlog, -60);
        return $dlog;
    });

    // Record every device contact so /api/zkt/adms-status can prove connectivity
    // (single atomic overwrite — last-writer-wins is correct for "last seen").
    @file_put_contents(__DIR__ . '/zkt_device_lastseen.json', json_encode([
        'sn' => $sn, 'action' => $iaction, 'method' => $method,
        'time' => date('c'),
    ]));

    header('Content-Type: text/plain');

    // ── GET /iclock/cdata — device handshake ───────────────────────────────
    if ($iaction === 'cdata' && $method === 'GET') {
        echo "OK\n";
        echo "GET OPTION FROM: {$sn}\n";
        echo "ATTLOGStamp=9999\n";
        echo "OPERLOGStamp=9999\n";
        echo "ErrorDelay=30\n";
        echo "Delay=10\n";
        echo "TransTimes=00:00;14:05\n";
        echo "TransInterval=1\n";
        echo "TransFlag=TransData AttLog UserInfo EnrollUser\n";
        echo "TimeZone=6\n";
        echo "Realtime=1\n";
        echo "Encrypt=None\n";
        exit;
    }

    // ── POST /iclock/cdata?table=ATTLOG — device pushes attendance ─────────
    if ($iaction === 'cdata' && $method === 'POST' && $table === 'ATTLOG') {
        $body = $rawBody;
        // T1 = when this request was received (absolute unix epoch, TZ-independent).
        $t1 = $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true);
        $received = 0; $added = 0; $latencySamples = [];

        // Locked read-modify-write: dedup by "userId|recordTime" is idempotent,
        // and the exclusive lock guarantees two concurrent pushes can't drop rows.
        adms_locked_json_update($pushedFile, function($saved) use ($body, $t1, &$received, &$added, &$latencySamples) {
            $existing = [];
            foreach ($saved as $rec) {
                $k = ($rec['deviceUserId'] ?? '') . '|' . ($rec['recordTime'] ?? '');
                $existing[$k] = $rec;
            }

            // ADMS ATTLOG format (pushver 2.x): PIN \t DateTime \t Status \t Verify \t WorkCode ...
            // e.g. "21\t2026-07-13 09:10:12\t0\t4\t\t0\t0"  → DateTime is field [1].
            foreach (explode("\n", trim($body)) as $line) {
                $line = trim($line);
                if (!$line) continue;
                $f = explode("\t", $line);
                if (count($f) < 2) continue;
                $userId   = trim($f[0]);
                $dateTime = trim($f[1]); // "2026-07-13 09:10:12"
                if (!$userId || !$dateTime) continue;
                // Guard: field must look like a datetime, not a status digit
                if (!preg_match('/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/', $dateTime)) continue;
                $iso = str_replace(' ', 'T', $dateTime); // "2026-07-13T09:10:12"
                $received++;
                $k = "{$userId}|{$iso}";
                if (!isset($existing[$k])) {
                    $existing[$k] = ['deviceUserId' => $userId, 'recordTime' => $iso];
                    $added++;
                    // T0 = punch time (device-local → absolute epoch). Sample only
                    // genuinely-new punches so re-pushed duplicates don't skew stats.
                    $t0 = adms_device_epoch($iso);
                    if ($t0 !== null) {
                        $latencySamples[] = ['punch' => $iso, 't0' => $t0, 't1' => $t1];
                    }
                }
            }
            return array_values($existing);
        });

        // T2 = commit time — recorded inside adms_record_latency().
        if ($latencySamples) adms_record_latency($latencySamples);

        // Acknowledge ALL received records (not just new ones) so the device
        // never retries duplicates in a loop.
        echo "OK: {$received}\n";
        exit;
    }

    // ── POST /iclock/cdata?table=USERINFO — device pushes user list ───────
    if ($iaction === 'cdata' && $method === 'POST' && $table === 'USERINFO') {
        $body = $rawBody;
        $pushedUsersFile = __DIR__ . '/zkt_pushed_users.json';

        $existing = [];
        if (file_exists($pushedUsersFile)) {
            $saved = json_decode(file_get_contents($pushedUsersFile), true);
            if (is_array($saved)) {
                foreach ($saved as $u) {
                    $existing[$u['userId'] ?? ''] = $u;
                }
            }
        }

        // USERINFO format: PIN \t Password \t Name \t Pri \t Verify \t Group ...
        foreach (explode("\n", trim($body)) as $line) {
            $line = trim($line);
            if (!$line) continue;
            $f = explode("\t", $line);
            if (count($f) < 1) continue;
            $userId = trim($f[0]);
            $name   = isset($f[2]) ? trim($f[2]) : '';
            if (!$userId) continue;
            $existing[$userId] = ['userId' => $userId, 'name' => $name, 'uid' => intval($userId), 'role' => 0, 'password' => '', 'cardno' => 0];
        }

        file_put_contents($pushedUsersFile, json_encode(array_values($existing)));
        echo "OK: " . count($existing) . "\n";
        exit;
    }

    // ── GET /iclock/getrequest — device polls for commands ─────────────────
    // ── POST /iclock/devicecmd — device sends command result ───────────────
    // ── Any other iclock path ───────────────────────────────────────────────
    echo "OK\n";
    exit;
}

// Extract path after /api/
if (strpos($uri, '/api/') !== false) {
    $path = substr($uri, strpos($uri, '/api/') + 5);
} else {
    // Fallback or 404
    if ($uri === '/' || $uri === '/index.php') {
        echo json_encode(['status' => 'PHP Backend Running']);
        exit;
    }
    http_response_code(404);
    echo json_encode(['error' => 'Not Found']);
    exit;
}

// Routes
// path: auth/login
// path: items/:type
// path: items/:type/:id

$parts = explode('/', $path);

if ($parts[0] === 'health') {
    echo json_encode(['status' => 'ok', 'timestamp' => date('c')]);
    exit;
}

if ($parts[0] === 'auth' && $parts[1] === 'login' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    
    if (!$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Password required']);
        exit;
    }
    
    $passParts = explode('@', $password);
    if (count($passParts) !== 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid password format']);
        exit;
    }
    
    list($nameInput, $suffixInput) = $passParts;
    $inputNameLower = strtolower(trim($nameInput));
    $suffix = trim($suffixInput);
    $lowerSuffix = strtolower($suffix);
    
    // Superadmin Check
    if ($inputNameLower === 'superadmin' && $lowerSuffix === 'tcfadmin') {
        $tempAdmin = [
            'id' => 'sys-admin-temp',
            'name' => 'Superadmin',
            'eid' => 'SYS001',
            'role' => 'Superadmin',
            'status' => 'Active',
            'dob' => date('c'),
            'joiningDate' => date('c')
        ];
        echo json_encode([
            'success' => true,
            'user' => $tempAdmin,
            'token' => base64_encode(json_encode($tempAdmin))
        ]);
        exit;
    }
    
    $employees = get_by_prefix('employees:');
    $todayStr = date('d/m/Y');
    
    // Check if any admin exists
    $hasAdmin = false;
    foreach ($employees as $e) {
        if (($e['role'] ?? '') === 'Admin/HR' && ($e['status'] ?? '') === 'Active') {
            $hasAdmin = true;
            break;
        }
    }
    
    $foundEmployee = null;
    foreach ($employees as $emp) {
        $empNameLower = strtolower($emp['name']);
        $empFirstName = explode(' ', $empNameLower)[0];
        $nameMatches = ($empNameLower === $inputNameLower) || ($empFirstName === $inputNameLower);
        
        if (!$nameMatches) continue;
        
        if (($emp['role'] ?? '') === 'Admin/HR') {
            if ($lowerSuffix === 'tcfadmin') {
                $foundEmployee = $emp;
                break;
            }
        } else {
            // Staff DOB check
            $dobStr = '';
            if (!empty($emp['dob'])) {
                // Assuming ISO format YYYY-MM-DD...
                $timestamp = strtotime($emp['dob']);
                if ($timestamp) {
                    $dobStr = date('d/m/Y', $timestamp);
                }
            }
            if ($suffix === $todayStr || ($dobStr && $suffix === $dobStr)) {
                $foundEmployee = $emp;
                break;
            }
        }
    }
    
    if ($foundEmployee) {
        echo json_encode([
            'success' => true,
            'user' => $foundEmployee,
            'token' => base64_encode(json_encode($foundEmployee))
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials']);
    }
    exit;
}

if ($parts[0] === 'items') {
    $type = $parts[1] ?? null;
    $id = $parts[2] ?? null;
    
    if (!$type) {
        http_response_code(400);
        echo json_encode(['error' => 'Type required']);
        exit;
    }
    
    if ($method === 'GET') {
        if ($id) {
            $item = get_item("$type:$id");
            if (!$item) {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
            } else {
                echo json_encode($item);
            }
        } else {
            $items = get_by_prefix("$type:");
            echo json_encode($items);
        }
        exit;
    }
    
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $bodyId = $body['id'] ?? null;
        if (!$bodyId) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }
        set_item("$type:$bodyId", $body);
        echo json_encode(['success' => true, 'data' => $body]);
        exit;
    }
    
    if ($method === 'DELETE' && $id) {
        del_item("$type:$id");
        echo json_encode(['success' => true]);
        exit;
    }
}

if ($parts[0] === 'backups') {
    if (isset($parts[1]) && $parts[1] === 'data') {
        if ($method === 'GET') {
            $path = $_GET['path'] ?? '';
            if (!$path) {
                http_response_code(400); echo json_encode(['error' => 'Path required']); exit;
            }
            global $pdo;
            $stmt = $pdo->prepare("SELECT content FROM backups WHERE name = ?");
            $stmt->execute([$path]);
            $backup = $stmt->fetchColumn();
            if ($backup) {
                echo $backup;
            } else {
                http_response_code(404); echo json_encode(['error' => 'Backup not found']);
            }
            exit;
        }
    }
    
    if ($method === 'GET' && !isset($parts[1])) {
        // List backups
        global $pdo;
         try {
            $stmt = $pdo->query("SELECT id, name, created_at, LENGTH(content) as size FROM backups ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
            $backups = array_map(function($r) {
                return [
                    'name' => $r['name'],
                    'id' => $r['id'],
                    'created_at' => $r['created_at'],
                    'metadata' => ['size' => $r['size']]
                ];
            }, $rows);
            echo json_encode($backups);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to list backups']);
        }
        exit;
    }
    
    if ($method === 'POST') {
        // Create backup
        $input = json_decode(file_get_contents('php://input'), true);
        $type = $input['type'] ?? 'manual';
        $label = $input['label'] ?? '';
        
        $collectionNames = [
            'employees', 'templates', 'folders', 'timesheets',
            'signatures', 'leaves', 'ot_records', 'report_folders',
            'saved_reports', 'leave_folders', 'saved_leave_reports'
        ];
        
        $backupContent = [
            'timestamp' => date('c'),
            'type' => $type,
            'label' => $label,
            'data' => []
        ];
        
        foreach ($collectionNames as $col) {
            $backupContent['data'][$col] = [];
        }
        
        // Fetch all KV
        global $pdo;
        $all = $pdo->query("SELECT * FROM kv_store")->fetchAll();
        
        foreach ($all as $row) {
            $key = $row['key'];
            $val = json_decode($row['value'], true);
            foreach ($collectionNames as $col) {
                 if (strpos($key, $col . ':') === 0) {
                     $backupContent['data'][$col][] = $val;
                     break;
                 }
            }
        }
        
        $filename = "{$type}_" . date('Y-m-d_H-i-s') . ".json";
        
        $stmt = $pdo->prepare("INSERT INTO backups (name, content) VALUES (?, ?)");
        $stmt->execute([$filename, json_encode($backupContent)]);
        
        echo json_encode(['success' => true, 'filename' => $filename]);
        exit;
    }
    
    if ($method === 'DELETE') {
        $path = $_GET['path'] ?? '';
        if (!$path) {
            http_response_code(400); echo json_encode(['error' => 'Path required']); exit;
        }
        global $pdo;
        $stmt = $pdo->prepare("DELETE FROM backups WHERE name = ?");
        $stmt->execute([$path]);
        echo json_encode(['success' => true]);
        exit;
    }
}

if ($parts[0] === 'restore' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $data = $input['data'] ?? null;
    if (!$data) {
        http_response_code(400); echo json_encode(['error' => 'No data']); exit;
    }
    
    global $pdo;
    $pdo->beginTransaction();
    try {
        $pdo->exec("TRUNCATE TABLE kv_store");
        $stmt = $pdo->prepare("INSERT INTO kv_store (`key`, `value`) VALUES (?, ?)");
        
        foreach ($data as $colName => $items) {
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (isset($item['id'])) {
                        $key = "$colName:{$item['id']}";
                        $stmt->execute([$key, json_encode($item)]);
                    }
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Restore failed']);
    }
    exit;
}

if ($parts[0] === 'upload-pdf' && $method === 'POST') {
    // 1. Get auth header and verify admin status
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } else {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        }
    }

    $isAdmin = false;
    if (strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        $decoded = json_decode(base64_decode($token), true);
        if ($decoded && isset($decoded['role']) && $decoded['role'] === 'Admin/HR') {
            $isAdmin = true;
        }
    }

    if (!$isAdmin) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }

    // 2. Validate target filename
    $targetFilename = $_GET['filename'] ?? '';
    $allowed_filenames = [
      'Company Policy 2026.pdf',
      '27 Doctrines.pdf',
      '10 Code of Capable Person.pdf',
      'Corporate Etiquette.pdf',
      'Leave Process Notice.pdf',
      'Rules for Prevention from Sexual and Power Harassment in Workplace.pdf',
      'Leave Rules for What\'s app use.pdf',
      'TCF - Leave Application Fillable  DEC 2025.pdf',
      'TCF Bangladesh Profile.pdf',
      'TCF Letterhead new.pdf'
    ];

    if (!$targetFilename || !in_array($targetFilename, $allowed_filenames)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or disallowed filename']);
        exit;
    }

    // 3. Process the uploaded file
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'File upload error code: ' . $file['error']]);
        exit;
    }

    // Ensure it's a PDF
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'pdf') {
        http_response_code(400);
        echo json_encode(['error' => 'Only PDF files are allowed']);
        exit;
    }

    // Target directory: ../Download TCF items/
    $targetDir = __DIR__ . '/../Download TCF items/';
    
    // Ensure the folder exists
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    $targetPath = $targetDir . $targetFilename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['success' => true, 'filename' => $targetFilename]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save uploaded file']);
    }
    exit;
}

if ($parts[0] === 'zkt') {
    require_once 'zkteco.php';

    $configFile = __DIR__ . '/zkt-device-config.json';
    $overridesFile = __DIR__ . '/zkt-time-overrides.json';

    $readConfig = function() use ($configFile) {
        if (getenv('ZKT_IP')) {
            return [
                'ip'        => trim(getenv('ZKT_IP')),
                'port'      => intval(getenv('ZKT_PORT') ?: 4370),
                'machineNo' => intval(getenv('ZKT_MACHINE_NO') ?: 102),
            ];
        }
        if (file_exists($configFile)) {
            $data = json_decode(file_get_contents($configFile), true);
            if ($data) return $data;
        }
        return [
            'ip'        => '192.168.68.40',
            'port'      => 4370,
            'machineNo' => 102,
        ];
    };

    $getZk = function() use ($readConfig) {
        $cfg = $readConfig();
        $zk = new ZKTeco($cfg['ip'], $cfg['port'], 10);
        $zk->connect();
        return $zk;
    };

    $action = $parts[1] ?? null;

    if ($action === 'device-config') {
        if ($method === 'GET') {
            echo json_encode($readConfig());
            exit;
        }
        if ($method === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $ip = $body['ip'] ?? '';
            $port = $body['port'] ?? '';
            if (!$ip || !$port) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'ip and port required']);
                exit;
            }
            $cfg = [
                'ip'        => trim($ip),
                'port'      => intval($port),
                'machineNo' => intval($body['machineNo'] ?? 0)
            ];
            file_put_contents($configFile, json_encode($cfg, JSON_PRETTY_PRINT));
            echo json_encode(['success' => true, 'config' => $cfg]);
            exit;
        }
    }

    if ($action === 'status') {
        if ($method === 'GET') {
            $cfg = $readConfig();
            try {
                $zk = $getZk();
                $info = $zk->getInfo();
                $zk->disconnect();
                echo json_encode(array_merge([
                    'connected' => true,
                    'mode' => 'direct',
                    'ip' => $cfg['ip'],
                    'port' => $cfg['port'],
                    'machineNo' => $cfg['machineNo']
                ], $info));
            } catch (Exception $e) {
                // Direct TCP failed (normal from cloud). If the device has pushed
                // via ADMS recently, it IS online — report connected via push.
                $lastSeenFile = __DIR__ . '/zkt_device_lastseen.json';
                $lastSeen = null;
                $pushAlive = false;
                if (file_exists($lastSeenFile)) {
                    $lastSeen = json_decode(file_get_contents($lastSeenFile), true);
                    if (!empty($lastSeen['time'])) {
                        $age = time() - strtotime($lastSeen['time']);
                        $pushAlive = ($age >= 0 && $age < 600); // seen in last 10 min
                    }
                }
                echo json_encode([
                    'connected' => $pushAlive,
                    'mode' => $pushAlive ? 'push' : 'offline',
                    'ip' => $cfg['ip'],
                    'port' => $cfg['port'],
                    'machineNo' => $cfg['machineNo'],
                    'lastSeen' => $lastSeen['time'] ?? null,
                    'error' => $pushAlive ? null : $e->getMessage()
                ]);
            }
            exit;
        }
    }

    if ($action === 'attendance') {
        if ($method === 'GET') {
            $pushedFile = __DIR__ . '/zkt_pushed_attendance.json';
            try {
                // Try direct device connection (works on local network)
                $zk = $getZk();
                $records = $zk->getAttendances();
                $zk->disconnect();
                usort($records, fn($a, $b) => strcmp($b['recordTime'], $a['recordTime']));
                echo json_encode(['success' => true, 'total' => count($records), 'records' => $records, 'source' => 'device']);
            } catch (Exception $e) {
                // Fallback: use data pushed by the device via ADMS
                if (file_exists($pushedFile)) {
                    $records = json_decode(file_get_contents($pushedFile), true) ?: [];
                    // Drop any malformed records (e.g. recordTime "0" from an old parser bug)
                    $records = array_values(array_filter($records, fn($r) =>
                        isset($r['recordTime']) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $r['recordTime'])
                    ));
                    usort($records, fn($a, $b) => strcmp($b['recordTime'], $a['recordTime']));
                    echo json_encode(['success' => true, 'total' => count($records), 'records' => $records, 'source' => 'push']);
                } else {
                    echo json_encode(['success' => false, 'records' => [], 'total' => 0, 'error' => $e->getMessage()]);
                }
            }
            exit;
        }
    }

    if ($action === 'users') {
        if ($method === 'GET') {
            $pushedUsersFile = __DIR__ . '/zkt_pushed_users.json';
            try {
                $zk = $getZk();
                $users = $zk->getUsers();
                $zk->disconnect();
                echo json_encode(['success' => true, 'users' => $users, 'source' => 'device']);
            } catch (Exception $e) {
                // Fallback: use user list pushed by device via ADMS USERINFO
                if (file_exists($pushedUsersFile)) {
                    $users = json_decode(file_get_contents($pushedUsersFile), true) ?: [];
                    echo json_encode(['success' => true, 'users' => $users, 'source' => 'push']);
                } else {
                    // Return empty list gracefully — never 500
                    echo json_encode(['success' => true, 'users' => [], 'source' => 'none', 'error' => $e->getMessage()]);
                }
            }
            exit;
        }

        if ($method === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            try {
                $zk = $getZk();
                $zk->writeUser(
                    intval($body['uid'] ?? 0),
                    strval($body['userId']),
                    strval($body['name'] ?? ''),
                    intval($body['cardno'] ?? 0),
                    strval($body['password'] ?? ''),
                    intval($body['role'] ?? 0)
                );
                $zk->disconnect();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            exit;
        }

        $userId = $parts[2] ?? null;
        if ($userId) {
            if ($method === 'PUT') {
                $body = json_decode(file_get_contents('php://input'), true);
                try {
                    $zk = $getZk();
                    $zk->writeUser(
                        intval($body['uid'] ?? 0),
                        $userId,
                        strval($body['name'] ?? ''),
                        intval($body['cardno'] ?? 0),
                        strval($body['password'] ?? ''),
                        intval($body['role'] ?? 0)
                    );
                    $zk->disconnect();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                }
                exit;
            }

            if ($method === 'DELETE') {
                $body = json_decode(file_get_contents('php://input'), true);
                try {
                    $zk = $getZk();
                    $zk->deleteUser(intval($body['uid'] ?? 0), $userId);
                    $zk->disconnect();
                    echo json_encode(['success' => true]);
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
                }
                exit;
            }
        }
    }

    // ── POST /api/zkt/sync — bulk upload from local office server ─────────────
    // Called by server/sync-to-live.js on the office PC to push all device data
    if ($action === 'sync' && $method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) { http_response_code(400); echo json_encode(['error' => 'Invalid JSON']); exit; }

        $pushedFile     = __DIR__ . '/zkt_pushed_attendance.json';
        $pushedUsersFile= __DIR__ . '/zkt_pushed_users.json';

        $attAdded = 0; $usersAdded = 0;

        // Merge attendance records (locked — safe against a concurrent device push)
        if (!empty($body['records']) && is_array($body['records'])) {
            adms_locked_json_update($pushedFile, function($saved) use ($body, &$attAdded) {
                $existing = [];
                foreach ($saved as $rec) {
                    $k = ($rec['deviceUserId'] ?? '') . '|' . ($rec['recordTime'] ?? '');
                    $existing[$k] = $rec;
                }
                foreach ($body['records'] as $rec) {
                    $k = ($rec['deviceUserId'] ?? '') . '|' . ($rec['recordTime'] ?? '');
                    if (!isset($existing[$k])) { $existing[$k] = $rec; $attAdded++; }
                }
                return array_values($existing);
            });
        }

        // Overwrite users (fresher list always wins)
        if (!empty($body['users']) && is_array($body['users'])) {
            file_put_contents($pushedUsersFile, json_encode($body['users']));
            $usersAdded = count($body['users']);
        }

        echo json_encode(['success' => true, 'att_added' => $attAdded, 'users_saved' => $usersAdded]);
        exit;
    }

    if ($action === 'adms-status') {
        $pushedFile = __DIR__ . '/zkt_pushed_attendance.json';
        $usersFile  = __DIR__ . '/zkt_pushed_users.json';
        $attRecords = 0; $attLatest = null;
        if (file_exists($pushedFile)) {
            $recs = json_decode(file_get_contents($pushedFile), true) ?: [];
            $attRecords = count($recs);
            if ($attRecords > 0) {
                usort($recs, fn($a,$b) => strcmp($b['recordTime'],$a['recordTime']));
                $attLatest = $recs[0]['recordTime'] ?? null;
            }
        }
        $userCount = 0;
        if (file_exists($usersFile)) {
            $userCount = count(json_decode(file_get_contents($usersFile), true) ?: []);
        }
        $lastSeen = null;
        $lastSeenFile = __DIR__ . '/zkt_device_lastseen.json';
        if (file_exists($lastSeenFile)) {
            $lastSeen = json_decode(file_get_contents($lastSeenFile), true);
        }
        $devLog = [];
        $logFile = __DIR__ . '/zkt_device_log.json';
        if (file_exists($logFile)) {
            $devLog = json_decode(file_get_contents($logFile), true) ?: [];
        }
        // Summarise recent request actions/tables and return the tail
        $summary = [];
        foreach ($devLog as $e) {
            $key = $e['method'] . ' ' . $e['action'] . ($e['table'] ? ('?table=' . $e['table']) : '');
            $summary[$key] = ($summary[$key] ?? 0) + 1;
        }

        // ── Health assessment ──────────────────────────────────────────────
        // "Stale" = no device contact within ADMS_STALE_SECONDS. It only becomes
        // an actionable alert during business hours (nobody punches overnight).
        $now          = time();
        $lastSeenTime = $lastSeen['time'] ?? null;
        $ageSeconds   = $lastSeenTime ? ($now - strtotime($lastSeenTime)) : null;
        $localHour    = (int)(new DateTime('now', new DateTimeZone(ADMS_DEVICE_TZ)))->format('G');
        $inBusiness   = ($localHour >= ADMS_BUSINESS_START && $localHour < ADMS_BUSINESS_END);
        if ($ageSeconds === null)            { $status = 'never_seen'; $healthy = false; }
        elseif ($ageSeconds < 0)             { $status = 'clock_skew'; $healthy = false; }
        elseif ($ageSeconds < ADMS_STALE_SECONDS) { $status = 'healthy'; $healthy = true; }
        else                                 { $status = 'stale';   $healthy = false; }
        $alert = ($inBusiness && !$healthy);
        $health = [
            'status'                  => $status,   // healthy | stale | never_seen | clock_skew
            'healthy'                 => $healthy,
            'last_seen'               => $lastSeenTime,
            'last_seen_age_seconds'   => $ageSeconds,
            'stale_threshold_seconds' => ADMS_STALE_SECONDS,
            'device_local_hour'       => $localHour,
            'in_business_hours'       => $inBusiness,
            'alert'                   => $alert,    // true ⇒ page someone
        ];

        // ── End-to-end latency percentiles ─────────────────────────────────
        $lat   = adms_read_json(__DIR__ . '/zkt_latency.json');
        $tvals = array_column($lat, 'transport_s'); sort($tvals);
        $bvals = array_column($lat, 'backend_ms');  sort($bvals);
        $tp95  = adms_percentile($tvals, 95);
        $latency = [
            'samples'            => count($lat),
            'transport_seconds'  => [ // device push cadence + network (T1 − T0)
                'p50' => adms_percentile($tvals, 50),
                'p95' => $tp95,
                'p99' => adms_percentile($tvals, 99),
                'max' => $tvals ? round(max($tvals), 3) : null,
            ],
            'backend_ms'         => [ // server parse+dedup+commit (T2 − T1)
                'p50' => adms_percentile($bvals, 50),
                'p95' => adms_percentile($bvals, 95),
                'p99' => adms_percentile($bvals, 99),
                'max' => $bvals ? round(max($bvals), 1) : null,
            ],
            'sla_target_seconds'        => ADMS_SLA_SECONDS,
            'transport_p95_within_sla'  => $tp95 === null ? null : ($tp95 <= ADMS_SLA_SECONDS),
        ];

        // Monitor mode (?monitor): return 503 so uptime tools alert automatically.
        if (isset($_GET['monitor']) && $alert) http_response_code(503);

        echo json_encode([
            'health'                  => $health,
            'latency'                 => $latency,
            'adms_attendance_records' => $attRecords,
            'adms_latest_record'      => $attLatest,
            'adms_user_count'         => $userCount,
            'pushed_att_file_exists'  => file_exists($pushedFile),
            'pushed_users_file_exists'=> file_exists($usersFile),
            'device_last_seen'        => $lastSeen,
            'request_summary'         => $summary,
            'recent_requests'         => array_slice($devLog, -15),
        ]);
        exit;
    }

    if ($action === 'time-overrides') {
        $readOverrides = function() use ($overridesFile) {
            if (file_exists($overridesFile)) {
                $data = json_decode(file_get_contents($overridesFile), true);
                if ($data) return $data;
            }
            return new stdClass();
        };

        if ($method === 'GET') {
            echo json_encode($readOverrides());
            exit;
        }

        if ($method === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $key = $body['key'] ?? '';
            if (!$key) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'key required']);
                exit;
            }
            $overrides = (array)$readOverrides();
            $overrides[$key] = [
                'entry' => $body['entry'] ?? '',
                'out' => $body['out'] ?? ''
            ];
            file_put_contents($overridesFile, json_encode($overrides, JSON_PRETTY_PRINT));
            echo json_encode(['success' => true]);
            exit;
        }
    }
}

http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);
?>
