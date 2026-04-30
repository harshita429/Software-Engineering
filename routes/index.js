const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Study Planner',
    name: 'Harshita'
  });
});

// Dashboard page
router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Study Dashboard'
  });
});

module.exports = router;