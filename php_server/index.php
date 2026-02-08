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
    if ($parts[1] ?? '' === 'data') {
        // Download backup logic TBD or reuse endpoint structure
        // The node app has /api/backups/data?path=...
        // This is getting nested, let's keep it simple
    }
    
    if ($method === 'GET') {
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

http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);
?>
