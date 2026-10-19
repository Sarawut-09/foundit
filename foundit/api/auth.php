<?php
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$input = getJsonInput();

switch ($action) {
    case 'login':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่าน'], 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(['success' => false, 'message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'], 401);
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['fullname'];

        jsonResponse([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'user' => [
                'id' => $user['id'],
                'studentId' => $user['student_id'],
                'name' => $user['fullname'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'line_id' => $user['line_id'] ?? null,
                'role' => $user['role']
            ]
        ]);
        break;

    case 'register':
        $name = trim($input['name'] ?? $input['fullname'] ?? '');
        $email = trim($input['email'] ?? '');
        $studentId = trim($input['studentId'] ?? $input['student_id'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'message' => 'รูปแบบอีเมลไม่ถูกต้อง'], 400);
        }

        if (strlen($password) < 6) {
            jsonResponse(['success' => false, 'message' => 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'], 400);
        }

        // ตรวจสอบอีเมลซ้ำ
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'อีเมลนี้ถูกใช้งานแล้ว'], 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $insertStmt = $pdo->prepare('INSERT INTO users (fullname, email, student_id, password_hash) VALUES (?, ?, ?, ?)');
        $insertStmt->execute([$name, $email, $studentId ?: null, $hash]);

        $userId = $pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_name'] = $name;

        jsonResponse([
            'success' => true,
            'message' => 'สมัครสมาชิกสำเร็จ',
            'user' => [
                'id' => (int)$userId,
                'studentId' => $studentId,
                'name' => $name,
                'email' => $email,
                'phone' => '',
                'role' => 'user'
            ]
        ], 201);
        break;

    case 'logout':
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }
        session_destroy();
        jsonResponse(['success' => true, 'message' => 'ออกจากระบบเรียบร้อยแล้ว']);
        break;

    case 'me':
        $user = getCurrentUser($pdo);
        if ($user) {
            jsonResponse([
                'success' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'studentId' => $user['student_id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'phone' => $user['phone'],
                    'line_id' => $user['line_id'] ?? null,
                    'role' => $user['role']
                ]
            ]);
        } else {
            jsonResponse(['success' => false, 'user' => null]);
        }
        break;

    case 'update_profile':
        $user = getCurrentUser($pdo);
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'], 401);
        }

        $name = trim($input['name'] ?? $user['name']);
        $email = trim($input['email'] ?? $user['email']);
        $studentId = trim($input['studentId'] ?? $input['student_id'] ?? $user['student_id']);
        $phone = trim($input['phone'] ?? $user['phone']);
        $lineId = trim($input['lineId'] ?? $input['line_id'] ?? ($user['line_id'] ?? ''));

        if (empty($name) || empty($email)) {
            jsonResponse(['success' => false, 'message' => 'ชื่อและอีเมลไม่สามารถเว้นว่างได้'], 400);
        }

        // ตรวจสอบอีเมลซ้ำกับคนอื่น
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
        $stmt->execute([$email, $user['id']]);
        if ($stmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว'], 409);
        }

        $stmt = $pdo->prepare('UPDATE users SET fullname = ?, email = ?, student_id = ?, phone = ?, line_id = ? WHERE id = ?');
        $stmt->execute([$name, $email, $studentId ?: null, $phone ?: null, $lineId ?: null, $user['id']]);

        jsonResponse([
            'success' => true,
            'message' => 'บันทึกข้อมูลส่วนตัวสำเร็จ',
            'user' => [
                'id' => (int)$user['id'],
                'studentId' => $studentId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'line_id' => $lineId,
                'role' => $user['role']
            ]
        ]);
        break;

    case 'change_password':
        $user = getCurrentUser($pdo);
        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อนดำเนินการ'], 401);
        }

        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
        }

        // ตรวจสอบรหัสผ่านปัจจุบัน
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
            jsonResponse(['success' => false, 'message' => 'รหัสผ่านปัจจุบันไม่ถูกต้อง'], 403);
        }

        if (strlen($newPassword) < 6) {
            jsonResponse(['success' => false, 'message' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'], 400);
        }

        // บันทึกรหัสผ่านใหม่
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$newHash, $user['id']]);

        jsonResponse(['success' => true, 'message' => 'เปลี่ยนรหัสผ่านสำเร็จ']);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Invalid action'], 400);
        break;
}
