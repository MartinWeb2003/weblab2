

const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database(':memory:');


db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT
  )`);


  const stmt = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)");
  stmt.run('testuser', 'password123', 'test@example.com');
  stmt.finalize();

  console.log('Database initialized with test user.');
});

db.close();
