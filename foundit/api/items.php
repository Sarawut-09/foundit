<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = getJsonInput();
$currentUser = getCurrentUser($pdo);
$currentUserId = $currentUser ? (int)$currentUser['id'] : null;
$isAdmin = $currentUser && ($currentUser['role'] ?? '') === 'admin';

// Helper เพื่อ format ให้โครงสร้างเหมือน mock-data เดิมของ frontend
function formatItem($row, $currentUserId, $isAdmin = false) {
    $isMine = ($currentUserId !== null && (int)$row['user_id'] === $currentUserId) || (empty($row['user_id']) && $currentUserId === 1);
    
    // ผู้ใช้ต้องล็อกอินก่อน ถึงจะเห็นข้อมูลติดต่อ (เบอร์โทร / LINE) เพื่อความปลอดภัยและป้องกันสแปม
    $canSeeContact = ($currentUserId !== null) || $isAdmin;

    $contactName      = $row['contact_name']  ?: ($row['creator_fullname'] ?? null);
    $contactPhone     = $canSeeContact ? ($row['contact_phone'] ?: ($row['creator_phone']   ?? null)) : null;
    $contactLine      = $canSeeContact ? ($row['contact_line']  ?: ($row['creator_line_id'] ?? null)) : null;
    $contactFacebook  = $canSeeContact ? ($row['contact_facebook']  ?? null) : null;
    $contactInstagram = $canSeeContact ? ($row['contact_instagram'] ?? null) : null;

    return [
        'id'           => $row['id'],
        'type'         => $row['type'],
        'title'        => $row['title'],
        'category'     => $row['category'],
        'color'        => $row['color'],
        'location'     => $row['location'],
        'date'         => $row['event_date'],
        'postedAt'     => substr($row['created_at'], 0, 10),
        'status'       => $row['status'],
        'description'  => $row['description'],
        'image'        => $row['image'] ?: null,
        'mine'         => $isMine,
        'user_id'      => $row['user_id'] ? (int)$row['user_id'] : null,
        'creator_name' => $row['creator_name'] ?? null,
        'contact_name'      => $contactName,
        'contact_phone'     => $contactPhone,
        'contact_line'      => $contactLine,
        'contact_facebook'  => $contactFacebook,
        'contact_instagram' => $contactInstagram,
        'can_view_contact' => $canSeeContact,
        'returned_at'      => $row['returned_at'] ?? null,
    ];
}

// ----------------- GET (ดึงข้อมูล) -----------------
if ($method === 'GET') {
    // ดึงเฉพาะประกาศเดี่ยว
    if (!empty($_GET['id'])) {
        $stmt = $pdo->prepare('
            SELECT i.*,
                   u.fullname   as creator_name,
                   u.fullname   as creator_fullname,
                   u.phone      as creator_phone,
                   u.line_id    as creator_line_id
            FROM items i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = ?
        ');
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'ไม่พบประกาศ'], 404);
        }
        jsonResponse(['success' => true, 'item' => formatItem($row, $currentUserId, $isAdmin)]);
    }

    // ดึงรายการทั้งหมดพร้อมตัวกรอง
    $where = [];
    $params = [];

    // ประกาศที่สถานะเป็น returned (คืนของแล้ว) เกิน 30 วัน จะถูกซ่อนอัตโนมัติจากหน้าเว็บ
    // ยกเว้นในหน้าแอดมินหรือเมื่อมีการร้องขอ include_expired=1
    $includeExpired = !empty($_GET['include_expired']) || (!empty($_GET['for_reports']) && $isAdmin);
    if (!$includeExpired) {
        $where[] = '(i.status != "returned" OR i.returned_at IS NULL OR i.returned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))';
    }

    // ตัวกรองประกาศของฉัน
    if (!empty($_GET['mine'])) {
        if ($currentUserId) {
            $where[] = '(i.user_id = ? OR (i.user_id IS NULL AND ? = 1))';
            $params[] = $currentUserId;
            $params[] = $currentUserId;
        } else {
            // ถ้ายังไม่ล็อกอิน ให้กรอง user_id = 1 เพื่อเป็นตัวอย่าง
            $where[] = 'i.user_id = 1';
        }
    }

    if (!empty($_GET['type']) && $_GET['type'] !== 'all') {
        $where[] = 'i.type = ?';
        $params[] = $_GET['type'];
    }

    if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
        $where[] = 'i.category = ?';
        $params[] = $_GET['category'];
    }

    if (!empty($_GET['color']) && $_GET['color'] !== 'all') {
        $where[] = 'i.color = ?';
        $params[] = $_GET['color'];
    }

    if (!empty($_GET['location']) && $_GET['location'] !== 'all') {
        $where[] = 'i.location = ?';
        $params[] = $_GET['location'];
    }

    if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
        $where[] = 'i.status = ?';
        $params[] = $_GET['status'];
    }

    if (!empty($_GET['from'])) {
        $where[] = 'i.event_date >= ?';
        $params[] = $_GET['from'];
    }

    if (!empty($_GET['to'])) {
        $where[] = 'i.event_date <= ?';
        $params[] = $_GET['to'];
    }

    if (!empty($_GET['q'])) {
        $q = trim($_GET['q']);
        $where[] = '(i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ? OR i.category LIKE ? OR i.id LIKE ?)';
        $searchTerm = '%' . $q . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }

    $sql = 'SELECT i.*, u.fullname as creator_name, u.fullname as creator_fullname, u.phone as creator_phone, u.line_id as creator_line_id FROM items i LEFT JOIN users u ON i.user_id = u.id';
    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sort = ($_GET['sort'] ?? 'new') === 'old' ? 'ASC' : 'DESC';
    $sql .= " ORDER BY i.event_date {$sort}, i.id {$sort}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $items = array_map(function($r) use ($currentUserId, $isAdmin) {
        return formatItem($r, $currentUserId, $isAdmin);
    }, $rows);

    jsonResponse(['success' => true, 'total' => count($items), 'items' => $items]);
}

// ----------------- POST (สร้าง / แก้ไข / ลบ) -----------------
$input = getJsonInput();

// ลบประกาศ (action=delete หรือ DELETE)
if ($action === 'delete' || $method === 'DELETE') {
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        jsonResponse(['success' => false, 'message' => 'ระบุรหัสประกาศที่ต้องการลบ'], 400);
    }

    // สิทธิ์: แอดมินลบได้ทุกประกาศ / ผู้ใช้ทั่วไปลบได้เฉพาะของตนเอง
    if (!$isAdmin) {
        $chk = $pdo->prepare('SELECT user_id FROM items WHERE id = ?');
        $chk->execute([$id]);
        $row = $chk->fetch();
        if ($row && $currentUserId && (int)$row['user_id'] !== $currentUserId && !($currentUserId === 1 && empty($row['user_id']))) {
            jsonResponse(['success' => false, 'message' => 'คุณไม่มีสิทธิ์ลบประกาศนี้'], 403);
        }
    }

    $stmt = $pdo->prepare('DELETE FROM items WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'ลบประกาศเรียบร้อยแล้ว']);
}

// แก้ไขประกาศ (action=update หรือ PUT)
if ($action === 'update' || $method === 'PUT') {
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        jsonResponse(['success' => false, 'message' => 'ระบุรหัสประกาศที่ต้องการแก้ไข'], 400);
    }

    $fields = ['title', 'category', 'color', 'location', 'description', 'status', 'contact_name', 'contact_phone', 'contact_line', 'contact_facebook', 'contact_instagram'];
    $sets = [];
    $params = [];

    foreach ($fields as $f) {
        if (isset($input[$f])) {
            $sets[] = "`{$f}` = ?";
            $params[] = $input[$f];
            if ($f === 'status') {
                if ($input[$f] === 'returned') {
                    $sets[] = "`returned_at` = NOW()";
                } else {
                    $sets[] = "`returned_at` = NULL";
                }
            }
        }
    }

    if (isset($input['date'])) {
        $sets[] = "`event_date` = ?";
        $params[] = $input['date'];
    }

    if (array_key_exists('image', $input)) {
        $sets[] = "`image` = ?";
        $params[] = $input['image'];
    }

    if (empty($sets)) {
        jsonResponse(['success' => false, 'message' => 'ไม่มีข้อมูลที่ต้องอัปเดต'], 400);
    }

    // สิทธิ์: แอดมินแก้ไขได้ทุกประกาศ / ผู้ใช้ทั่วไปแก้ไขได้เฉพาะของตนเอง
    if (!$isAdmin) {
        $chk = $pdo->prepare('SELECT user_id FROM items WHERE id = ?');
        $chk->execute([$id]);
        $row = $chk->fetch();
        if ($row && $currentUserId && (int)$row['user_id'] !== $currentUserId && !($currentUserId === 1 && empty($row['user_id']))) {
            jsonResponse(['success' => false, 'message' => 'คุณไม่มีสิทธิ์แก้ไขประกาศนี้'], 403);
        }
    }

    $params[] = $id;
    $sql = 'UPDATE items SET ' . implode(', ', $sets) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmt = $pdo->prepare('SELECT * FROM items WHERE id = ?');
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'บันทึกการแก้ไขเรียบร้อยแล้ว',
        'item' => formatItem($updated, $currentUserId, $isAdmin)
    ]);
}

// สร้างประกาศใหม่
if ($method === 'POST') {
    $title        = trim($input['title'] ?? '');
    $type         = $input['type'] ?? 'lost';
    $category     = $input['category'] ?? '';
    $color        = $input['color'] ?? '';
    $location     = $input['location'] ?? '';
    $date         = $input['date'] ?? date('Y-m-d');
    $desc         = trim($input['description'] ?? '');
    $image        = $input['image'] ?? null;
    $status       = $input['status'] ?? ($type === 'lost' ? 'searching' : 'found');
    $contactName      = trim($input['contact_name']      ?? '');
    $contactPhone     = trim($input['contact_phone']     ?? '');
    $contactLine      = trim($input['contact_line']      ?? '');
    $contactFacebook  = trim($input['contact_facebook']  ?? '');
    $contactInstagram = trim($input['contact_instagram'] ?? '');

    if (empty($title) || empty($category) || empty($color) || empty($location)) {
        jsonResponse(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
    }

    // ถ้าไม่กรอก contact_name ให้ดึงจากชื่อบัญชีที่ล็อกอิน
    if (empty($contactName) && $currentUser) {
        $contactName = $currentUser['name'];
    }
    // ถ้าไม่กรอก phone ให้ดึงจากโปรไฟล์
    if (empty($contactPhone) && $currentUser && !empty($currentUser['phone'])) {
        $contactPhone = $currentUser['phone'];
    }
    // ถ้าไม่กรอก line ให้ดึงจากโปรไฟล์
    if (empty($contactLine) && $currentUser && !empty($currentUser['line_id'])) {
        $contactLine = $currentUser['line_id'];
    }

    // หาลำดับถัดไปของ ID เช่น FI-027
    $stmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) as max_num FROM items WHERE id LIKE 'FI-%'");
    $maxRow = $stmt->fetch();
    $nextNum = ($maxRow['max_num'] ? (int)$maxRow['max_num'] : 0) + 1;
    $newId = 'FI-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

    // หากฝั่ง client มีการส่ง id เดิมมา (เช่น กรณี sync จาก local) และยังไม่ซ้ำ ให้ใช้ id เดิม
    if (!empty($input['id']) && preg_match('/^FI-\d+$/', $input['id'])) {
        $chkExist = $pdo->prepare('SELECT id FROM items WHERE id = ?');
        $chkExist->execute([$input['id']]);
        if (!$chkExist->fetch()) {
            $newId = $input['id'];
        }
    }

    $userId = null;
    if ($currentUserId) {
        $userId = $currentUserId;
    } else {
        try {
            $chkU = $pdo->query("SELECT id FROM users WHERE id = 1")->fetch();
            if ($chkU) $userId = 1;
        } catch (Exception $e) {}
    }

    $stmt = $pdo->prepare('
        INSERT INTO items (id, user_id, type, title, category, color, location, event_date, status, description, image, contact_name, contact_phone, contact_line, contact_facebook, contact_instagram)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$newId, $userId, $type, $title, $category, $color, $location, $date, $status, $desc, $image,
        $contactName ?: null, $contactPhone ?: null, $contactLine ?: null,
        $contactFacebook ?: null, $contactInstagram ?: null]);

    $stmt = $pdo->prepare('SELECT * FROM items WHERE id = ?');
    $stmt->execute([$newId]);
    $created = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'สร้างประกาศสำเร็จ',
        'item' => formatItem($created, $currentUserId, $isAdmin)
    ], 201);
}
