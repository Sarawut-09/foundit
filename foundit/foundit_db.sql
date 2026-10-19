-- Database schema for FoundIt Lost & Found System
CREATE DATABASE IF NOT EXISTS `foundit_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `foundit_db`;

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(20) NULL,
  `fullname` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `line_id` VARCHAR(50) NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: items
CREATE TABLE IF NOT EXISTS `items` (
  `id` VARCHAR(20) PRIMARY KEY,
  `user_id` INT NULL,
  `type` ENUM('lost', 'found') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `color` VARCHAR(50) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `event_date` DATE NOT NULL,
  `status` ENUM('searching', 'found', 'returned') NOT NULL DEFAULT 'searching',
  `description` TEXT NOT NULL,
  `image` VARCHAR(255) NULL,
  `contact_name` VARCHAR(100) NULL,
  `contact_phone` VARCHAR(30) NULL,
  `contact_line` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (`type`),
  INDEX idx_category (`category`),
  INDEX idx_color (`color`),
  INDEX idx_location (`location`),
  INDEX idx_event_date (`event_date`),
  INDEX idx_status (`status`),
  CONSTRAINT fk_items_user FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: claims (ฉันคิดว่านี่คือสิ่งของของฉัน)
CREATE TABLE IF NOT EXISTS `claims` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` VARCHAR(20) NOT NULL,
  `user_id` INT NULL,
  `claim_text` TEXT NOT NULL,
  `contact_info` VARCHAR(150) NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_item FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT fk_claims_user FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: clues (แจ้งข้อมูลเพิ่มเติม / เบาะแส)
CREATE TABLE IF NOT EXISTS `clues` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` VARCHAR(20) NOT NULL,
  `user_id` INT NULL,
  `message` TEXT NOT NULL,
  `contact_info` VARCHAR(150) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clues_item FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  CONSTRAINT fk_clues_user FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default demo user (password: Password123!)
INSERT INTO `users` (`id`, `student_id`, `fullname`, `email`, `password_hash`, `phone`, `line_id`, `role`)
VALUES (1, '6612345678', 'สมหญิง ใจดี', 'somying.j@student.example.ac.th', '$2y$10$NArabFO9breJKp77C5mot.qMhHKNm0WF78vKltGhEtwgVSmpk0NMm', '0812345678', '@somying_j', 'user')
ON DUPLICATE KEY UPDATE `fullname` = VALUES(`fullname`);

-- Insert default admin user (password: Admin1234!)
INSERT INTO `users` (`id`, `student_id`, `fullname`, `email`, `password_hash`, `phone`, `line_id`, `role`)
VALUES (2, 'ADM-001', 'ผู้ดูแลระบบ (Admin)', 'admin@foundit.example', '$2y$10$O0rV8m2vYcQ5R2W.eH5XEuY3F6hP0QkFzC7JmNlZgT9rV4yN6bFie', '0899999999', '@founditadmin', 'admin')
ON DUPLICATE KEY UPDATE `fullname` = VALUES(`fullname`);

-- Insert seed items
INSERT INTO `items` (`id`, `user_id`, `type`, `title`, `category`, `color`, `location`, `event_date`, `status`, `description`, `image`, `contact_name`, `contact_phone`, `contact_line`, `created_at`) VALUES
('FI-001', 1, 'lost', 'กระเป๋าเป้สีแดง', 'กระเป๋า', 'แดง', 'อาคารเรียน A', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'searching', 'กระเป๋าเป้สีแดงขนาดกลาง มีโลโก้สีขาวด้านหน้า และพวงกุญแจตุ๊กตาหมีห้อยที่ซิป คาดว่าลืมไว้ที่ม้านั่งหน้าห้องเรียนหลังคาบเช้า', NULL, 'สมหญิง ใจดี', '0812345678', '@somying_j', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('FI-002', NULL, 'lost', 'กระเป๋าสะพายสีดำ', 'กระเป๋า', 'ดำ', 'โรงอาหาร', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'searching', 'กระเป๋าสะพายข้างหนังสีดำ ซิปสีทอง วางไว้ที่โต๊ะริมหน้าต่างโซนร้านเครื่องดื่มตอนพักเที่ยง', NULL, 'นายณัฐพล', '0891234567', 'natthapol_lost', DATE_SUB(NOW(), INTERVAL 3 DAY)),
('FI-003', NULL, 'found', 'หูฟังไร้สายสีขาว', 'อิเล็กทรอนิกส์', 'ขาว', 'ห้องสมุด', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'found', 'หูฟังไร้สายพร้อมเคสชาร์จสีขาว พบบนโต๊ะอ่านหนังสือชั้น 2 ฝากไว้ที่เคาน์เตอร์บริการของห้องสมุด', NULL, 'เจ้าหน้าที่ห้องสมุด', '028889999', '@library_staff', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('FI-004', 1, 'lost', 'บัตรนักศึกษาสีน้ำเงิน', 'บัตรและเอกสาร', 'น้ำเงิน', 'อาคารเรียน B', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'searching', 'บัตรนักศึกษาที่ใส่ซองพลาสติกใส พร้อมสายคล้องคอสีน้ำเงิน หายระหว่างเดินจากอาคารเรียน B ไปโรงอาหาร', NULL, 'สมหญิง ใจดี', '0812345678', '@somying_j', DATE_SUB(NOW(), INTERVAL 4 DAY)),
('FI-005', NULL, 'found', 'กุญแจพร้อมพวงกุญแจ', 'กุญแจ', 'อื่น ๆ', 'ลานจอดรถ', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'found', 'กุญแจ 3 ดอกคล้องกับพวงกุญแจโลหะรูปดาว พบตกอยู่ข้างเสาโซน C ของลานจอดรถ', NULL, 'รปภ. ประจำลานจอดรถ', '0834567890', 'security_c', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('FI-006', NULL, 'found', 'กระเป๋าผ้าสีแดง', 'กระเป๋า', 'แดง', 'โรงอาหาร', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'found', 'กระเป๋าผ้าแคนวาสสีแดง มีสมุดและกล่องดินสออยู่ภายใน พบวางไว้ที่โต๊ะใกล้ตู้กดน้ำ', NULL, 'ป้าแม่บ้านโรงอาหาร', '0845678901', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
('FI-007', 1, 'lost', 'สมาร์ทโฟนเคสสีดำ', 'อิเล็กทรอนิกส์', 'ดำ', 'ห้องสมุด', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'found', 'สมาร์ทโฟนเคสซิลิโคนสีดำ หน้าจอล็อกด้วยภาพพื้นหลังสีน้ำเงิน หายบริเวณโซนอ่านหนังสือเงียบ', NULL, 'สมหญิง ใจดี', '0812345678', '@somying_j', DATE_SUB(NOW(), INTERVAL 6 DAY)),
('FI-008', NULL, 'found', 'เครื่องคิดเลขวิทยาศาสตร์', 'เครื่องเขียน', 'ดำ', 'อาคารเรียน B', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'returned', 'เครื่องคิดเลขวิทยาศาสตร์สีดำ พบในห้องเรียนหลังสอบกลางภาค เจ้าของมารับคืนแล้ว', NULL, 'อาจารย์ประจำวิชา', '0856789012', '@prof_math', DATE_SUB(NOW(), INTERVAL 7 DAY)),
('FI-009', NULL, 'lost', 'เสื้อแจ็กเก็ตสีน้ำเงิน', 'เสื้อผ้าและเครื่องประดับ', 'น้ำเงิน', 'สนามกีฬา', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'searching', 'เสื้อแจ็กเก็ตกันลมสีน้ำเงินเข้ม ไซซ์ M ลืมไว้ที่ม้านั่งข้างสนามบาสเก็ตบอลหลังซ้อมกีฬา', NULL, 'กิตติศักดิ์', '0867890123', 'kittisak_bball', DATE_SUB(NOW(), INTERVAL 8 DAY)),
('FI-010', NULL, 'found', 'แว่นตากรอบดำ', 'เสื้อผ้าและเครื่องประดับ', 'ดำ', 'ศูนย์คอมพิวเตอร์', DATE_SUB(CURDATE(), INTERVAL 9 DAY), 'found', 'แว่นสายตากรอบพลาสติกสีดำ พร้อมกล่องผ้าเช็ดแว่นสีเทา พบวางไว้ข้างเครื่องคอมพิวเตอร์เครื่องที่ 14', NULL, 'เจ้าหน้าที่ศูนย์คอมฯ', '0878901234', 'comcenter_help', DATE_SUB(NOW(), INTERVAL 9 DAY)),
('FI-011', 1, 'lost', 'แฟลชไดรฟ์สีเขียว', 'อิเล็กทรอนิกส์', 'เขียว', 'ศูนย์คอมพิวเตอร์', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'returned', 'แฟลชไดรฟ์ขนาด 32 GB ตัวเคสสีเขียว มีสายคล้องสีดำ ได้รับคืนแล้วขอบคุณทุกท่านที่ช่วยกัน', NULL, 'สมหญิง ใจดี', '0812345678', '@somying_j', DATE_SUB(NOW(), INTERVAL 10 DAY)),
('FI-012', NULL, 'found', 'กระเป๋าสตางค์สีดำ', 'บัตรและเอกสาร', 'ดำ', 'โรงอาหาร', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'returned', 'กระเป๋าสตางค์หนังสีดำ พบใกล้ร้านข้าวแกง ส่งคืนเจ้าของผ่านเจ้าหน้าที่แล้ว', NULL, 'ร้านข้าวแกงป้าพร', '0889012345', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY)),
('FI-013', NULL, 'lost', 'ร่มสีน้ำเงิน', 'อื่น ๆ', 'น้ำเงิน', 'อาคารเรียน A', DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'searching', 'ร่มพับสีน้ำเงินเข้ม ด้ามจับสีเงิน ลืมไว้ที่ชั้นวางร่มหน้าห้อง A-203', NULL, 'วรรณา', '0890123456', 'wanna_umbrella', DATE_SUB(NOW(), INTERVAL 14 DAY)),
('FI-014', 1, 'found', 'สมุดจดสีเขียว', 'เครื่องเขียน', 'เขียว', 'ห้องสมุด', DATE_SUB(CURDATE(), INTERVAL 16 DAY), 'found', 'สมุดจดปกแข็งสีเขียวเข้ม มีโน้ตวิชาแคลคูลัสอยู่ภายใน พบที่ชั้นหนังสือด้านหลังโซนคอมพิวเตอร์', NULL, 'สมหญิง ใจดี', '0812345678', '@somying_j', DATE_SUB(NOW(), INTERVAL 16 DAY)),
('FI-015', NULL, 'lost', 'พาวเวอร์แบงก์สีขาว', 'อิเล็กทรอนิกส์', 'ขาว', 'อาคารกิจกรรมนักศึกษา', DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'returned', 'พาวเวอร์แบงก์ความจุ 10,000 mAh สีขาว มีสติกเกอร์รูปแมวติดด้านหลัง', NULL, 'ธนกร', '0811223344', 'thanakorn_power', DATE_SUB(NOW(), INTERVAL 20 DAY)),
('FI-016', NULL, 'lost', 'กุญแจรถมอเตอร์ไซค์', 'กุญแจ', 'ดำ', 'ลานจอดรถ', DATE_SUB(CURDATE(), INTERVAL 24 DAY), 'found', 'กุญแจรถมอเตอร์ไซค์หัวกุญแจยางสีดำ พร้อมพวงกุญแจโลหะรูปล้อ คาดว่าหล่นตรงทางเดินเข้าลานจอดรถ', NULL, 'ธีรภัทร', '0822334455', 'theerapat_bike', DATE_SUB(NOW(), INTERVAL 24 DAY)),
('FI-017', NULL, 'found', 'ขวดน้ำสแตนเลสสีขาว', 'อื่น ๆ', 'ขาว', 'สนามกีฬา', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'returned', 'กระติกน้ำสแตนเลสสีขาวขนาด 750 มล. พบที่ข้างสนามฟุตบอล เจ้าของมารับคืนแล้ว', NULL, 'โค้ชฟุตบอล', '0833445566', '@coach_foot', DATE_SUB(NOW(), INTERVAL 30 DAY)),
('FI-018', NULL, 'lost', 'กระเป๋าเป้สีดำ', 'กระเป๋า', 'ดำ', 'หอพักนักศึกษา', DATE_SUB(CURDATE(), INTERVAL 38 DAY), 'returned', 'กระเป๋าเป้สีดำ มีแถบสะท้อนแสงที่สายสะพาย หายบริเวณล็อบบี้หอพัก ได้รับคืนแล้ว', NULL, 'พงศกร', '0844556677', 'pongsakorn_dorm', DATE_SUB(NOW(), INTERVAL 38 DAY)),
('FI-019', NULL, 'found', 'นาฬิกาข้อมือสายหนังสีดำ', 'เสื้อผ้าและเครื่องประดับ', 'ดำ', 'โรงอาหาร', DATE_SUB(CURDATE(), INTERVAL 46 DAY), 'returned', 'นาฬิกาข้อมือหน้าปัดกลม สายหนังสีดำ พบที่อ่างล้างมือด้านหลังโรงอาหาร', NULL, 'เจ้าหน้าที่ฝ่ายอาคาร', '0855667788', NULL, DATE_SUB(NOW(), INTERVAL 46 DAY)),
('FI-020', NULL, 'lost', 'แฟ้มเอกสารโครงงานสีแดง', 'บัตรและเอกสาร', 'แดง', 'อาคารเรียน B', DATE_SUB(CURDATE(), INTERVAL 55 DAY), 'returned', 'แฟ้มพลาสติกสีแดงใส่เอกสารรายงานโครงงานกลุ่ม หายหลังการนำเสนอ ได้รับคืนแล้ว', NULL, 'ชญานิน', '0866778899', 'chayanin_project', DATE_SUB(NOW(), INTERVAL 55 DAY)),
('FI-021', NULL, 'lost', 'หูฟังครอบหูสีดำ', 'อิเล็กทรอนิกส์', 'ดำ', 'ห้องสมุด', DATE_SUB(CURDATE(), INTERVAL 70 DAY), 'returned', 'หูฟังครอบหูแบบมีสายสีดำ พร้อมกระเป๋าซิปสำหรับเก็บ', NULL, 'ภานุพงศ์', '0877889900', 'phanu_audio', DATE_SUB(NOW(), INTERVAL 70 DAY)),
('FI-022', NULL, 'found', 'กล่องดินสอสีเขียว', 'เครื่องเขียน', 'เขียว', 'อาคารเรียน A', DATE_SUB(CURDATE(), INTERVAL 85 DAY), 'returned', 'กล่องดินสอผ้าสีเขียว มีปากกาและยางลบหลายชิ้นอยู่ภายใน', NULL, 'อาจารย์ที่ปรึกษา', '0888990011', NULL, DATE_SUB(NOW(), INTERVAL 85 DAY)),
('FI-023', NULL, 'lost', 'เสื้อกันหนาวสีแดง', 'เสื้อผ้าและเครื่องประดับ', 'แดง', 'สนามกีฬา', DATE_SUB(CURDATE(), INTERVAL 100 DAY), 'returned', 'เสื้อกันหนาวมีฮู้ดสีแดง ไซซ์ L ลืมไว้บนอัฒจันทร์', NULL, 'พิมพ์ชนก', '0899001122', 'pimchanok_red', DATE_SUB(NOW(), INTERVAL 100 DAY)),
('FI-024', NULL, 'found', 'กระเป๋าใส่แล็ปท็อปสีดำ', 'กระเป๋า', 'ดำ', 'อาคารเรียน A', DATE_SUB(CURDATE(), INTERVAL 120 DAY), 'returned', 'กระเป๋าซองกันกระแทกสีดำขนาด 14 นิ้ว ไม่มีอุปกรณ์ภายใน พบในห้องเรียนรวม', NULL, 'เจ้าหน้าที่ห้องเรียน A', '0812349876', NULL, DATE_SUB(NOW(), INTERVAL 120 DAY)),
('FI-025', NULL, 'lost', 'กุญแจห้องพักพวงกุญแจสีเขียว', 'กุญแจ', 'เขียว', 'หอพักนักศึกษา', DATE_SUB(CURDATE(), INTERVAL 140 DAY), 'returned', 'กุญแจห้องพักพร้อมพวงกุญแจยางสีเขียว หายบริเวณลานซักผ้าของหอพัก', NULL, 'อรทัย', '0823456789', 'orathai_dorm', DATE_SUB(NOW(), INTERVAL 140 DAY)),
('FI-026', NULL, 'found', 'แท็บเล็ตเคสสีน้ำเงิน', 'อิเล็กทรอนิกส์', 'น้ำเงิน', 'ห้องสมุด', DATE_SUB(CURDATE(), INTERVAL 150 DAY), 'returned', 'แท็บเล็ตเคสฝาพับสีน้ำเงิน พบที่โต๊ะอ่านหนังสือชั้น 3 ส่งคืนผ่านเจ้าหน้าที่ห้องสมุดแล้ว', NULL, 'เจ้าหน้าที่ห้องสมุดชั้น 3', '028889998', '@library_fl3', DATE_SUB(NOW(), INTERVAL 150 DAY))
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
