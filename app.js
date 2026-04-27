const express = require('express');
const path = require('path');

const indexRouter = require('./routes/index');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});