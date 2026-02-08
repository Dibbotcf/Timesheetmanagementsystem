<?php
// db.php
// require_once __DIR__ . '/vendor/autoload.php'; // Removed: Manually parsing .env below

// Simple .env parser for this environment if composer is not used
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (empty(trim($line))) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        // echo "Read env: $name=$value\n";
        putenv(sprintf('%s=%s', $name, $value));
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

// Load .env from parent directory
$envPath = __DIR__ . '/../.env';
// echo "Loading env from: " . realpath($envPath) . "\n";
loadEnv($envPath);

$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: '';
$name = getenv('DB_NAME') ?: 'timesheet_db';

// echo "Debug DB Config: H=$host U=$user P='$pass' N=$name\n";

try {
    $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // If running in a local environment without DB, maybe fail gracefully or log
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

function get_item($key) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT value FROM kv_store WHERE `key` = ?");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if ($row) {
        return json_decode($row['value'], true);
    }
    return null;
}

function set_item($key, $value) {
    global $pdo;
    $json = json_encode($value);
    $stmt = $pdo->prepare("INSERT INTO kv_store (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?");
    $stmt->execute([$key, $json, $json]);
}

function del_item($key) {
    global $pdo;
    $stmt = $pdo->prepare("DELETE FROM kv_store WHERE `key` = ?");
    $stmt->execute([$key]);
}

function get_by_prefix($prefix) {
    global $pdo;
    // Note: The original node code used `prefix:` which implies the colon is part of the prefix or handled by caller?
    // Node: `getByPrefix('employees:')` -> query `LIKE 'employees:%'`
    // So caller provides the colon if needed.
    $stmt = $pdo->prepare("SELECT value FROM kv_store WHERE `key` LIKE ?");
    $stmt->execute([$prefix . '%']);
    $results = [];
    while ($row = $stmt->fetch()) {
        $results[] = json_decode($row['value'], true);
    }
    return $results;
}
?>
