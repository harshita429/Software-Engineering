const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', {
    title: 'Study Planner',
    name: 'Harshita'
  });
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Study Dashboard'
  });
});

router.get('/planner', (req, res) => {
  res.render('planner', {
    title: 'Study Planner'
  });
});

router.get('/module', (req, res) => {
  res.render('module', {
    title: 'Module Page',
    selectedModule: req.query.module || ''
  });
});

module.exports = router;