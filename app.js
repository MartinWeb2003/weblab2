
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');


const app = express();


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(
  session({
    secret: 'your_secret_key', 
    resave: false,
    saveUninitialized: false,
  })
);


app.use(express.static(path.join(__dirname, 'public')));


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
    return;
  }
  console.log('Connected to SQLite database');
});


let sqlInjectionVulnerability = true; 
let csrfVulnerability = true; 


app.use((req, res, next) => {
  if (!csrfVulnerability) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(16).toString('hex');
    }
  }
  next();
});


app.use((req, res, next) => {
    if (req.session.userId) {
      const query = `SELECT username, email FROM users WHERE id = ?`;
      db.get(query, [req.session.userId], (err, row) => {
        if (err) {
          console.log(err);
          next();
        } else {
          if (row) {
            res.locals.username = row.username;
            res.locals.email = row.email;
          }
          next();
        }
      });
    } else {
      next();
    }
  });
  

app.post('/toggle', (req, res) => {
  console.log('Toggle Request Body:', req.body);
  if (req.body.sql) {
    sqlInjectionVulnerability = req.body.sql === 'on';
  }
  if (req.body.csrf) {
    csrfVulnerability = req.body.csrf === 'on';
    if (csrfVulnerability) {
     
      delete req.session.csrfToken;
    } else {
 
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(16).toString('hex');
      }
    }
  }
  res.redirect('/');
});


app.get('/', (req, res) => {
  res.render('index', {
    sqlInjectionVulnerability: sqlInjectionVulnerability ? 'Enabled' : 'Disabled',
    csrfVulnerability: csrfVulnerability ? 'Enabled' : 'Disabled',
  });
});


app.get('/login', (req, res) => {
    res.render('login', {
      sqlInjectionVulnerability: sqlInjectionVulnerability ? 'Enabled' : 'Disabled',
      csrfVulnerability: csrfVulnerability ? 'Enabled' : 'Disabled',
    });
  });
  


app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (sqlInjectionVulnerability) {
    
    const query = `SELECT * FROM users WHERE (username = '${username}' AND password = '${password}')`;

    db.all(query, (err, rows) => {
      if (err) {
        console.log(err);
        res.send('Database error');
        return;
      }
      if (rows.length > 0) {
    
        req.session.userId = rows[0].id;
        res.render('success', { message: `Welcome, ${rows[0].username}` });
      } else {
        res.render('error', { message: 'Invalid Credentials' });
      }
    });
  } else {
  
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

    db.all(query, [username, password], (err, rows) => {
      if (err) {
        console.log(err);
        res.send('Database error');
        return;
      }
      if (rows.length > 0) {
  
        req.session.userId = rows[0].id;
        res.render('success', { message: `Welcome, ${rows[0].username}` });
      } else {
        res.render('error', { message: 'Invalid Credentials' });
      }
    });
  }
});

app.get('/change-email', (req, res) => {
    if (!req.session.userId) {
      res.render('error', { message: 'You must be logged in to change your email.' });
      return;
    }
  
    const userId = req.session.userId;
  
 
    const query = `SELECT email FROM users WHERE id = ?`;
    db.get(query, [userId], (err, row) => {
      if (err) {
        console.log(err);
        res.send('Database error');
        return;
      }
  
      const currentEmail = row ? row.email : '';
  
      res.render('change-email', {
        csrfVulnerability: csrfVulnerability ? 'Enabled' : 'Disabled',
        csrfToken: csrfVulnerability ? null : req.session.csrfToken,
        currentEmail: currentEmail,
      });
    });
  });
  


app.post('/change-email', (req, res) => {
  console.log('CSRF Vulnerability Enabled:', csrfVulnerability);
  if (!req.session.userId) {
    res.render('error', { message: 'You must be logged in to change your email.' });
    return;
  }

  const email = req.body.email;
  const userId = req.session.userId;

  if (csrfVulnerability) {
  
    const query = `UPDATE users SET email = ? WHERE id = ?`;
    db.run(query, [email, userId], (err) => {
      if (err) {
        console.log(err);
        res.send('Database error');
        return;
      }
      res.render('success', { message: `Your email has been changed to ${email}` });
    });
  } else {
   
    const csrfToken = req.body.csrfToken;
    if (csrfToken !== req.session.csrfToken) {
      res.status(403).render('error', { message: 'Invalid CSRF token.' });
      return;
    }
   
    const query = `UPDATE users SET email = ? WHERE id = ?`;
    db.run(query, [email, userId], (err) => {
      if (err) {
        console.log(err);
        res.send('Database error');
        return;
      }
      res.render('success', { message: `Your email has been changed to ${email}` });
    });
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('success', { message: 'You have been logged out' });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
