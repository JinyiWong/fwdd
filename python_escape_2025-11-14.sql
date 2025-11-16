# ************************************************************
# Sequel Ace SQL dump
# Version 20077
#
# https://sequel-ace.com/
# https://github.com/Sequel-Ace/Sequel-Ace
#
# Host: 127.0.0.1 (MySQL 8.0.33)
# Database: python_escape
# Generation Time: 2025-11-13 17:57:57 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE='NO_AUTO_VALUE_ON_ZERO', SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table tbl_game_session
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_game_session`;

CREATE TABLE `tbl_game_session` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `session_code` varchar(10) NOT NULL,
  `qr_code_url` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `status` enum('active','ended') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `session_code` (`session_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# Dump of table tbl_items
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_items`;

CREATE TABLE `tbl_items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `item_name` varchar(100) NOT NULL,
  `item_description` varchar(255) NOT NULL,
  `qr_code_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT '0',
  `is_power_card` tinyint(1) DEFAULT '0',
  `power_card_type` enum('Double','Bonus','Lucky','Freeze','Risk') DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `tbl_items_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `tbl_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `tbl_items` WRITE;
/*!40000 ALTER TABLE `tbl_items` DISABLE KEYS */;

INSERT INTO `tbl_items` (`item_id`, `room_id`, `item_name`, `item_description`, `qr_code_url`, `is_required`, `is_power_card`, `power_card_type`)
VALUES
	(1,1,'Golden Key','A shiny key that opens the treasure chest.','http://localhost:3000/item/1',1,0,NULL),
	(2,1,'Ancient Scroll','Contains a hidden message for the next puzzle.','http://localhost:3000/item/2',0,0,NULL),
	(3,1,'Crystal Orb','Glows when near the correct path.','http://localhost:3000/item/3',0,0,NULL),
	(4,1,'Silver Lock','A mysterious lock that guards the exit.','http://localhost:3000/item/4',0,0,NULL),
	(5,1,'Magic Feather','Said to grant a hint when held.','http://localhost:3000/item/5',0,0,NULL),
	(6,1,'Power Card: Freeze','Freezes other player for 10 seconds.','http://localhost:3000/item/6',0,1,'Freeze'),
	(7,2,'Bronze Coin','An ancient coin used to trade for clues.','http://localhost:3000/item/7',1,0,NULL),
	(8,2,'Potion Flask','Contains a strange glowing liquid.','http://localhost:3000/item/8',0,0,NULL),
	(9,2,'Spellbook Fragment','A page from an old magic spellbook.','http://localhost:3000/item/9',0,0,NULL),
	(10,2,'Puzzle Box','Solve it to unlock a secret compartment.','http://localhost:3000/item/10',0,0,NULL),
	(11,2,'Enchanted Lens','Reveals hidden symbols on walls.','http://localhost:3000/item/11',0,0,NULL),
	(12,2,'Power Card: Double','Doubles your score for the next correct answer.','http://localhost:3000/item/12',0,1,'Double'),
	(13,3,'Emerald Ring','A valuable ring engraved with runes.','http://localhost:3000/item/13',1,0,NULL),
	(14,3,'Torch','Lights up dark corners of the dungeon.','http://localhost:3000/item/14',0,0,NULL),
	(15,3,'Rusty Key','Still works on old locks.','http://localhost:3000/item/15',0,0,NULL),
	(16,3,'Magic Potion','Boosts focus for the next puzzle.','http://localhost:3000/item/16',0,0,NULL),
	(17,3,'Stone Tablet','Etched with ancient instructions.','http://localhost:3000/item/17',0,0,NULL),
	(18,3,'Power Card: Bonus','Adds 20 bonus points instantly.','http://localhost:3000/item/18',0,1,'Bonus'),
	(19,4,'Diamond Key','The final key to unlock the escape gate.','http://localhost:3000/item/19',1,0,NULL),
	(20,4,'Ancient Vase','Decorated with strange patterns.','http://localhost:3000/item/20',0,0,NULL),
	(21,4,'Secret Note','Reveals the code to open the final door.','http://localhost:3000/item/21',0,0,NULL),
	(22,4,'Magic Rope','Can pull levers from afar.','http://localhost:3000/item/22',0,0,NULL),
	(23,4,'Golden Hourglass','Tracks how long you have left.','http://localhost:3000/item/23',0,0,NULL),
	(24,4,'Power Card: Lucky','Gives a second chance after a wrong answer.','http://localhost:3000/item/24',0,1,'Lucky');

/*!40000 ALTER TABLE `tbl_items` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table tbl_player_answers
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_player_answers`;

CREATE TABLE `tbl_player_answers` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `question_id` int DEFAULT NULL,
  `selected_option` enum('A','B','C','D') DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `time_answered` int NOT NULL,
  PRIMARY KEY (`answer_id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `tbl_player_answers_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `tbl_game_session` (`session_id`),
  CONSTRAINT `tbl_player_answers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`),
  CONSTRAINT `tbl_player_answers_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `tbl_questions` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# Dump of table tbl_player_items
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_player_items`;

CREATE TABLE `tbl_player_items` (
  `player_item_id` int NOT NULL AUTO_INCREMENT,
  `session_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `collected_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_activated` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`player_item_id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `tbl_player_items_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `tbl_game_session` (`session_id`),
  CONSTRAINT `tbl_player_items_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`),
  CONSTRAINT `tbl_player_items_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `tbl_items` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# Dump of table tbl_questions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_questions`;

CREATE TABLE `tbl_questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `question_text` text NOT NULL,
  `option_a` varchar(255) NOT NULL,
  `option_b` varchar(255) NOT NULL,
  `option_c` varchar(255) NOT NULL,
  `option_d` varchar(255) NOT NULL,
  `correct_answer` enum('A','B','C','D') DEFAULT NULL,
  `explanation` text NOT NULL,
  PRIMARY KEY (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `tbl_questions` WRITE;
/*!40000 ALTER TABLE `tbl_questions` DISABLE KEYS */;

INSERT INTO `tbl_questions` (`question_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `explanation`)
VALUES
	(1,'Which keyword starts a conditional statement in Python?','if','for','switch','when','A','The if keyword is used to start a conditional statement.'),
	(2,'Which statement repeats a block while a condition is true?','loop','while','repeat','until','B','The while statement repeats until the condition becomes false.'),
	(3,'What will print if you run: if 3 < 5: print(\"Yes\")','Nothing','Error','Yes','False','C','3 < 5 is true, so the print statement executes.'),
	(4,'What does the else clause do in an if statement?','Executes when condition true','Executes when condition false','Skips loop','Repeats block','B','Else runs when no previous if condition is true.'),
	(5,'What keyword checks an additional condition after if?','elseif','elif','else','then','B','Elif is Python’s way to test multiple conditions.'),
	(6,'What symbol is used for indentation in Python?','Tab or spaces','Braces','Semicolon','Colon','A','Python uses indentation with spaces or tabs to define blocks.'),
	(7,'What happens if indentation is wrong?','Ignored','SyntaxError','RuntimeError','Nothing','B','Improper indentation raises a SyntaxError.'),
	(8,'Which of the following is NOT a comparison operator?','==','!=','>=','<=>','D','<=> is not valid in Python.'),
	(9,'What is printed by: if False: print(\"Hi\") else: print(\"Bye\")','Hi','Bye','False','Nothing','B','Since condition is False, else executes.'),
	(10,'What will \"while False: print(1)\" output?','1','0','Nothing','Error','C','Condition is never true, so loop never runs.'),
	(11,'Which keyword exits a loop immediately?','skip','continue','exit','break','D','break stops the loop immediately.'),
	(12,'Which keyword skips to the next iteration of a loop?','skip','continue','exit','break','B','continue jumps to the next iteration.'),
	(13,'What will range(3) produce?','0 1 2','1 2 3','0 1 2 3','3 2 1','A','range(3) gives numbers 0,1,2.'),
	(14,'What will \"for i in range(3): print(i)\" output?','0 1 2','1 2 3','0 1 2 3','Error','A','It prints 0,1,2 each on a new line.'),
	(15,'What is the output of: if 5 == 10: print(\"Equal\") else: print(\"Not Equal\")','Equal','Not Equal','Error','Nothing','B','5 is not equal to 10, so else runs.'),
	(16,'Which keyword is used for exceptions?','try','except','catch','handle','B','Python uses try and except to handle exceptions.'),
	(17,'In Python, what does \"pass\" do?','Skips execution','Ends loop','Placeholder','Deletes variable','C','pass is a null statement placeholder.'),
	(18,'What will \"if not True:\" evaluate to?','True','False','Error','None','B','not True gives False.'),
	(19,'Which logical operator means both conditions must be true?','or','and','not','either','B','and returns True if both sides are True.'),
	(20,'Which keyword starts a for loop?','repeat','for','loop','iterate','B','The for keyword starts a for loop.'),
	(21,'Which function generates a sequence of numbers?','seq()','series()','range()','loop()','C','range() produces numeric sequences.'),
	(22,'What happens if condition in while never becomes false?','Stops immediately','Infinite loop','SyntaxError','Skips loop','B','The loop repeats forever.'),
	(23,'What is the default step in range(5)?','1','0','5','-1','A','range(5) increments by 1.'),
	(24,'What does elif stand for?','Else If','Else Loop','Error List','End If','A','elif means \"else if\".'),
	(25,'Which of the following is a valid if statement?','if x == 5:','if (x == 5);','if x = 5','if x == 5 then','A','Python if statements end with a colon.'),
	(26,'What keyword runs code regardless of exceptions?','always','finally','lastly','finish','B','finally always executes.'),
	(27,'What will \"for i in range(0,10,2): print(i)\" print?','0 2 4 6 8','1 3 5 7 9','2 4 6 8 10','0 1 2 3 4','A','Step of 2 prints even numbers under 10.'),
	(28,'Which statement is true about else in loops?','Runs if loop breaks','Runs if loop completes','Runs every time','Never runs','B','Else in loop runs if no break occurs.'),
	(29,'What will \"if 0:\" do?','Execute block','Skip block','Error','Print 0','B','0 is False in Python.'),
	(30,'Which operator checks inequality?','=','==','!=','<>','C','!= means not equal to.'),
	(31,'Which keyword defines exception handling?','catch','except','error','raise','B','except defines how to handle an exception.'),
	(32,'What is printed by: for i in range(3): if i==1: break print(i)','0','0 1','1 2','0 1 2','A','break stops before printing 1.'),
	(33,'What is printed by: for i in range(3): if i==1: continue print(i)','0 1','0 2','1 2','0 1 2','B','continue skips i==1.'),
	(34,'What keyword can raise an exception?','raise','throw','error','except','A','raise manually triggers an exception.'),
	(35,'Which is the correct logical OR operator?','or','||','&&','else','A','Python uses \"or\".'),
	(36,'Which loop is best when the number of iterations is unknown?','for','while','loop','range','B','while loops are used when condition-based.'),
	(37,'What will print: if 10 % 2 == 0: print(\"Even\")','Odd','Even','Error','10','B','10 % 2 == 0 is True, prints Even.'),
	(38,'Which operator inverts boolean values?','not','invert','reverse','!','A','not flips True to False.'),
	(39,'How many spaces are recommended per indent in Python?','2','4','6','8','B','PEP8 recommends 4 spaces per indent.'),
	(40,'What keyword is used to stop current function?','exit','break','stop','return','D','return ends a function execution.'),
	(41,'What is the output of: for i in range(2): for j in range(2): print(i,j)','00 01 10 11','01 10','11 22','Error','A','It prints all i,j pairs in order.'),
	(42,'What will: while 1: break print(1) do?','Error','Nothing','Print 1','Infinite loop','C','break exits loop, then print runs once.'),
	(43,'What is a nested loop?','Loop inside loop','Loop before condition','Loop after if','Independent loop','A','Nested loops mean one inside another.'),
	(44,'What will: for i in [1,2,3]: print(i*2) output?','1 2 3','2 4 6','3 6 9','Error','B','Each value multiplied by 2.'),
	(45,'What happens if try block has no error?','except runs','finally skipped','except ignored','Error','C','except is ignored if no error occurs.'),
	(46,'Which operator checks both sides equal?','=','==','!=','=>','B','== compares equality.'),
	(47,'Which operator combines multiple conditions?','if','and/or','join','combine','B','and/or combine logical expressions.'),
	(48,'What is the output: x=5; if x>3 and x<10: print(\"Yes\")','No','Yes','Error','None','B','Both conditions true, so Yes prints.'),
	(49,'What does \"continue\" do in a while loop?','Stops loop','Skips to next iteration','Ends program','Repeats condition','B','continue skips rest of code and rechecks condition.'),
	(50,'What keyword starts an exception test?','try','error','catch','raise','A','try begins exception checking.'),
	(51,'What will \"for x in range(1,5): if x==3: continue print(x)\" print?','1 2 3 4','1 2 4','1 3 4','2 3 4','B','Skips 3 using continue.'),
	(52,'Which keyword is used to ignore a statement temporarily?','skip','pass','stop','wait','B','pass is used as a placeholder.'),
	(53,'What happens after break in nested loops?','Stops only inner loop','Stops all loops','Skips condition','Restarts outer loop','A','break stops current loop only.'),
	(54,'What does \"for i in range(5,1,-1)\" produce?','5 4 3 2','1 2 3 4','0 1 2 3 4','Error','A','range counts backward from 5 to 2.'),
	(55,'What will: for i in range(3): else: print(\"Done\") print?','Done','0 1 2','0 1 2 Done','Error','C','Else runs after loop completes.'),
	(56,'Which statement ends function execution?','break','stop','return','exit','C','return ends a function.'),
	(57,'What will: x=0; while x<3: x+=1 print(x) print?','0 1 2','1 2 3','0 1 2 3','Error','B','x increments to 3, prints 1–3.'),
	(58,'What does \"if x in [1,2,3]\" mean?','x equals list','x found in list','x less than list','Error','B','Checks if x is element in list.'),
	(59,'What happens if no except matches error?','Ignored','Stops program','Skips code','Continues','B','Unhandled exception stops program.'),
	(60,'Which keyword raises custom error?','throw','raise','error','except','B','raise is used for custom exceptions.'),
	(61,'Which keyword prevents code after it from executing?','return','pass','skip','stop','A','return exits the current function.');

/*!40000 ALTER TABLE `tbl_questions` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table tbl_room
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_room`;

CREATE TABLE `tbl_room` (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `room_order` int DEFAULT NULL,
  `room_name` varchar(255) DEFAULT NULL,
  `room_image` varchar(255) DEFAULT NULL,
  `room_description` text,
  PRIMARY KEY (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `tbl_room` WRITE;
/*!40000 ALTER TABLE `tbl_room` DISABLE KEYS */;

INSERT INTO `tbl_room` (`room_id`, `room_order`, `room_name`, `room_image`, `room_description`)
VALUES
	(1,1,'Enchanted Library','room_1.png','Step into the Enchanted Library — a realm of glowing scrolls and hidden tomes. Solve the mysteries inscribed within to uncover your path forward.'),
	(2,2,'Mystic Laboratory','room_2.webp','The Mystic Laboratory hums with energy. Strange potions and experimental devices line the walls. Only logic and courage will help you find your way out.'),
	(3,3,'Ancient Dungeon','room_3.webp','Ancient Dungeon — a dark and echoing place where every corner hides a secret. Collect your clues quickly before the time runs out.'),
	(4,4,'Final Gateway','room_4.jpg','The Final Gateway stands before you — the culmination of your journey. Solve the ultimate puzzles to escape the digital labyrinth once and for all.');

/*!40000 ALTER TABLE `tbl_room` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table tbl_session_players
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_session_players`;

CREATE TABLE `tbl_session_players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `join_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `score` int DEFAULT '0',
  `time_taken` int DEFAULT '0',
  `is_end` tinyint(1) NOT NULL DEFAULT '0',
  `frozen_until` datetime DEFAULT NULL,
  `double_active` tinyint(1) DEFAULT '0',
  `lucky_active` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tbl_session_players_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `tbl_game_session` (`session_id`),
  CONSTRAINT `tbl_session_players_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `tbl_users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



# Dump of table tbl_users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tbl_users`;

CREATE TABLE `tbl_users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `tbl_users` WRITE;
/*!40000 ALTER TABLE `tbl_users` DISABLE KEYS */;

INSERT INTO `tbl_users` (`user_id`, `username`, `email`, `password_hash`, `created_at`, `updated_at`)
VALUES
	(1,'jinyi','jinyiwong5@gmail.com','$2b$10$6VmqqIsCCJYt.0TwBnUomuzvHF/cqt6d5bU5hWFV9uBIBZHSCuhCq','2025-11-01 01:38:51','2025-11-01 01:38:51'),
	(2,'jyjyjy','jinyiwong@gmail.com','$2b$10$bMiufuYuN28WJxAPrZwZiO6UwDVFiLR.nIkN.smyhhF9X1Hj/J1lG','2025-11-02 00:53:12','2025-11-02 00:53:12'),
	(3,'jinyiiiii','jy@gmail.com','$2b$10$cH/MquvNcp../nfS3qsTBOvmGllKWTrNP0Pakf.UGXAjCX64y338e','2025-11-11 17:56:10','2025-11-11 17:56:10'),
	(4,'wjywjy','wjy@gmail.com','$2b$10$m.iYx12I5r/OOUO03ufl6.fkvGedcEzMwoUPXB2qxggnC2sHW703S','2025-11-11 18:06:12','2025-11-11 18:06:12'),
	(5,'wjinyi','wjinyi@gmail.com','$2b$10$sBUgtaEupPc9Ebw.O2temeJhyp8.lxyUGYHYRug1Z3KiDHFdq0tHq','2025-11-11 18:07:15','2025-11-11 18:07:15');

/*!40000 ALTER TABLE `tbl_users` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
