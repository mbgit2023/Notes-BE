const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');  


const app = express();

const port = 3001;
app.use(cors()); 
app.use(bodyParser.json());

// Create a connection to the MySQL server (not the database)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', 
  password: 'mysql123', 
});

// Connect to the MySQL server
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL server with ID ' + db.threadId);

  // Create the database if it doesn't exist
  const createDatabaseSQL = 'CREATE DATABASE IF NOT EXISTS notes;';
  db.query(createDatabaseSQL, (err, results) => {
    if (err) {
      console.error('Error creating database: ' + err.stack);
    } else {
      console.log('Database created or already exists');

      // After creating the database, switch to it
      const useDatabaseSQL = 'USE notes;';
      db.query(useDatabaseSQL, (err) => {
        if (err) {
          console.error('Error switching to notes database: ' + err.stack);
          return;
        }
        console.log('Switched to "notes" database');

        // Create the 'users' table first if it doesn't exist
        const createUsersTableSQL = `
          CREATE TABLE IF NOT EXISTS users (
              id INT AUTO_INCREMENT PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              password VARCHAR(255) NOT NULL
          ) ENGINE=InnoDB;
        `;
        db.query(createUsersTableSQL, (err, results) => {
          if (err) {
            console.error('Error creating users table: ' + err.stack);
          } else {
            console.log('users table created or already exists');

            // After creating the 'users' table, create the 'notelist' table
            const createNotelistTableSQL = `
              CREATE TABLE IF NOT EXISTS notelist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                updatedAt TEXT,
                userId INT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id)
              ) ENGINE=InnoDB;
            `;

            db.query(createNotelistTableSQL, (err, results) => {
              if (err) {
                console.error('Error creating notelist table: ' + err.stack);
              } else {
                console.log('notelist table created or already exists');
              }
            });
          }
        });
      });
    }
  });
});

// Create a new note
app.post('/create', (req, res) => {

  const { title, content, createdAt, userId } = req.body;


  if (!title || !content || !createdAt || !userId) {
    return res.status(400).json({ error: 'Title, content, createdAt and userId fields are required' });
  }


  const query = 'INSERT INTO notelist (title, content, createdAt, userId) VALUES (?, ?, ?, ?)';
  db.query(query, [title, content, createdAt, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ id: results.insertId, title, content, createdAt });
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
      return res.status(400).json({ error: "Email and password are required "})

  console.log(email)
  console.log(password)

  const query = 'SELECT * FROM users WHERE email = ? and password = ?'
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length <= 0) {
      return res.status(404).json({ error: 'User not found' });
    } else 
        res.json({ user: email, id: results[0].id });
  });
})

// Register
app.post('/register', (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
      return res.status(400).json({ error: "Email and password are required "})

  const query = 'SELECT * FROM users WHERE email = ?'
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length >= 1)  {
      return res.status(404).json({ error: 'User already registered' });
    } else {
      const query = 'INSERT INTO users (email, password) VALUES (?, ?)'
      db.query(query, [email, password], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ user: email, id: results[0].id});
    })
      
  }
})
})



// Update a note
app.put('/update/:id', (req, res) => {
  const noteId = req.params.id;
  const { title, content, updatedAt } = req.body;

  if (!title || !content || !updatedAt) {
    return res.status(400).json({ error: 'Title, content and updatedAt are required' });
  }

  const query = 'UPDATE notelist SET title = ?, content = ?, updatedAt = ? WHERE id = ?';
  db.query(query, [title, content, updatedAt, noteId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ id: noteId, title, content, updatedAt });
  });
});

// Delete a note
app.delete('/delete/:id', (req, res) => {
  const noteId = req.params.id;

  const query = 'DELETE FROM notelist WHERE id = ?';
  db.query(query, [noteId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted' });
  });
});

// Get all notes
app.get('/notes/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = 'SELECT * FROM notelist WHERE userId = ? ORDER BY createdAt DESC';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results); 
  });
});

app.get('/note/:id', (req, res) => {
  const noteId = req.params.id;

  const query = 'SELECT * FROM notelist WHERE id = ?';
  db.query(query, [noteId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

