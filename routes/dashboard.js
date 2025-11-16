const express = require('express');
const router = express.Router();

module.exports = (db) => {

  // Helper: Convert seconds → mm:ss
  const formatTime = (totalSecs) => {
    if (!totalSecs || totalSecs < 0) return '0:00';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // =====================================
  // 🟣 DASHBOARD LEADERBOARD + HISTORY
  // =====================================
  router.get('/dashboard', async (req, res) => {
    try {
      const userId = req.session.user_id;
      const username = req.session.user_name || 'Player';

      if (!userId) return res.redirect('/login');

      // ===== 🏆 Leaderboard Query =====
      const [leaderboardRows] = await db.promise().query(`
        SELECT 
            u.username,
            sp.user_id,
            sp.score AS best_score,
            sp.time_taken AS best_time
        FROM tbl_session_players sp
        JOIN tbl_users u ON sp.user_id = u.user_id
        WHERE sp.time_taken > 0
            AND sp.score = (
            SELECT MAX(sp2.score)
            FROM tbl_session_players sp2
            WHERE sp2.user_id = sp.user_id
            )
        ORDER BY sp.score DESC, sp.time_taken ASC
        LIMIT 5;
      `);

      const leaderboard = leaderboardRows.map((row, i) => ({
        rank: i + 1,
        name: row.user_id === userId ? `${row.username} (You)` : row.username,
        score: row.best_score,
        time: formatTime(row.best_time)
      }));


      // ===== 📜 History Query (Logged-in user's sessions) =====
      // We’ll also compute the player’s actual rank inside each session.
      const [historyRows] = await db.promise().query(`
        SELECT 
          gs.session_code,
          sp.score,
          sp.time_taken,
          (
            SELECT COUNT(*) + 1
            FROM tbl_session_players sp2
            WHERE sp2.session_id = sp.session_id
              AND (
                sp2.score > sp.score
                OR (sp2.score = sp.score AND sp2.time_taken < sp.time_taken)
              )
          ) AS rank_in_session
        FROM tbl_session_players sp
        JOIN tbl_game_session gs ON sp.session_id = gs.session_id
        WHERE sp.user_id = ?
          AND sp.time_taken > 0
          AND sp.score > 0
        ORDER BY sp.join_time DESC
        LIMIT 5;
      `, [userId]);

      const history = historyRows.map(row => ({
        code: row.session_code,
        score: row.score,
        rank: row.rank_in_session,
        time: formatTime(row.time_taken)
      }));

      // ===== 🎨 Render dashboard page =====
      res.render('dashboard', {
        currentUser: username,
        leaderboard,
        history
      });

    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      res.status(500).send('Error loading dashboard.');
    }
  });

  router.get('/leaderboard', async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.user_name || 'Player';
    if (!userId) return res.redirect('/login');

    const [leaderboardRows] = await db.promise().query(`
      SELECT 
        u.username,
        sp.user_id,
        sp.score AS best_score,
        sp.time_taken AS best_time
      FROM tbl_session_players sp
      JOIN tbl_users u ON sp.user_id = u.user_id
      WHERE sp.time_taken > 0
        AND sp.score = (
          SELECT MAX(sp2.score)
          FROM tbl_session_players sp2
          WHERE sp2.user_id = sp.user_id
        )
      ORDER BY sp.score DESC, sp.time_taken ASC
    `);

    const leaderboard = leaderboardRows.map((row, i) => ({
      rank: i + 1,
      name: row.username,
      score: row.best_score,
      time: formatTime(row.best_time),
      isCurrentUser: row.user_id === userId
    }));

    // ===== 🧍 Current user's overall rank =====
    const [[youRow]] = await db.promise().query(`
    WITH per_user_ranked AS (
        SELECT
        sp.user_id,
        u.username,
        sp.score,
        sp.time_taken,
        ROW_NUMBER() OVER (
            PARTITION BY sp.user_id
            ORDER BY sp.score DESC, sp.time_taken ASC
        ) AS rn
        FROM tbl_session_players sp
        JOIN tbl_users u ON sp.user_id = u.user_id
        WHERE sp.time_taken > 0
    ),
    best AS (
        SELECT
        user_id,
        username,
        score  AS top_score,
        time_taken AS best_time
        FROM per_user_ranked
        WHERE rn = 1
    )
    SELECT
        b.username,
        b.user_id,
        b.top_score   AS best_score,
        b.best_time,
        (
        SELECT COUNT(*) + 1
        FROM best b2
        WHERE b2.top_score > b.top_score
            OR (b2.top_score = b.top_score AND b2.best_time < b.best_time)
        ) AS rank_position
    FROM best b
    WHERE b.user_id = ?;
    `, [userId]);

    const youData = youRow
    ? {
        rank: youRow.rank_position,
        name: `${youRow.username} (You)`,
        score: youRow.best_score,
        time: formatTime(youRow.best_time)
        }
    : null;


    // 🎨 Render
    res.render('leaderboard', {
      currentUser: username,
      leaderboard,
      youData
    });

    } catch (err) {
        console.error('❌ Error loading leaderboard:', err);
        res.status(500).send('Error loading leaderboard.');
    }
    });

    router.get('/history', async (req, res) => {
      try {
        const userId = req.session.user_id;
        const username = req.session.user_name || 'Player';

        if (!userId) return res.redirect('/login');

        // Helper to format seconds → mm:ss
        const formatTime = (totalSecs) => {
          if (!totalSecs || totalSecs < 0) return '0:00';
          const mins = Math.floor(totalSecs / 60);
          const secs = totalSecs % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // ===== 🎮 User's Game History =====
        const [historyRows] = await db.promise().query(`
          SELECT 
            gs.session_code,
            sp.score,
            sp.time_taken,
            sp.join_time,
            (
              SELECT COUNT(*) + 1
              FROM tbl_session_players sp2
              WHERE sp2.session_id = sp.session_id
                AND (
                  sp2.score > sp.score
                  OR (sp2.score = sp.score AND sp2.time_taken < sp.time_taken)
                )
            ) AS rank_in_session
          FROM tbl_session_players sp
          JOIN tbl_game_session gs ON sp.session_id = gs.session_id
          WHERE sp.user_id = ?
            AND sp.time_taken > 0
            AND sp.score > 0
          ORDER BY sp.join_time DESC
        `, [userId]);

        const history = historyRows.map((row, i) => ({
          no: i + 1,
          code: row.session_code,
          score: row.score,
          rank: row.rank_in_session,
          time: formatTime(row.time_taken),
          date: new Date(row.join_time).toISOString().split('T')[0]
        }));

        res.render('history', {
          currentUser: username,
          history
        });
        } catch (err) {
          console.error('Error fetching history:', err);
          res.status(500).send('Internal Server Error');
        }
      });

    router.get('/history/:sessionCode', async (req, res) => {
      try {
        const { sessionCode } = req.params;
        const userId = req.session.user_id;

        if (!userId) return res.redirect('/login');

        // 1️⃣ Find session by code
        const [[session]] = await db.promise().query(
          'SELECT session_id FROM tbl_game_session WHERE session_code = ?',
          [sessionCode]
        );

        if (!session) {
          return res.render('history_details', {
            score: 0,
            timeTaken: '0:00',
            itemsCollected: 0,
            accuracy: 0,
            answers: [],
            sessionCode,
            message: '❌ Session not found or already deleted.'
          });
        }

        const sessionId = session.session_id;

        // 2️⃣ Fetch player stats for that session
        const [[player]] = await db.promise().query(
          `SELECT score, time_taken FROM tbl_session_players
          WHERE session_id = ? AND user_id = ?`,
          [sessionId, userId]
        );

        if (!player) {
          return res.render('history_details', {
            score: 0,
            timeTaken: '0:00',
            itemsCollected: 0,
            accuracy: 0,
            answers: [],
            sessionCode,
            message: 'No record found for this user in that session.'
          });
        }

        // 3️⃣ Count items collected
        const [[itemStats]] = await db.promise().query(
          `SELECT COUNT(*) AS collected 
          FROM tbl_player_items 
          WHERE session_id = ? AND user_id = ?`,
          [sessionId, userId]
        );

        // 4️⃣ Fetch all answered questions for that session
        const [answers] = await db.promise().query(
          `SELECT qa.*, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                  q.correct_answer, q.explanation
          FROM tbl_player_answers qa
          JOIN tbl_questions q ON qa.question_id = q.question_id
          WHERE qa.session_id = ? AND qa.user_id = ?`,
          [sessionId, userId]
        );

        // 5️⃣ Compute accuracy + format time
        const totalAnswered = answers.length;
        const totalCorrect = answers.filter(a => a.is_correct === 1).length;
        const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

        const mins = Math.floor(player.time_taken / 60);
        const secs = player.time_taken % 60;
        const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

        // 6️⃣ Render the recap page
        res.render('history_details', {
          score: player.score || 0,
          timeTaken: formattedTime,
          itemsCollected: itemStats.collected || 0,
          accuracy,
          answers,
          sessionCode
        });

      } catch (err) {
        console.error('❌ Error loading history details:', err);
        res.status(500).render('history_details', {
          score: 0,
          timeTaken: '0:00',
          itemsCollected: 0,
          accuracy: 0,
          answers: [],
          message: 'Server error loading history details.'
        });
      }
    });


  return router;
};
