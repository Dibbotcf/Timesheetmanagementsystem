<?php
require_once 'db.php';
echo "Env path: " . realpath(__DIR__ . '/../.env') . "\n";
echo "DB_PASSWORD env: " . getenv('DB_PASSWORD') . "\n";

try {
    $stmt = $pdo->query("SELECT count(*) as count FROM kv_store");
    $row = $stmt->fetch();
    echo "DB Connection OK. kv_store row count: " . $row['count'] . "\n";
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
    // Attempt schema creation if table missing
    if (strpos($e->getMessage(), "doesn't exist") !== false) {
        echo "Creating table...\n";
        $sql = file_get_contents('../server/schema.sql');
        $pdo->exec($sql);
        echo "Table created.\n";
    }
}
?>
