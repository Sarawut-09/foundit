<?php
require_once __DIR__ . '/db.php';

$currentUser = getCurrentUser($pdo);
$currentUserId = $currentUser ? (int)$currentUser['id'] : null;
$userEmail = $currentUser ? ($currentUser['email'] ?? '') : ($_GET['email'] ?? '');
$isAdmin = $currentUser && ($currentUser['role'] ?? '') === 'admin';

// ถ้าใน session ไม่มี user_id แต่ frontend ส่ง email มา ให้ค้นหา user จาก email
if (!$currentUserId && !empty($userEmail)) {
    $uStmt = $pdo->prepare('SELECT id, fullname, role FROM users WHERE email = ?');
    $uStmt->execute([$userEmail]);
    $uRow = $uStmt->fetch();
    if ($uRow) {
        $currentUserId = (int)$uRow['id'];
        if ($uRow['role'] === 'admin') $isAdmin = true;
        if (!$currentUser) {
            $currentUser = $uRow;
        }
    }
}

// ถ้าไม่ได้ล็อกอิน และไม่พบผู้ใช้
if (!$currentUserId && empty($userEmail) && !$isAdmin) {
    jsonResponse(['success' => true, 'notifications' => [], 'count' => 0]);
}

$isAdminInt = $isAdmin ? 1 : 0;
$uid = $currentUserId ?: 0;
$userName = $currentUser ? ($currentUser['fullname'] ?? $currentUser['name'] ?? '') : '';

try {
    // 1. ดึง Claims ที่ส่งมายังประกาศของผู้ใช้นี้
    $sqlClaims = "
        SELECT 
            c.id as claim_id,
            c.item_id,
            c.claim_text,
            c.contact_info,
            c.status,
            c.created_at,
            i.title as item_title,
            i.type as item_type,
            i.image as item_image,
            i.category as item_category,
            i.color as item_color,
            u.fullname as claimant_name,
            u.phone as claimant_phone,
            u.email as claimant_email,
            'claim' as notif_type
        FROM claims c
        JOIN items i ON c.item_id = i.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN users u_owner ON i.user_id = u_owner.id
        WHERE (
            ? = 1
            OR i.user_id = ?
            OR (? = 1 AND i.user_id IS NULL)
            OR (u_owner.email = ? AND ? != '')
            OR (i.contact_name = ? AND ? != '')
        )
        ORDER BY c.created_at DESC
    ";
    $stmt1 = $pdo->prepare($sqlClaims);
    $stmt1->execute([$isAdminInt, $uid, $uid, $userEmail, $userEmail, $userName, $userName]);
    $claims = $stmt1->fetchAll();

    // 2. ดึง Clues (เบาะแส) ที่ส่งมายังประกาศของผู้ใช้นี้
    $sqlClues = "
        SELECT 
            cl.id as clue_id,
            cl.item_id,
            cl.message as claim_text,
            cl.contact_info,
            'pending' as status,
            cl.created_at,
            i.title as item_title,
            i.type as item_type,
            i.image as item_image,
            i.category as item_category,
            i.color as item_color,
            u.fullname as claimant_name,
            u.phone as claimant_phone,
            u.email as claimant_email,
            'clue' as notif_type
        FROM clues cl
        JOIN items i ON cl.item_id = i.id
        LEFT JOIN users u ON cl.user_id = u.id
        LEFT JOIN users u_owner ON i.user_id = u_owner.id
        WHERE (
            ? = 1
            OR i.user_id = ?
            OR (? = 1 AND i.user_id IS NULL)
            OR (u_owner.email = ? AND ? != '')
            OR (i.contact_name = ? AND ? != '')
        )
        ORDER BY cl.created_at DESC
    ";
    $stmt2 = $pdo->prepare($sqlClues);
    $stmt2->execute([$isAdminInt, $uid, $uid, $userEmail, $userEmail, $userName, $userName]);
    $clues = $stmt2->fetchAll();

    $all = array_merge($claims, $clues);
    usort($all, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    jsonResponse([
        'success' => true,
        'notifications' => $all,
        'count' => count($all)
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
}
