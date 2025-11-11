const express = require('express');
const router = express.Router();

module.exports = (db) => {

router.post('/start-game', async (req, res) => {
  const { sessionCode } = req.body;
  const userId = req.session.user_id;

  try {
    // 1️⃣ Validate session
    const [sessions] = await db.promise().query(
      'SELECT * FROM tbl_game_session WHERE session_code = ?',
      [sessionCode]
    );

    if (sessions.length === 0) {
      return res.status(404).send('Session not found.');
    }

    const session = sessions[0];

    // 2️⃣ Record session_id in player session (so player stays tracked)
    req.session.session_id = session.session_id;

    // ✅ 2.5️⃣ Start total game timer (store start time in session)
    req.session.game_start_time = Date.now();

    // 3️⃣ Update started_at timestamp in DB (for record purposes)
    await db.promise().query(
      'UPDATE tbl_game_session SET started_at = NOW() WHERE session_id = ?',
      [session.session_id]
    );

    console.log(
      `🎮 Game started for session ${sessionCode} by user ${userId} at ${new Date().toLocaleString()}`
    );

    // 4️⃣ Redirect to Room 1 (first room)
    return res.redirect('/room/1');
  } catch (err) {
    console.error('❌ Error starting game:', err);
    res.status(500).send('Error starting the game.');
  }
});

// =====================================
// 🟣 MAIN ROOM PAGE — load from DB
// =====================================
router.get('/room/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;

  if (!sessionId || !userId) return res.redirect('/dashboard');

  try {
    // 1️⃣ Fetch room info
    const [roomRows] = await db.promise().query(
      'SELECT * FROM tbl_room WHERE room_id = ?',
      [roomId]
    );
    if (roomRows.length === 0) return res.status(404).send('Room not found.');

    const room = roomRows[0];

    // 2️⃣ Fetch items for this room
    const [itemRows] = await db.promise().query(
      'SELECT * FROM tbl_items WHERE room_id = ?',
      [roomId]
    );

    // 3️⃣ Fetch collected items
    const [collectedRows] = await db.promise().query(
      `SELECT item_id FROM tbl_player_items WHERE session_id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    const collectedIds = collectedRows.map(r => r.item_id);

    // 4️⃣ Progress
    const totalRequired = itemRows.filter(i => i.is_required === 1).length;
    const collectedRequired = itemRows.filter(
      i => i.is_required === 1 && collectedIds.includes(i.item_id)
    ).length;

    const progressPercent = totalRequired
      ? Math.round((collectedRequired / totalRequired) * 100)
      : 0;
    const nextRoomUnlocked = collectedRequired >= totalRequired;

    // 5️⃣ Check if final room (e.g. room_order = 4)
    const isFinalRoom = parseInt(room.room_order) === 4;

    // 6️⃣ Render
    res.render('room', {
      room: { ...room, room_image: `/images/${room.room_image || 'default_room.jpg'}` },
      items: itemRows,
      collectedIds,
      progressPercent,
      collectedRequired,
      totalRequired,
      nextRoomUnlocked,
      isFinalRoom,                           // ⚡️ NEW FLAG
      currentUser: req.session.user_name || 'Player',
      sessionCode: sessionId
    });
  } catch (err) {
    console.error('❌ Error loading room:', err);
    res.status(500).send('Server error while loading room.');
  }
});

  // =====================================
// 🟣 GET PLAYER POWER CARDS
// =====================================
router.get('/power-cards', async (req, res) => {
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;

  if (!userId || !sessionId) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }

  try {
    // ✅ ADD pi.is_activated to the SELECT
    const [rows] = await db.promise().query(
      `SELECT i.item_id, i.item_name, i.power_card_type, pi.is_activated
       FROM tbl_player_items pi
       JOIN tbl_items i ON pi.item_id = i.item_id
       WHERE pi.session_id = ? AND pi.user_id = ? AND i.is_power_card = 1`,
      [sessionId, userId]
    );

    if (rows.length === 0) {
      return res.json({ success: true, hasCards: false, powerCards: [] });
    }

    res.json({ success: true, hasCards: true, powerCards: rows });
  } catch (err) {
    console.error('❌ Error fetching power cards:', err);
    res.status(500).json({ success: false, message: 'Server error fetching power cards.' });
  }
});

// =====================================
// 🟡 ACTIVATE POWER CARD (Multiplayer Safe Version)
// =====================================
router.post('/activate-power-card', async (req, res) => {
  const { type } = req.body;
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;

  if (!userId || !sessionId) {
    return res.status(401).json({ success: false, message: 'Session not found.' });
  }

  try {
    // ✅ Check ownership and activation state
    const [cards] = await db.promise().query(
      `SELECT pi.player_item_id, i.item_id, i.power_card_type, pi.is_activated
       FROM tbl_player_items pi
       JOIN tbl_items i ON pi.item_id = i.item_id
       WHERE pi.session_id = ? AND pi.user_id = ? 
         AND i.is_power_card = 1 AND i.power_card_type = ?`,
      [sessionId, userId, type]
    );

    if (cards.length === 0) {
      return res.status(404).json({ success: false, message: '❌ You do not own this power card.' });
    }

    const card = cards[0];
    if (card.is_activated === 1) {
      return res.status(400).json({ success: false, message: `⚠️ Your ${type} card has already been used.` });
    }

    let message = '';

    // ⚙️ Ensure session_player has necessary columns:
    // double_active TINYINT(1), lucky_active TINYINT(1)
    // so we can store effects
    switch (type) {
      case 'Bonus':
        await db.promise().query(
          `UPDATE tbl_session_players SET score = score + 20 WHERE session_id = ? AND user_id = ?`,
          [sessionId, userId]
        );
        message = '🎁 Bonus Card activated! You earned +20 marks instantly!';
        break;

      case 'Double':
        await db.promise().query(
          `UPDATE tbl_session_players SET double_active = 1 WHERE session_id = ? AND user_id = ?`,
          [sessionId, userId]
        );
        message = '⚡ Double Up activated! Your next correct answer will give double marks!';
        break;

      case 'Lucky':
        await db.promise().query(
          `UPDATE tbl_session_players SET lucky_active = 1 WHERE session_id = ? AND user_id = ?`,
          [sessionId, userId]
        );
        message = '🍀 Lucky Card activated! You’ll get a second chance after your next wrong answer.';
        break;

      case 'Freeze':
        await db.promise().query(
          `UPDATE tbl_session_players 
           SET frozen_until = DATE_ADD(NOW(), INTERVAL 10 SECOND)
           WHERE session_id = ? AND user_id != ?`,
          [sessionId, userId]
        );
        message = '❄️ Freeze Card activated! Other players are frozen for 10 seconds!';
        break;

      default:
        message = 'Unknown card type.';
    }

    // ✅ Mark card as used
    await db.promise().query(
      `UPDATE tbl_player_items
       SET is_activated = 1
       WHERE session_id = ? AND user_id = ? AND item_id = ?`,
      [sessionId, userId, card.item_id]
    );

    console.log(`🧩 ${type} card activated by user ${userId} (session ${sessionId})`);
    res.json({ success: true, message });
  } catch (err) {
    console.error('❌ Error activating power card:', err);
    res.status(500).json({ success: false, message: 'Server error activating power card.' });
  }
});

// =====================================
// 🟣 CHECK POWER CARD STATUS
// =====================================
router.get('/power-card-status', async (req, res) => {
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;

  if (!userId || !sessionId) {
    return res.status(401).json({ success: false, message: 'Session not found.' });
  }

  try {
    const [cards] = await db.promise().query(
      `SELECT i.power_card_type, pi.is_activated
       FROM tbl_player_items pi
       JOIN tbl_items i ON pi.item_id = i.item_id
       WHERE pi.session_id = ? AND pi.user_id = ? AND i.is_power_card = 1`,
      [sessionId, userId]
    );

    return res.json({ success: true, powerCards: cards });
  } catch (err) {
    console.error('❌ Error fetching power card status:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching card status.' });
  }
});


// =====================================
// 🚪 LEAVE GAME (fixed for fetch)
// =====================================
router.post('/leave-game', async (req, res) => {
  const userId = req.session.user_id;
  const sessionId = req.session.session_id;

  if (!userId || !sessionId) {
    console.warn('⚠️ Leave failed — no session found.');
    return res.status(400).json({ success: false, message: 'No active game session found.' });
  }

  try {
    // ⏱️ Calculate time played
    let totalTime = 0;
    if (req.session.game_start_time) {
      totalTime = Math.floor((Date.now() - req.session.game_start_time) / 1000);
    }

    // ✅ Update database
    const [result] = await db.promise().query(
      `UPDATE tbl_session_players
       SET is_end = 1, time_taken = ?
       WHERE session_id = ? AND user_id = ?`,
      [totalTime, sessionId, userId]
    );

    if (result.affectedRows === 0) {
      console.warn(`⚠️ No player record found for user ${userId} in session ${sessionId}`);
    } else {
      console.log(`👋 Player ${userId} left session ${sessionId} after ${totalTime}s`);
    }

    // 🧹 Clear only after DB success
    delete req.session.session_id;
    delete req.session.current_room_id;
    delete req.session.game_start_time;
    delete req.session.doubleNext;
    delete req.session.luckyChance;

    // ✅ Respond with JSON (fetch compatible)
    return res.json({ success: true, message: 'You have left the game successfully.' });
  } catch (err) {
    console.error('❌ Error leaving session:', err);
    return res.status(500).json({ success: false, message: 'Error leaving the game.' });
  }
});

  // =====================================
  // 🟢 AJAX REFRESH — room progress
  // =====================================
  router.get('/room/:roomId/progress', async (req, res) => {
    const { roomId } = req.params;
    const userId = req.session.user_id;
    const sessionId = req.session.session_id;

    try {
        // 1️⃣ Get all items for this room
        const [itemRows] = await db.promise().query(
        `SELECT item_id, item_name, item_description, is_required
        FROM tbl_items
        WHERE room_id = ?`,
        [roomId]
        );

        // 2️⃣ Get player's collected items *only from this room*
        const [collectedRows] = await db.promise().query(
        `SELECT pi.item_id
        FROM tbl_player_items pi
        JOIN tbl_items ti ON pi.item_id = ti.item_id
        WHERE pi.session_id = ? AND pi.user_id = ? AND ti.room_id = ?`,
        [sessionId, userId, roomId]
        );

        // 3️⃣ Extract collected IDs
        const collectedIds = collectedRows.map(r => r.item_id);

        // 4️⃣ Compute progress (required vs total)
        const totalRequired = itemRows.filter(i => i.is_required === 1).length;
        const collectedRequired = itemRows.filter(
        i => i.is_required === 1 && collectedIds.includes(i.item_id)
        ).length;
        const progressPercent = totalRequired
        ? Math.round((collectedRequired / totalRequired) * 100)
        : 0;
        const nextRoomUnlocked = collectedRequired >= totalRequired;

        // 5️⃣ Return current room’s data only
        res.json({
        success: true,
        items: itemRows,
        collectedIds,
        collectedRequired,
        totalRequired,
        progressPercent,
        nextRoomUnlocked
        });
    } catch (err) {
        console.error('❌ Progress refresh error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching progress.' });
    }
  });

  return router;
};
