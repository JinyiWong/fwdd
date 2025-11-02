const express = require('express');
const router = express.Router();

module.exports = (db) => {

// =====================================
// 🟢 START GAME — record start time & go to Room 1
// =====================================
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

    // 3️⃣ Update started_at timestamp
    await db.promise().query(
      'UPDATE tbl_game_session SET started_at = NOW() WHERE session_id = ?',
      [session.session_id]
    );

    console.log(`🎮 Game started for session ${sessionCode} at ${new Date().toLocaleString()}`);

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

    try {
      // 1️⃣ Fetch room info
      const [roomRows] = await db.promise().query(
        'SELECT * FROM tbl_room WHERE room_id = ?',
        [roomId]
      );
      if (roomRows.length === 0) return res.status(404).send('Room not found.');

      const room = roomRows[0];

      // 2️⃣ Fetch items belonging to this room
      const [itemRows] = await db.promise().query(
        'SELECT * FROM tbl_items WHERE room_id = ?',
        [roomId]
      );

      // 3️⃣ Fetch items collected by this user
      const [collectedRows] = await db.promise().query(
        `SELECT item_id FROM tbl_player_items 
         WHERE session_id = ? AND user_id = ?`,
        [sessionId, userId]
      );
      const collectedIds = collectedRows.map(row => row.item_id);

      // 4️⃣ Calculate progress
      const totalRequired = itemRows.filter(i => i.is_required === 1).length;
      const collectedRequired = itemRows.filter(
        i => i.is_required === 1 && collectedIds.includes(i.item_id)
      ).length;
      const progressPercent = totalRequired
        ? Math.round((collectedRequired / totalRequired) * 100)
        : 0;

      // ✅ Auto-unlock next room when completed
      let nextRoomUnlocked = false;
      if (totalRequired > 0 && collectedRequired >= totalRequired) {
        nextRoomUnlocked = true;
      }

      // ✅ Local image from /public/images/
      const roomImagePath = `/images/${room.room_image || 'default_room.jpg'}`;

      // 5️⃣ Render room view
      res.render('room', {
        room: { ...room, room_image: roomImagePath },
        items: itemRows,
        collectedIds,
        progressPercent,
        collectedRequired,
        totalRequired,
        nextRoomUnlocked,
        currentUser: req.session.user_name || 'Player'
      });

    } catch (err) {
      console.error('❌ Error loading room:', err);
      res.status(500).send('Server error.');
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
      // 1️⃣ Items for the room
      const [itemRows] = await db.promise().query(
        'SELECT item_id, item_name, item_description, is_required FROM tbl_items WHERE room_id = ?',
        [roomId]
      );

      // 2️⃣ Player’s collected items
      const [collectedRows] = await db.promise().query(
        'SELECT item_id FROM tbl_player_items WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );
      const collectedIds = collectedRows.map(r => r.item_id);

      // 3️⃣ Compute progress
      const totalRequired = itemRows.filter(i => i.is_required === 1).length;
      const collectedRequired = itemRows.filter(
        i => i.is_required === 1 && collectedIds.includes(i.item_id)
      ).length;
      const progressPercent = totalRequired
        ? Math.round((collectedRequired / totalRequired) * 100)
        : 0;
      const nextRoomUnlocked = collectedRequired >= totalRequired;

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
      res.status(500).json({ success: false });
    }
  });


  return router;
};
