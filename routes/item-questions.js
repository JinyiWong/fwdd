const express = require('express');
const router = express.Router();

module.exports = (db) => {

router.get('/item/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;
  const currentRoomId = req.session.current_room_id || 1;

  console.log(`🔍 Player ${userId} in room ${currentRoomId} in session ${sessionId}`);
  try {
    if (!sessionId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Please join a session before scanning items.',
      });
    }

    // 1️⃣ Fetch item
    const [itemRows] = await db.promise().query(
      'SELECT * FROM tbl_items WHERE item_id = ?',
      [itemId]
    );
    if (itemRows.length === 0)
      return res.json({ success: false, message: '❌ Item not found.' });

    const item = itemRows[0];

    // 2️⃣ Verify room
    if (item.room_id !== currentRoomId) {
      return res.json({
        success: false,
        message:
          '⚠️ This item belongs to another room. Please scan items only in your current room.',
      });
    }

    // 3️⃣ ❌ Prevent scanning already collected items
    const [collected] = await db.promise().query(
      `SELECT * FROM tbl_player_items 
       WHERE session_id = ? AND user_id = ? AND item_id = ?`,
      [sessionId, userId, itemId]
    );
    if (collected.length > 0) {
      return res.json({
        success: false,
        message: '✅ You’ve already collected this item.',
      });
    }

    // 4️⃣ Find unanswered question for this player
    const [answered] = await db.promise().query(
      `SELECT question_id FROM tbl_player_answers 
       WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    const answeredIds = answered.map(r => r.question_id);

    // 5️⃣ Get random unanswered question
    let questionQuery = 'SELECT * FROM tbl_questions';
    if (answeredIds.length > 0) {
      questionQuery += ` WHERE question_id NOT IN (${answeredIds.join(',')})`;
    }
    questionQuery += ' ORDER BY RAND() LIMIT 1';

    const [questionRows] = await db.promise().query(questionQuery);
    if (questionRows.length === 0) {
      return res.json({
        success: false,
        message: '🎉 You’ve already answered all available questions!',
      });
    }

    const question = questionRows[0];

    // 6️⃣ Fetch room (for header)
    const [[room]] = await db.promise().query(
      'SELECT * FROM tbl_room WHERE room_id = ?',
      [item.room_id]
    );
    if (!room)
      return res.status(404).send('Room data missing for this item.');

    // 7️⃣ Render question view
    res.render('question', {
      item,
      question,
      room,
      totalRooms: 4,
      currentUser: req.session.user_name || 'Player',
      sessionCode: sessionId,
    });
  } catch (err) {
    console.error('❌ Error scanning item:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while loading item question.',
    });
  }
});

// =====================================
// 🟡 SUBMIT PLAYER ANSWER + SCORING + VALIDATION
// =====================================
router.post('/submit-answer', async (req, res) => {
  try {
    const { questionId, selectedOption, timeTaken, itemId } = req.body;
    const userId = req.session.user_id;
    const sessionId = req.session.session_id;

    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, message: 'Session not found.' });
    }

    // 1️⃣ Verify question exists
    const [[question]] = await db.promise().query(
      'SELECT correct_answer FROM tbl_questions WHERE question_id = ?',
      [questionId]
    );
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const isCorrect = selectedOption === question.correct_answer ? 1 : 0;

    // 2️⃣ Base marks
    let marks = 0;
    if (isCorrect) marks = timeTaken <= 45 ? 15 : 10;

    // 🧩 Check active power effects before scoring
    const [[playerStatus]] = await db.promise().query(
      'SELECT double_active, lucky_active FROM tbl_session_players WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    );

    // ⚡ DOUBLE effect: next correct answer = double marks
    if (isCorrect && playerStatus.double_active === 1) {
      marks *= 2;
      await db.promise().query(
        'UPDATE tbl_session_players SET double_active = 0 WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );
    }

    // 🍀 LUCKY effect: next wrong answer = second chance (no penalty)
    if (!isCorrect && playerStatus.lucky_active === 1) {
      await db.promise().query(
        'UPDATE tbl_session_players SET lucky_active = 0 WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );
      return res.json({
        success: true,
        isCorrect: false,
        marks: 0,
        bonusMarks: 0,
        message: '🍀 Lucky chance! Try again — no penalty this time!',
        retryAllowed: true,
      });
    }

    // 3️⃣ Record per-question answer
    await db.promise().query(
      `INSERT INTO tbl_player_answers 
       (session_id, user_id, question_id, selected_option, is_correct, time_answered)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, questionId, selectedOption, isCorrect, timeTaken]
    );

    // 4️⃣ Update score (not total time yet)
    if (marks > 0) {
      await db.promise().query(
        `UPDATE tbl_session_players
         SET score = score + ?
         WHERE session_id = ? AND user_id = ?`,
        [marks, sessionId, userId]
      );
    }

    let bonusMarks = 0;
    let roomUnlocked = false;
    let isFinalRoom = false;

    // 5️⃣ If correct and linked to item
    if (isCorrect && itemId) {
      const [[item]] = await db.promise().query(
        'SELECT * FROM tbl_items WHERE item_id = ?',
        [itemId]
      );
      if (!item) {
        return res.json({
          success: true,
          isCorrect,
          marks,
          message: '✅ Correct, but item not found.',
        });
      }

      const roomId = item.room_id;

      // Prevent duplicate collection
      const [existing] = await db.promise().query(
        `SELECT * FROM tbl_player_items 
         WHERE session_id = ? AND user_id = ? AND item_id = ?`,
        [sessionId, userId, itemId]
      );

      if (existing.length === 0) {
        // Determine rank for bonus
        const [rankCount] = await db.promise().query(
          `SELECT COUNT(*) AS total 
           FROM tbl_player_items 
           WHERE session_id = ? AND item_id = ?`,
          [sessionId, itemId]
        );
        const rank = rankCount[0].total + 1;

        if (item.is_required) {
          if (rank === 1) bonusMarks = 10;
          else if (rank === 2) bonusMarks = 5;
          else if (rank === 3) bonusMarks = 2;
        }

        // Insert collected item
        await db.promise().query(
          `INSERT INTO tbl_player_items (session_id, user_id, item_id)
           VALUES (?, ?, ?)`,
          [sessionId, userId, itemId]
        );

        if (bonusMarks > 0) {
          await db.promise().query(
            `UPDATE tbl_session_players
             SET score = score + ?
             WHERE session_id = ? AND user_id = ?`,
            [bonusMarks, sessionId, userId]
          );
        }
      }

      // 6️⃣ Check if all required items of this room collected
      const [required] = await db.promise().query(
        `SELECT item_id FROM tbl_items WHERE room_id = ? AND is_required = 1`,
        [roomId]
      );

      if (required.length > 0) {
        const [collected] = await db.promise().query(
          `SELECT item_id FROM tbl_player_items 
           WHERE session_id = ? AND user_id = ? 
           AND item_id IN (?)`,
          [sessionId, userId, required.map(r => r.item_id)]
        );

        if (collected.length === required.length) {
          // 🟢 All required collected → Room cleared
          roomUnlocked = true;
          req.session.current_room_id = roomId + 1;

          // ✅ If this was the final room (dynamic detection)
          const [[maxRoom]] = await db.promise().query(
            'SELECT MAX(room_id) AS maxRoom FROM tbl_room'
          );

          if (roomId === maxRoom.maxRoom) {
            isFinalRoom = true;

            // ⏱️ Calculate total play time (same logic as leave-session)
            let totalTime = 0;
            if (req.session.game_start_time) {
              totalTime = Math.floor(
                (Date.now() - req.session.game_start_time) / 1000
              );
            }

            // ✅ Mark session ended & record time
            await db.promise().query(
              `UPDATE tbl_session_players
               SET is_end = 1, time_taken = ?
               WHERE session_id = ? AND user_id = ?`,
              [totalTime, sessionId, userId]
            );

            console.log(
              `🏁 Player ${userId} escaped all rooms in ${totalTime}s!`
            );

            // 🧹 Reset session values for a clean restart
            delete req.session.current_room_id;
            delete req.session.game_start_time;
          }
        }
      }
    }

    // ✅ Response
    return res.json({
      success: true,
      isCorrect,
      marks,
      bonusMarks,
      roomUnlocked,
      isFinalRoom,
      message: isCorrect
        ? `✅ Correct! You earned ${marks} marks${bonusMarks ? ' + ' + bonusMarks + ' bonus!' : ''}`
        : '❌ Wrong! No marks awarded.',
    });
  } catch (err) {
    console.error('❌ Error in submit-answer:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error. Check backend logs.' });
  }
});

  return router;
};
