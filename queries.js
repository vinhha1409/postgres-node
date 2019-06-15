//jshint esversion:6
const jwt = require("jsonwebtoken");
const {
  Pool,
  Client
} = require("pg");
const secret = "secret";
const pool = new Pool({
  user: "hlsmdgqaswlniw",
  host: "ec2-50-19-114-27.compute-1.amazonaws.com",
  database: "dfes281hj43dmk",
  password: "f738dbfb04c124e4ebf77906679adb44e682b588273fe9eaa5c0bc551aa50774",
  port: "5432",
  ssl: true
});
// const secret = 'secret';
// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'WebTruyen',
//   password: 'postgres',
//   port: '5432'
// });
//GET admins
//Create tokenn
function createToken(userName) {
  let expirationDate = Math.floor(Date.now() / 1000) + 180 * 60; // 3hours from now
  var token = jwt.sign({
      exp: expirationDate,
      data: userName
    },
    secret
  );
  return token;
}
//Verify token
function verifyToken(req, res, next) {
  //GET auth header values
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    //split at the space
    const bearer = bearerHeader.split(" ");
    //get token ffrom array
    const bearerToken = bearer[1];
    //set the token
    req.token = bearerToken;
    //next middleware
    next();
  } else {
    res.sendStatus(401);
  }
}
//GET Mangas
const getManga = (request, response) => {
  var offset = request.query.page * 20 - 20;
  var name = request.query.name;
  var genre = request.query.genre;
  if (name == undefined && genre == undefined) {
    pool.query({
        text: `SELECT * FROM "Manga" ORDER BY manga_name LIMIT 20 OFFSET $1 `,
        values: [offset]
      },
      (error, results) => {
        if (error) {
          response.sendStatus(500);
          console.log(error);
          return;
        }
        if (results) {
          response.status(200).json(results.rows);
        }
      }
    );
  } else if (name != undefined && genre == undefined) {
    var name1 = name.toUpperCase();
    pool.query({
        text: `SELECT * FROM "Manga" WHERE Upper(manga_name) LIKE $1 ORDER BY manga_name  LIMIT 20 OFFSET $2`,
        values: ["%" + name1 + "%", offset]
      },
      (error, results) => {
        if (error || results.rowCount == 0) {
          response.sendStatus(500);
          console.log(error);
          return;
        }
        response.status(200).json(results.rows);
      }
    );
  } else if (name == undefined && genre != undefined) {
    var genre1 = genre.toUpperCase();
    console.log(genre1);
    pool.query({
        text: `SELECT *
            FROM "Manga"
            WHERE manga_id IN (SELECT manga_id
                                FROM "Genre"
                                WHERE Upper(gen_name) LIKE $1)
            ORDER BY manga_name
            LIMIT 20 OFFSET $2 `,
        values: ["%" + genre1 + "%", offset]
      },
      (error, results) => {
        if (error || results.rowCount == 0) {
          response.sendStatus(500);
          console.log(error);
          return;
        }
        response.status(200).json(results.rows);
      }
    );
  } else if (name != undefined && genre != undefined) {
    var name1 = name.toUpperCase();
    var genre1 = genre.toUpperCase();
    pool.query({
        text: `SELECT *
            FROM "Manga"
            WHERE manga_id IN (SELECT manga_id
                                FROM "Genre"
                                WHERE Upper(gen_name) LIKE $1) AND Upper(manga_name) LIKE $2
            ORDER BY manga_name
            LIMIT 20 OFFSET $3 `,
        values: ["%" + genre1 + "%", "%" + name1 + "%", offset]
      },
      (error, results) => {
        if (error || results.rowCount == 0) {
          response.sendStatus(500);
          console.log(error);
          return;
        }
        response.status(200).json(results.rows);
      }
    );
  }
};
//POST new manga cai nay toi co sua body nhe
const addManga = (request, response) => {
  const {
    manga_id,
    manga_name,
    description,
    num_of_chap,
    author,
    genre,
    cover
  } = request.body;
  //verify token
  if (!manga_name) {
    response.sendStatus(400);
    return;
  } else {
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.status(401);
        return;
      } else {
        var data = authData.data;
        var check = data.indexOf("admin");
        if (check != -1) {
          pool.query({
              text: 'SELECT * FROM "Manga" WHERE manga_name = $1 ',
              values: [manga_name]
            },
            (error, result) => {
              if (result.rowCount != 0) {
                response.status(500).send("Manga existed");
                return;
              } else {
                pool.query({
                    text: `INSERT INTO "Manga"(manga_name, description,num_of_chap, author, cover) VALUES($1,$2,$3,$4,$5)`,
                    values: [manga_name, description, num_of_chap, author, cover]
                  },
                  (error, result) => {
                    if (error) {
                      response.sendStatus(500);
                      console.log(error);
                      return;
                    } else {
                      response.sendStatus(201);
                    }
                  }
                );
              }
            }
          );
        } else {
          response.sendStatus(403);
        }
      }
    });
  }
};
//GET subcribed manga
const getFavoriteManga = (request, response) => {
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
    } else {
      var data = authData.data;
      var str = data.split(" ");
      var username = str[0];
      pool.query({
          text: `SELECT * FROM "Manga" WHERE manga_id IN (SELECT manga_id FROM "Favorite" WHERE user_name = $1)`,
          values: [username]
        },
        (error, result) => {
          if (error) {
            response.sendStatus(500);
            console.log(error);
            return;
          } else {
            response.status(200).json(result.rows);
          }
        }
      );
    }
  });
};
//GET manga by id
const getMangaById = (request, response) => {
  const id = parseInt(request.params.id);
  pool.query({
      text: 'SELECT manga_id,manga_name,num_of_chap,author,cover,description,rating ' +
        'FROM ("Manga" AS m1 LEFT JOIN (SELECT manga_id AS m_id,CAST(AVG(point) AS numeric(18,1)) AS rating FROM "Rating" GROUP BY m_id) AS m2 on m1.manga_id = m2.m_id)' +
        'WHERE manga_id = $1',
      values: [id]
    },
    (error, results) => {
      if (error || results.rowCount == 0) {
        console.log(error);
        response.sendStatus(404);
      } else {
        response.status(200).json(results.rows);
      }
    }
  );
};
//update manga
const updateManga = (request, response) => {
  const id = parseInt(request.params.id);
  const {
    manga_name,
    description,
    num_of_chap,
    author,
    genre,
    cover
  } = request.body;
  var condition = "manga_id = " + id;
  var setData = "";
  if (manga_name) {
    var check = manga_name.indexOf("'");
    if (check != -1) {
      var manga_name1 = manga_name.replace("'", "''");
      setData = setData + "manga_name=" + "'" + manga_name1 + "'";
    } else {
      setData = setData + "manga_name=" + "'" + manga_name + "'";
    }
  }
  if (description) {
    setData = setData + ",description = " + "'" + description + "'";
  }
  if (num_of_chap != 0) {
    setData = setData + ",num_of_chap = " + num_of_chap;
  }
  if (author) {
    setData = setData + ", author = " + "'" + author + "'";
  }
  if (cover) {
    setData = setData + ",cover = " + "'" + cover + "'";
  }
  if (!manga_name) {
    response.sendStatus(400);
    return;
  } else {
    //verify token
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
        console.log(error);
        return;
      } else {
        var data = authData.data;
        var check = data.indexOf("admin");
        if (check != -1) {
          pool.query({
              text: 'UPDATE "Manga" SET ' + setData + " WHERE " + condition
            },
            (error, result) => {
              if (error) {
                response.sendStatus(500);
                console.log(error);
                return;
              } else {
                if (genre) {
                  pool.query({
                      text: 'SELECT * FROM "Genre" WHERE manga_id = $1',
                      values: [id]
                    },
                    (error, result) => {
                      if (error) {
                        response.sendStatus(500);
                        console.log(error);
                        return;
                      } else {
                        if (result == undefined || result.rowCount == 0) {
                          var genreArray = genre.split(",");
                          response.sendStatus(200);
                          for (var i = 0; i < genreArray.length; i++) {
                            var genreArrayi = genreArray[i].toLowerCase();
                            pool.query({
                              text: 'INSERT INTO "Genre"(manga_id,gen_name) VALUES($1,$2)',
                              values: [id, genreArrayi]
                            });
                          }
                        } else {
                          pool.query({
                            text: 'DELETE FROM "Genre" WHERE manga_id = $1',
                            values: [id]
                          }, (error, result) => {
                            if (error) {
                              response.sendStatus(500);
                              console.log(error);
                              return;
                            } else {
                              var genreArray = genre.split(",");
                              response.sendStatus(200);
                              for (var i = 0; i < genreArray.length; i++) {
                                var genreArrayi = genreArray[i].toLowerCase();
                                pool.query({
                                  text: 'INSERT INTO "Genre"(manga_id,gen_name) VALUES($1,$2)',
                                  values: [id, genreArrayi]
                                });
                              }
                            }
                          });
                        }
                      }
                    }
                  );
                } else {
                  response.sendStatus(200);
                }
              }
            }
          );
        } else {
          response.sendStatus(403);
        }
      }
    });
  }
};
//DELETE manga
const deleteManga = (request, response) => {
  const id = parseInt(request.params.id);
  //verify token
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
      console.log(error);
      return;
    } else {
      var data = authData.data;
      var check = data.indexOf("admin");
      if (check != -1) {
        pool.query({
            text: 'DELETE FROM "Manga" WHERE manga_id = $1',
            values: [id]
          },
          (error, result) => {
            if (error) {
              response.sendStatus(500);
              console.log(error);
              return;
            } else {
              response.status(200).send(`Manga deleted with ID: ${id}`);
            }
          }
        );
      } else {
        response.sendStatus(403);
      }
    }
  });
};
//GET all chapters of manga
const getChapters = (request, response) => {
  const mangaId = request.params.id;
  pool.query({
      text: `SELECT chap_id,chap_name,chap_content,time_up FROM "Chapter" WHERE manga_id = $1 ORDER BY chap_id`,
      values: [mangaId]
    },
    (error, results) => {
      if (error) {
        response.status(404);
        console.log(error);
        return;
      }
      response.status(200).json(results.rows);
    }
  );
};
//POST add new Chapter
const addChapter = (request, response) => {
  const manga_id = parseInt(request.params.id);
  const {
    chap_id,
    chap_name,
    chap_content
  } = request.body;
  if (!chap_name | !chap_id) {
    response.sendStatus(400);
    return;
  } else {
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
        return;
      } else {
        var data = authData.data;
        var check = data.indexOf("admin");
        if (check != -1) {
          pool.query({
              text: 'SELECT * FROM "Chapter" WHERE manga_id = $1 AND chap_id = $2',
              values: [manga_id, chap_id]
            }, (error, result) => {
              if (error) {
                response.sendStatus(500);
                console.log(error);
                return;
              } else {
                if (result.rowCount != 0) {
                  response.sendStatus(500);
                  console.log(error);
                  return;
                } else {
                  pool.query({
                      text: `INSERT INTO "Chapter"(manga_id,chap_id,chap_name,chap_content,time_up) VALUES($1,$2,$3,$4,current_date)`,
                      values: [manga_id, chap_id, chap_name, chap_content]
                    },
                    (error, result) => {
                      if (error) {
                        response.sendStatus(500);
                        console.log(error);
                        return;
                      } else {
                        pool.query({
                          text: 'UPDATE "Manga" SET num_of_chap = num_of_chap + 1 WHERE manga_id = $1',
                          values: [manga_id]
                        }, (error, result) => {
                          if (error) {
                            response.sendStatus(500);
                            console.log(error);
                            return;
                          } else {
                            response.status(201).send(`Added chapter to manga with id: ${manga_id}`);
                          }
                        });
                      }
                    });
                }
              }
            }
          );
        } else {
          response.sendStatus(403);
          return;
        }
      }
    });
  }
};
//GET chapter by id
const getChapterById = (request, response) => {
  const mangaId = parseInt(request.params.mangaid);
  const chapId = parseInt(request.params.chapterid);
  pool.query({
      text: `SELECT * FROM "Chapter" WHERE manga_id = $1 AND chap_id = $2`,
      values: [mangaId, chapId]
    },
    (error, results) => {
      if (error || results.rowCount == 0) {
        response.sendStatus(404);
        return;
      }
      if (results) {
        response.status(200).json(results.rows);
      }
    }
  );
};
//PUT update chapter information
const updateChapter = (request, response) => {
  const manga = parseInt(request.params.mangaid);
  const chap = parseInt(request.params.chapterid);
  const {
    chap_name,
    chap_content
  } = request.body;
  var setData = "";
  if (chap_name) {
    var check = chap_name.indexOf("'");
    if (check != -1) {
      var chap_name1 = chap_name.replace("'", "''");
      setData = setData + "chap_name=" + "'" + chap_name1 + "'";
    } else {
      setData = setData + "chap_name=" + "'" + chap_name + "'";
    }
  }
  if (chap_content) {
    setData = setData + ",chap_content=" + "'" + chap_content + "'";
  }
  //verify token
  if (!chap_name) {
    response.sendStatus(400);
    return;
  } else {
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
        console.log(err);
        return;
      } else {
        var data = authData.data;
        var check = data.indexOf("admin");
        if (check != -1) {
          pool.query({
              text: 'UPDATE "Chapter" SET ' +
                setData +
                " WHERE manga_id = $1 AND chap_id = $2",
              values: [manga, chap]
            },
            (error, result) => {
              if (error) {
                response.sendStatus(500);
                console.log(error);
                return;
              } else {
                response.sendStatus(200);
              }
            }
          );
        } else {
          response.sendStatus(403);
        }
      }
    });
  }
};
//DELETE chapter
const deleteChapter = (request, response) => {
  const manga = parseInt(request.params.mangaid);
  const chap = parseIt(request.params.chapterid);
  //verify token
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
      return;
    } else {
      var data = authData.data;
      var check = data.indexOf("admin");
      if (check != -1) {
        pool.query({
            text: 'DELETE FROM "Chapter" WHERE manga_id = $1 AND chap_id = $2',
            values: [manga, chap]
          },
          (error, result) => {
            if (error) {
              response.sendStatus(500);
              console.log(error);
            } else {
              pool.query({
                text: 'UPDATE "Manga" SET num_of_chap = num_of_chap - 1 WHERE manga_id = $1',
                values: [manga]
              }, (error, result) => {
                if (error) {
                  response.sendStatus(500);
                  console.log(error);
                  return;
                } else {
                  response.status(200).send(`Chaper deleted with ID: ${chap}`);
                }
              });
              }
          }
        );
      } else {
        response.sendStatus(403);
      }
    }
  });
};
//GET Comments
const getComment = (request, response) => {
  const mangaId = parseInt(request.params.mangaid);
  const chapId = parseInt(request.params.chapterid);
  pool.query({
      text: 'SELECT user_name,content,time_up FROM "Comment" WHERE manga_id = $1 AND chap_id = $2 ORDER BY time_up',
      values: [mangaId, chapId]
    },
    (error, result) => {
      if (error) {
        response.sendStatus(404);
      } else {
        response.status(200).json(result.rows);
      }
    }
  );
};
//POST add comment
const addComment = (request, response) => {
  const mangaId = parseInt(request.params.mangaid);
  const chapId = parseInt(request.params.chapterid);
  const {
    content
  } = request.body;
  console.log(content);
  if (!content) {
    response.sendStatus(400);
  } else {
    //verify user
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
      } else {
        var user_name = authData.data.split(" ")[0];
        pool.query({
            text: 'INSERT INTO "Comment"(user_name,manga_id,chap_id,content,time_up) VALUES($1,$2,$3,$4,current_timestamp)',
            values: [user_name, mangaId, chapId, content]
          },
          (error, result) => {
            if (error) {
              response.status(500).send("Sever error");
            } else {
              response.status(200).send(`Comment added`);
            }
          }
        );
      }
    });
  }
};
//PUT add rating
const addRating = (request, response) => {
  var point = request.body.point;
  var mangaId = request.params.mangaid;
  console.log(point);
  if (!point || point < 0) {
    response.sendStatus(400);
    return;
  } else {
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
      } else {
        var username = authData.data.split(" ")[0];
        pool.query({
            text: 'SELECT * FROM "Rating" WHERE manga_id = $1 AND user_name = $2',
            values: [mangaId, username]
          },
          (error, result) => {
            if (result.rowCount == 0) {
              pool.query({
                  text: 'INSERT INTO "Rating" (manga_id,user_name,point) VALUES($1,$2,$3)',
                  values: [mangaId, username, point]
                },
                (error, result) => {
                  if (error) {
                    response.sendStatus(500);
                  } else {
                    response.sendStatus(201);
                  }
                }
              );
            } else {
              pool.query({
                  text: 'UPDATE "Rating" SET point = $3 WHERE manga_id = $1 AND user_name = $2',
                  values: [mangaId, username, point]
                },
                (error, result) => {
                  if (error) {
                    response.sendStatus(500);
                  } else {
                    response.sendStatus(201);
                  }
                }
              );
            }
          }
        );
      }
    });
  }
};
//PUT add Favorite
const addFavorite = (request, response) => {
  var subscribed = request.body.subscribed;
  var mangaId = request.params.mangaid;
  if ((subscribed != false && subscribed != true) || subscribed == "") {
    response.sendStatus(400);
    console.log(request.body)
  } else {
    jwt.verify(request.token, secret, (err, authData) => {
      if (err) {
        response.sendStatus(401);
        console.log(err);
      } else {
        var username = authData.data.split(" ")[0];
        if (subscribed == true) {
          pool.query({
              text: 'INSERT INTO "Favorite"(user_name,manga_id) VALUES($1,$2)',
              values: [username, mangaId]
            },
            (error, result) => {
              if (error) {
                response.sendStatus(500);
                console.log(error);
              } else {
                response.sendStatus(200);
              }
            }
          );
        } else if (subscribed == false) {
          pool.query({
              text: 'DELETE FROM "Favorite" WHERE manga_id = $1',
              values: [mangaId]
            },
            (error, result) => {
              if (error) {
                response.sendStatus(500);
                console.log(error);
              } else {
                response.sendStatus(200);
              }
            }
          );
        }
      }
    });
  }
};
//GET genre
const getGenre = (request, response) => {

  pool.query({
      text: `SELECT DISTINCT gen_name FROM "Genre" `
    },
    (error, results) => {
      if (error) {
        response.status(404);
        console.log(error);
        return;
      }
      response.status(200).json(results.rows);
    }
  );
};
//check valid info
function validUser(user) {
  const validUsername =
    typeof user.username == "string" && user.username.trim() != " ";
  const validPassword =
    typeof user.password == "string" &&
    user.username.trim() != " " &&
    user.password.trim().length >= 8;

  return validUsername & validPassword;
}

function validPassword(password) {
  const validPassword = typeof password == "string" && password.trim().length >= 8;

  return validPassword;
}
//POST signup
const signUp = (req, res) => {
  var user = req.body;
  if (validUser(user)) {
    pool.query({
        text: 'SELECT user_name FROM "User" WHERE user_name = $1',
        values: [user.username]
      },
      (error, results) => {
        if (results.rowCount == 0) {
          pool.query({
              text: `INSERT INTO "User"(user_name,pass) VALUES($1,$2)`,
              values: [user.username, user.password]
            },
            (error, result) => {
              if (error) {
                res.sendStatus(500);
              }
              res.status(201).send(`User added `);
            }
          );
        } else {
          //if the username is already in the database
          res.status(400).json({
            message: "Username had been used"
          });
        }
      }
    );
  } else {
    res.status(400).json({
      message: "Invalid username or password!"
    });
  }
};
//POST login
const logIn = (req, res) => {
  var user = req.body;
  if (validUser(user)) {
    pool.query({
        text: 'SELECT user_id FROM "User" WHERE user_name = $1 AND pass = $2',
        values: [user.username, user.password]
      },
      (error, results) => {
        //if the username is  in the database
        if (results.rowCount != 0) {
          let id = results.rows[0].user_id;
          //if user is admin
          pool.query({
              text: 'SELECT * FROM "Admin" WHERE admin_id = $1',
              values: [id]
            },
            (error, results) => {
              if (results.rowCount != 0) {
                res.send(createToken(user.username + " is admin"));
              } else {
                res.send(createToken(user.username));
              }
            }
          );
        } else {
          //if the username is already in the database
          res.status(400).json({
            message: "Invalid username or password"
          });
        }
      }
    );
  } else {
    res.status(400).json({
      message: "Invalid username or password!"
    });
  }
};
//GET User
const getUser = (request, response) => {
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
      console.log(err);
    } else {
      var data = authData.data;
      var check = data.indexOf("admin");
      if (check != -1) {
        pool.query({
          text: 'SELECT * FROM "User" LEFT JOIN "Admin" ON user_id = admin_id '
        }, (error, result) => {
          if (error) {
            console.log(error);
            response.sendStatus(500);
            return;
          } else {
            response.status(200).send(result.rows);
          }
        });
      } else {
        response.sendStatus(403);
      }
    }
  })
};
//DELETE User
const deleteUser = (request, response) => {
  var id = request.params.id;
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
    } else {
      var data = authData.data;
      var check = data.indexOf("admin");
      if (check != -1) {
        pool.query({
          text: 'DELETE FROM "User" WHERE user_id = $1',
          values: [id]
        }, (error, result) => {
          if (error) {
            response.sendStatus(500);
            console.log(error);
            return;
          } else {
            response.sendStatus(204);
          }
        });
      } else {
        response.sendStatus(403);
      }
    }
  })
}
//PUT change password
const changePassword = (request, response) => {
  const {
    oldPassword,
    newPassword
  } = request.body;
  if (!oldPassword | !newPassword) {
    response.sendStatus(400);
    return;
  } else {
    if (validPassword(newPassword)) {
      jwt.verify(request.token, secret, (err, authData) => {
        if (err) {
          response.sendStatus(401);
        } else {
          var user_name = (authData.data.split(" "))[0];
          pool.query({
            text: 'SELECT * FROM "User" WHERE user_name = $1 AND pass = $2',
            values: [user_name, oldPassword]
          }, (error, results) => {
            if (error) {
              response.sendStatus(500);
              console.log(error);
              return;
            } else {
              if (results.rowCount == 0 || results == undefined) {
                response.status(400).send('Incorrect password!');
              } else {
                pool.query({
                  text: 'UPDATE "User" SET pass = $1 WHERE user_name = $2',
                  values: [newPassword, user_name]
                }, (error, results) => {
                  if (error) {
                    response.sendStatus(500);
                    console.log(error);
                    return;
                  } else {
                    response.sendStatus(200);
                  }
                })
              }
            }
          })
        }
      })
    } else {
      response.status(400).send('Invalid new password!');
    }
  }
};
//GET getInfo
const getInfo = (request, response) => {
  jwt.verify(request.token, secret, (err, authData) => {
    if (err) {
      response.sendStatus(401);
      console.log(err);
    } else {
      var data = authData.data;
      var user_name = authData.data.split(" ")[0];
      var check = data.indexOf("admin");
      if (check != -1) {
        response.status(200).json({
          user_name: user_name,
          isAdmin: true
        });
      } else {
        response.status(200).json({
          user_name: user_name,
          isAdmin: false
        });
      }
    }
  })
}
//Exports
module.exports = {
  validUser,
  validPassword,
  signUp,
  logIn,
  createToken,
  verifyToken,
  getManga,
  getMangaById,
  getFavoriteManga,
  deleteManga,
  updateManga,
  addManga,
  addChapter,
  getChapters,
  getChapterById,
  updateChapter,
  deleteChapter,
  addRating,
  addFavorite,
  getComment,
  addComment,
  getGenre,
  getUser,
  deleteUser,
  changePassword,
  getInfo
};

