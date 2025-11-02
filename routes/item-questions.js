const express = require('express');
const router = express.Router();

module.exports = (db) => {

// =====================================
// 🟢 SCAN ITEM QR — render question if valid, JSON only for errors
// =====================================
router.get('/item/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;
  const currentRoomId = req.session.current_room_id || 1; // fallback to room 1

  try {
    if (!sessionId || !userId) {
      // JSON (since this will be handled in frontend)
      return res.status(400).json({ success: false, message: 'Please join a session before scanning items.' });
    }

    // Fetch item
    const [itemRows] = await db.promise().query('SELECT * FROM tbl_items WHERE item_id = ?', [itemId]);
    if (itemRows.length === 0) {
      return res.json({ success: false, message: '❌ Item not found.' });
    }

    const item = itemRows[0];

    // Check room match
    if (item.room_id !== currentRoomId) {
      return res.json({
        success: false,
        message: `⚠️ This item belongs to another room. Please scan items only in the current room.`,
      });
    }

    // Already collected?
    const [collected] = await db.promise().query(
      `SELECT * FROM tbl_player_items 
       WHERE session_id = ? AND user_id = ? AND item_id = ?`,
      [sessionId, userId, itemId]
    );

    if (collected.length > 0) {
      return res.json({
        success: false,
        message: `✅ You’ve already collected ${item.item_name}!`,
      });
    }

    // Pick random question
    const [questionRows] = await db.promise().query('SELECT * FROM tbl_questions ORDER BY RAND() LIMIT 1');
    if (questionRows.length === 0) {
      return res.json({ success: false, message: 'No questions available.' });
    }

    const question = questionRows[0];

    // ✅ Instead of returning JSON, render question directly if valid
    res.render('question', {
      item,
      question,
      currentUser: req.session.user_name || 'Player',
    });

  } catch (err) {
    console.error('❌ Error scanning item:', err);
    res.status(500).json({ success: false, message: 'Server error while loading item question.' });
  }
});


  // =====================================
  // 🟡 SUBMIT PLAYER ANSWER + SCORING + VALIDATION
  // =====================================
//   router.post('/submit-answer', async (req, res) => {
//     try {
//       const { questionId, selectedOption, timeTaken, itemId } = req.body;
//       const userId = req.session.user_id;
//       const sessionId = req.session.session_id;

//       if (!sessionId || !userId) {
//         return res.status(400).json({ success: false, message: 'Session not found.' });
//       }

//       // 1️⃣ Verify question exists
//       const [[question]] = await db.promise().query(
//         'SELECT correct_answer FROM tbl_questions WHERE question_id = ?',
//         [questionId]
//       );
//       if (!question) {
//         return res.status(404).json({ success: false, message: 'Question not found.' });
//       }

//       const isCorrect = selectedOption === question.correct_answer ? 1 : 0;

//       // 2️⃣ Base marks
//       let marks = 0;
//       if (isCorrect) marks = timeTaken <= 45 ? 15 : 10;

//       // 3️⃣ Record answer
//       await db.promise().query(
//         `INSERT INTO tbl_player_answers 
//          (session_id, user_id, question_id, selected_option, is_correct, time_answered)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [sessionId, userId, questionId, selectedOption, isCorrect, timeTaken]
//       );

//       // 4️⃣ Update total
//       if (marks > 0) {
//         await db.promise().query(
//           `UPDATE tbl_session_players
//            SET score = score + ?, time_taken = time_taken + ?
//            WHERE session_id = ? AND user_id = ?`,
//           [marks, timeTaken, sessionId, userId]
//         );
//       }

//       let bonusMarks = 0;
//       let roomUnlocked = false;

//       // 5️⃣ If correct and has item
//       if (isCorrect && itemId) {
//         const [[item]] = await db.promise().query('SELECT * FROM tbl_items WHERE item_id = ?', [itemId]);
//         if (!item) {
//           return res.json({ success: true, isCorrect, marks, message: '✅ Correct, but item not found.' });
//         }

//         const roomId = item.room_id;

//         // Avoid duplicate inserts
//         const [existing] = await db.promise().query(
//           `SELECT * FROM tbl_player_items WHERE session_id = ? AND user_id = ? AND item_id = ?`,
//           [sessionId, userId, itemId]
//         );

//         if (existing.length === 0) {
//           // Determine rank for bonus
//           const [rankCount] = await db.promise().query(
//             `SELECT COUNT(*) AS total FROM tbl_player_items WHERE session_id = ? AND item_id = ?`,
//             [sessionId, itemId]
//           );
//           const rank = rankCount[0].total + 1;

//           if (item.is_required) {
//             if (rank === 1) bonusMarks = 10;
//             else if (rank === 2) bonusMarks = 5;
//             else if (rank === 3) bonusMarks = 2;
//           }

//           // Insert collection
//           await db.promise().query(
//             `INSERT INTO tbl_player_items (session_id, user_id, item_id)
//              VALUES (?, ?, ?)`,
//             [sessionId, userId, itemId]
//           );

//           if (bonusMarks > 0) {
//             await db.promise().query(
//               `UPDATE tbl_session_players
//                SET score = score + ?
//                WHERE session_id = ? AND user_id = ?`,
//               [bonusMarks, sessionId, userId]
//             );
//           }
//         }

//         // 6️⃣ Check required items for this room
//         const [required] = await db.promise().query(
//           `SELECT item_id FROM tbl_items WHERE room_id = ? AND is_required = 1`,
//           [roomId]
//         );

//         if (required.length > 0) {
//           const [collected] = await db.promise().query(
//             `SELECT item_id FROM tbl_player_items 
//              WHERE session_id = ? AND user_id = ? AND item_id IN (?)`,
//             [sessionId, userId, required.map(r => r.item_id)]
//           );

//           if (collected.length === required.length) {
//             roomUnlocked = true;
//             req.session.current_room_id = roomId + 1; // unlock next room
//           }
//         }
//       }

//       return res.json({
//         success: true,
//         isCorrect,
//         marks,
//         bonusMarks,
//         roomUnlocked,
//         message: isCorrect
//           ? `✅ Correct! You earned ${marks} marks${bonusMarks ? ' + ' + bonusMarks + ' bonus!' : ''}`
//           : '❌ Wrong! No marks awarded.'
//       });

//     } catch (err) {
//       console.error('❌ Error in submit-answer:', err);
//       // Send JSON-safe message, not HTML
//       return res.status(500).json({ success: false, message: 'Internal server error. Check backend logs.' });
//     }
//   });

  return router;
};
