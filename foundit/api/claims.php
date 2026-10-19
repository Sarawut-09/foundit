<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$currentUser = getCurrentUser($pdo);
$currentUserId = $currentUser ? (int)$currentUser['id'] : null;
$input = getJsonInput();

if ($action === 'clue') {
    if ($method === 'POST') {
        $itemId = $input['item_id'] ?? '';
        $message = trim($input['message'] ?? '');
        $contact = trim($input['contact_info'] ?? '');

        if (empty($itemId) || empty($message)) {
            jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อความเบาะแส'], 400);
        }

        if (empty($contact) && $currentUser) {
            $contact = ($currentUser['name'] ?? '') . (!empty($currentUser['phone']) ? ' โทร: ' . $currentUser['phone'] : '');
        }

        $stmt = $pdo->prepare('INSERT INTO clues (item_id, user_id, message, contact_info) VALUES (?, ?, ?, ?)');
        $stmt->execute([$itemId, $currentUserId, $message, $contact ?: null]);

        jsonResponse(['success' => true, 'message' => 'ส่งเบาะแสเรียบร้อยแล้ว']);
    }

    if ($method === 'GET') {
        $itemId = $_GET['item_id'] ?? '';
        $stmt = $pdo->prepare('SELECT c.*, u.fullname FROM clues c LEFT JOIN users u ON c.user_id = u.id WHERE c.item_id = ? ORDER BY c.created_at DESC');
        $stmt->execute([$itemId]);
        jsonResponse(['success' => true, 'clues' => $stmt->fetchAll()]);
    }
}

// Default: Claims (ยืนยันความเป็นเจ้าของ)
if ($method === 'POST') {
    $itemId = $input['item_id'] ?? '';
    $claimText = trim($input['claim_text'] ?? '');
    $contact = trim($input['contact_info'] ?? '');

    if (empty($itemId) || empty($claimText)) {
        jsonResponse(['success' => false, 'message' => 'กรุณากรอกรายละเอียดเพื่อยืนยันความเป็นเจ้าของ'], 400);
    }

    if (empty($contact) && $currentUser) {
        $contact = ($currentUser['name'] ?? '') . (!empty($currentUser['phone']) ? ' โทร: ' . $currentUser['phone'] : '');
    }

    $stmt = $pdo->prepare('INSERT INTO claims (item_id, user_id, claim_text, contact_info) VALUES (?, ?, ?, ?)');
    $stmt->execute([$itemId, $currentUserId, $claimText, $contact ?: null]);

    jsonResponse(['success' => true, 'message' => 'ส่งคำขอยืนยันความเป็นเจ้าของเรียบร้อยแล้ว']);
}

if ($method === 'GET') {
    $itemId = $_GET['item_id'] ?? '';
    if (!empty($itemId)) {
        $stmt = $pdo->prepare('SELECT c.*, u.fullname, u.email FROM claims c LEFT JOIN users u ON c.user_id = u.id WHERE c.item_id = ? ORDER BY c.created_at DESC');
        $stmt->execute([$itemId]);
        jsonResponse(['success' => true, 'claims' => $stmt->fetchAll()]);
    } else {
        // รายการ claim ทั้งหมดของผู้ใช้ปัจจุบัน
        if (!$currentUserId) {
            jsonResponse(['success' => true, 'claims' => []]);
        }
        $stmt = $pdo->prepare('SELECT c.*, i.title, i.category, i.status as item_status FROM claims c JOIN items i ON c.item_id = i.id WHERE c.user_id = ? ORDER BY c.created_at DESC');
        $stmt->execute([$currentUserId]);
        jsonResponse(['success' => true, 'claims' => $stmt->fetchAll()]);
    }
}
