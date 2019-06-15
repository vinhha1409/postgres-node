//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();
const db = require('./queries');
const port = 3000;
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

var urlencodedParser = bodyParser.urlencoded({
  extended: false
});
app.post('/signup', db.signUp);
app.post('/login', db.logIn);

app.get('/admin/users', db.verifyToken, db.getUser);
app.delete('/admin/users/:id', db.verifyToken,db.deleteUser);
app.put('/password', db.verifyToken,db.changePassword);

app.get('/mangas', db.getManga);
app.get('/mangas/subscribed',db.verifyToken,db.getFavoriteManga);
app.get('/mangas/:id', db.getMangaById);
app.delete('/mangas/:id', db.verifyToken,db.deleteManga);
app.post('/mangas', db.verifyToken,db.addManga);
app.put('/mangas/:id', db.verifyToken,db.updateManga);
app.put('/mangas/:mangaid/rating', db.verifyToken,db.addRating);
app.put('/mangas/:mangaid/subscription', db.verifyToken,db.addFavorite);

app.get('/mangas/:id/chapters',db.getChapters)
app.post('/mangas/:id/chapters',db.verifyToken, db.addChapter);
app.get('/mangas/:mangaid/chapters/:chapterid', db.getChapterById);
app.put('/mangas/:mangaid/chapters/:chapterid',db.verifyToken, db.updateChapter);
app.delete('/mangas/:mangaid/chapters/:chapterid',db.verifyToken, db.deleteChapter);
app.get('/mangas/:mangaid/chapters/:chapterid/comments', db.getComment);
app.post('/mangas/:mangaid/chapters/:chapterid/comments',db.verifyToken, db.addComment);

app.put('/password',db.verifyToken,db.changePassword);
app.get('/admin/users',db.verifyToken,db.getUser);
app.delete('/admin/users/:id', db.verifyToken,db.deleteUser);
app.get('/info',db.verifyToken,db.getInfo);
app.get('/genres', db.getGenre);
app.get('/', (request, response) => {
  response.json({
    info: 'Node.js, Express, and Postgres API'
  });
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
