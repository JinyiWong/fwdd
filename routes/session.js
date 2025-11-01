const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

module.exports = (db) => {

  // =====================================
  // 🟣 CREATE SESSION (Host)
  // =====================================
  router.post('/create-session', async (req, res) => {
    try {
      const userId = req.session.user_id;
      const username = req.session.user_name || 'Guest';
      const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const joinUrl = `http://localhost:3000/join/${sessionCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);

      // Insert new session
      const insertSession = `INSERT INTO tbl_game_session (session_code, qr_code_url) VALUES (?, ?)`;
      db.query(insertSession, [sessionCode, qrCodeDataUrl], (err, sessionResult) => {
        if (err) {
          console.error('Database error (create-session):', err);
          return res.status(500).send('Error creating session.');
        }

        const sessionId = sessionResult.insertId;

        // Insert host as first player
        const insertHost = `INSERT INTO tbl_session_players (session_id, user_id) VALUES (?, ?)`;
        db.query(insertHost, [sessionId, userId], (err2) => {
          if (err2) {
            console.error('Error inserting host:', err2);
            return res.status(500).send('Error adding host to session.');
          }

          res.render('lobby', {
            sessionCode,
            qrCodeDataUrl,
            players: [{ name: username, role: 'Host' }],
            isHost: true,
            currentUser: username
          });
        });
      });
    } catch (err) {
      console.error('Server error (create-session):', err);
      res.status(500).send('Server error.');
    }
  });

  // =====================================
  // 🟣 MANUAL JOIN (POST form)
  // =====================================
  router.post('/join-session', (req, res) => {
    const { code } = req.body;
    joinSessionLogic(code, req, res);
  });

  // =====================================
  // 🟣 QR JOIN (via /join/:code)
  // =====================================
  router.get('/join/:code', (req, res) => {
    const { code } = req.params;
    joinSessionLogic(code, req, res);
  });

  // =====================================
  // 🔁 Shared Join Logic (used by both manual + QR join)
  // =====================================
  function joinSessionLogic(code, req, res) {
    const userId = req.session.user_id;
    const username = req.session.user_name || 'Guest';

    if (!userId) {
      console.log('⚠️ No session found — redirect to login');
      return res.redirect('/login');
    }

    // 1️⃣ Verify session exists
    db.query('SELECT * FROM tbl_game_session WHERE session_code = ?', [code], (err, sessionResults) => {
      if (err || sessionResults.length === 0) {
        console.error('❌ Invalid session code or DB error:', err);
        return res.render('dashboard', { error: 'Invalid or expired game code!' });
      }

      const session = sessionResults[0];
      const sessionId = session.session_id;

      // 2️⃣ Check player count limit
      db.query('SELECT COUNT(*) AS count FROM tbl_session_players WHERE session_id = ?', [sessionId], (err2, countRes) => {
        if (err2) {
          console.error('Count error:', err2);
          return res.status(500).send('Error joining session.');
        }

        const count = countRes[0].count;
        if (count >= 4) {
          console.log(`⚠️ Session ${code} is full (${count} players).`);
          return res.render('dashboard', { error: 'This session is already full (max 4 players).' });
        }

        // 3️⃣ Check if player already in session
        db.query('SELECT * FROM tbl_session_players WHERE session_id = ? AND user_id = ?', [sessionId, userId], (err3, existing) => {
          if (err3) {
            console.error('Error checking existing player:', err3);
            return res.status(500).send('Error joining session.');
          }

          if (existing.length === 0) {
            // Add player
            const insertPlayer = 'INSERT INTO tbl_session_players (session_id, user_id) VALUES (?, ?)';
            db.query(insertPlayer, [sessionId, userId], (err4) => {
              if (err4) {
                console.error('Error inserting player:', err4);
                return res.status(500).send('Error joining session.');
              }
              loadLobby();
            });
          } else {
            loadLobby();
          }

          // 4️⃣ Load lobby players
          function loadLobby() {
            db.query(
              `SELECT u.username 
               FROM tbl_session_players sp
               JOIN tbl_users u ON sp.user_id = u.user_id
               WHERE sp.session_id = ?
               ORDER BY sp.join_time ASC`,
              [sessionId],
              (err5, playerRows) => {
                if (err5) {
                  console.error('Error loading players:', err5);
                  return res.status(500).send('Error loading lobby.');
                }

                const players = playerRows.map((p, i) => ({
                  name: p.username,
                  role: i === 0 ? 'Host' : 'Player'
                }));

                const isHost = players[0]?.name === username;

                res.render('lobby', {
                  sessionCode: session.session_code,
                  qrCodeDataUrl: session.qr_code_url,
                  players,
                  isHost,
                  currentUser: username
                });
              }
            );
          }
        });
      });
    });
  }

  // =====================================
  // 🟣 AJAX endpoint — lobby refresh
  // =====================================
  router.get('/session-players/:code', (req, res) => {
    const { code } = req.params;

    db.query(
      `SELECT u.username
         FROM tbl_session_players sp
         JOIN tbl_users u ON sp.user_id = u.user_id
         JOIN tbl_game_session gs ON sp.session_id = gs.session_id
        WHERE gs.session_code = ?
        ORDER BY sp.join_time ASC`,
      [code],
      (err, results) => {
        if (err) {
          console.error('Error fetching players:', err);
          return res.status(500).json({ players: [] });
        }

        const players = results.map((r) => ({ name: r.username }));
        res.json({ players });
      }
    );
  });

  // =====================================
  // 🔴 LEAVE SESSION (Player)
  // =====================================
  router.post('/leave-session', (req, res) => {
    const { sessionCode } = req.body;
    const userId = req.session.user_id;

    if (!sessionCode || !userId) return res.status(400).send('Invalid request');

    const sql = `
      DELETE sp FROM tbl_session_players sp
      JOIN tbl_game_session gs ON sp.session_id = gs.session_id
      WHERE gs.session_code = ? AND sp.user_id = ?
    `;

    db.query(sql, [sessionCode, userId], (err) => {
      if (err) {
        console.error('❌ Error leaving session:', err);
        return res.status(500).send('Error leaving session.');
      }
      console.log(`👋 User ${userId} left session ${sessionCode}`);
      return res.redirect('/dashboard');
    });
  });

  // =====================================
  // 🔴 END SESSION (Host)
  // =====================================
  router.post('/end-session', (req, res) => {
    const { sessionCode } = req.body;
    if (!sessionCode) return res.status(400).send('Invalid request');

    const deletePlayers = `
      DELETE sp FROM tbl_session_players sp
      JOIN tbl_game_session gs ON sp.session_id = gs.session_id
      WHERE gs.session_code = ?
    `;

    db.query(deletePlayers, [sessionCode], (err1) => {
      if (err1) {
        console.error('❌ Error deleting players:', err1);
        return res.status(500).send('Error ending session.');
      }

      const deleteSession = `DELETE FROM tbl_game_session WHERE session_code = ?`;
      db.query(deleteSession, [sessionCode], (err2) => {
        if (err2) {
          console.error('❌ Error deleting session:', err2);
          return res.status(500).send('Error ending session.');
        }

        console.log(`🏁 Session ${sessionCode} ended by host.`);
        return res.redirect('/dashboard');
      });
    });
  });

  return router;
};
