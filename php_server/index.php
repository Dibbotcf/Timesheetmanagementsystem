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

// Simple Router
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Strip query string
$uri = strtok($uri, '?');

// Remove leading slash and split
// Assuming hosted at root or /api...
// If using built-in server at root: /api/auth/login
// We need to handle the base path.

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
            'role' => 'Admin/HR',
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

http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);
?>
