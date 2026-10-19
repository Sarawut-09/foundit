<?php
// FoundIt API - Database Connection & Helper Functions
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db_host = '127.0.0.1';
$db_port = '3306';
$db_name = 'foundit_db';
$db_user = 'root';
$db_pass = '';

try {
    $pdo = new PDO("mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Auto-migration: ตรวจสอบและเพิ่มคอลัมน์ contact_line และ line_id หากยังไม่มี
    try {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `line_id` VARCHAR(50) NULL AFTER `phone`");
    } catch (PDOException $ignored) {}

    try {
        $pdo->exec("ALTER TABLE `items` ADD COLUMN `contact_line` VARCHAR(50) NULL AFTER `contact_phone`");
    } catch (PDOException $ignored) {}

    try {
        $pdo->exec("ALTER TABLE `items` ADD COLUMN `contact_facebook` VARCHAR(100) NULL AFTER `contact_line`");
    } catch (PDOException $ignored) {}

    try {
        $pdo->exec("ALTER TABLE `items` ADD COLUMN `contact_instagram` VARCHAR(100) NULL AFTER `contact_facebook`");
    } catch (PDOException $ignored) {}

    try {
        $pdo->exec("ALTER TABLE `items` MODIFY COLUMN `image` MEDIUMTEXT NULL");
    } catch (PDOException $ignored) {}

    try {
        $pdo->exec("ALTER TABLE `items` ADD COLUMN `returned_at` DATETIME NULL AFTER `status`");
    } catch (PDOException $ignored) {}

    // สร้างบัญชี Admin เริ่มต้น (admin@foundit.example / รหัสผ่าน: Admin1234!) หากยังไม่มี
    try {
        $chkAdmin = $pdo->prepare("SELECT id FROM users WHERE email = 'admin@foundit.example'");
        $chkAdmin->execute();
        if (!$chkAdmin->fetch()) {
            $adminHash = password_hash('Admin1234!', PASSWORD_DEFAULT);
            $insAdmin = $pdo->prepare("
                INSERT INTO users (student_id, fullname, email, password_hash, phone, line_id, role)
                VALUES ('ADM-001', 'ผู้ดูแลระบบ (Admin)', 'admin@foundit.example', ?, '0899999999', '@founditadmin', 'admin')
            ");
            $insAdmin->execute([$adminHash]);
        }
    } catch (PDOException $ignored) {}
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getCurrentUser($pdo) {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, student_id, fullname as name, email, phone, line_id, role FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}
