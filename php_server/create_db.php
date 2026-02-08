<?php
$host = 'localhost';
$user = 'root';
$pass = 'root';

try {
    $pdo = new PDO("mysql:host=$host", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `timesheet_db`");
    echo "Database created successfully\n";
} catch (PDOException $e) {
    die("DB Creation failed: " . $e->getMessage());
}
?>
