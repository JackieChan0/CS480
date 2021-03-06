const express = require('express');
const app = express();
require('express-ws')(app);

const UserController = require('./users/UserController');
const GameController = require('./games/GameController');
const NotificationController = require('./notifications/NotificationController');

app.use(require('jsend').middleware);

app.use('/api/users', UserController);
app.use('/api/games', GameController);
app.use('/api/notifications', NotificationController.router);


app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// render some html pages for debugging
app.get('/notifications', (req, res) => {
  res.render('notifications');
});

app.get('/notifications/user/5acf0998cb70ea32d727b371', (req, res) => {
  res.render('notifications-user');
});

app.get('/test-regions', (req, res) => {
  res.render('test-regions');
});

module.exports = {
  app,
};