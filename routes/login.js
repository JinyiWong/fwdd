const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (db) => {
  // 🟣 Show login page
  router.get('/login', (req, res) => {
    const error = req.session.error;
    req.session.error = null; // clear previous error
    return res.render('signin', { error });
  });

  // 🟣 Handle login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Step 1️⃣ — Validate inputs
    if (!email || !password) {
      return res.render('signin', { error: 'Please enter both Email and Password!' });
    }

    // Step 2️⃣ — Check if the user with this email exists
    db.query('SELECT * FROM tbl_users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('signin', { error: 'Database error. Please try again later.' });
      }

      if (!results || results.length === 0) {
        return res.render('signin', { error: 'User does not exist!' });
      }

      const user = results[0];

      // Step 3️⃣ — Compare entered password with hashed one
      bcrypt.compare(password, user.password_hash, (cmpErr, isMatch) => {
        if (cmpErr) {
          console.error('Bcrypt compare error:', cmpErr);
          return res.render('signin', { error: 'Server error. Please try again later.' });
        }

        if (!isMatch) {
          return res.render('signin', { error: 'Incorrect password!' });
        }

        // ✅ FIXED HERE: must match your database column name
        req.session.loggedin = true;
        req.session.email = user.email;
        req.session.user_id = user.user_id;   // ✅ correct field
        req.session.user_name = user.username;

        console.log('✅ Login success:', user.username, '| ID:', user.user_id);
        return res.redirect('/dashboard');
      });
    });
  });

  // 🟣 Handle logout
  router.get('/logout', (req, res, next) => {
    if (!req.session) {
      return res.redirect('/');
    }
    req.session.destroy((err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  });

  return router;
};
