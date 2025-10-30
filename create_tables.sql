CREATE DATABASE IF NOT EXISTS python_escape;
USE python_escape;

-- 1. Users Table
CREATE TABLE tbl_users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Game Session Table
CREATE TABLE tbl_game_session (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  session_code VARCHAR(10) NOT NULL UNIQUE,
  qr_code_url VARCHAR(255),
  status ENUM('active','ended') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL
);

-- 3. Session Players Table
CREATE TABLE tbl_session_players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  user_id INT,
  join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  score INT DEFAULT 0,
  time_taken INT DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES tbl_game_session(session_id),
  FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
);

-- 4. Room Table
CREATE TABLE tbl_room (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  user_id INT,
  room_order INT,
  room_image VARCHAR(255) NOT NULL,
  FOREIGN KEY (session_id) REFERENCES tbl_game_session(session_id),
  FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
);

-- 5. Items Table
CREATE TABLE tbl_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT,
  item_name VARCHAR(100) NOT NULL,
  item_description VARCHAR(255) NOT NULL,
  qr_code_url VARCHAR(255) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_power_card BOOLEAN DEFAULT FALSE,
  power_card_type ENUM('Double','Bonus','Lucky','Freeze','Risk'),
  item_image VARCHAR(255),
  FOREIGN KEY (room_id) REFERENCES tbl_room(room_id)
);

-- 6. Questions Table
CREATE TABLE tbl_questions (
  question_id INT AUTO_INCREMENT PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a VARCHAR(255) NOT NULL,
  option_b VARCHAR(255) NOT NULL,
  option_c VARCHAR(255) NOT NULL,
  option_d VARCHAR(255) NOT NULL,
  correct_answer ENUM('A','B','C','D'),
  explanation TEXT NOT NULL
);

-- 7. Player Answers Table
CREATE TABLE tbl_player_answers (
  answer_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  user_id INT,
  question_id INT,
  selected_option ENUM('A','B','C','D'),
  is_correct BOOLEAN DEFAULT FALSE,
  time_answered INT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES tbl_game_session(session_id),
  FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
  FOREIGN KEY (question_id) REFERENCES tbl_questions(question_id)
);

-- 8. Player Items Table
CREATE TABLE tbl_player_items (
  player_item_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT,
  user_id INT,
  item_id INT,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES tbl_game_session(session_id),
  FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
  FOREIGN KEY (item_id) REFERENCES tbl_items(item_id)
);
