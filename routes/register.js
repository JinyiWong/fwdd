const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (db) => {
  router.get('/register', (req, res) => {
    // Initially empty fields and no errors
    return res.render('register', { errors: {}, username: '', email: '' });
  });

  router.post('/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    const errors = {};

    // Basic validation
    if (!username) errors.username = 'Username is required!';
    if (!email) errors.email = 'Email is required!';
    if (!password) errors.password = 'Password is required!';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password!';

    if (username && (username.length < 3 || username.length > 20)) {
      errors.username = 'Username must be between 3 and 20 characters!';
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Invalid email format!';
    }

    if (password && password.length < 6) {
      errors.password = 'Password must be at least 6 characters long!';
    }

    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match!';
    }

    // 🟠 If there are validation errors → re-render with input values
    if (Object.keys(errors).length > 0) {
      return res.render('register', { errors, username, email });
    }

    // Check if username already exists
    db.query('SELECT username FROM tbl_users WHERE username = ?', [username], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('register', {
          errors: { general: 'Database error. Please try again later.' },
          username,
          email,
        });
      }

      if (results.length > 0) {
        return res.render('register', {
          errors: { username: 'Username already taken!' },
          username,
          email,
        });
      }

      // Hash password & save
      const saltRounds = 10;
      const hashedPassword = bcrypt.hashSync(password, saltRounds);

      const query = 'INSERT INTO tbl_users (username, email, password_hash) VALUES (?, ?, ?)';
      db.query(query, [username, email, hashedPassword], (err2) => {
        if (err2) {
          console.error(err2);
          return res.render('register', {
            errors: { general: 'Registration failed. Please try again.' },
            username,
            email,
          });
        }
        res.redirect('/login');
      });
    });
  });

  return router;
};
