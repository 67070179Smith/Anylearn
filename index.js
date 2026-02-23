// Library
const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: 'anylearnfundamentalwebprogrammingtermproject',
    resave: false,
    saveUninitialized: false
}));

// Database
let db = new sqlite3.Database('anylearn.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    db.run("PRAGMA foreign_keys = ON");
    console.log('Connected to the SQlite database.');
});

const usersCreateSQL = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `

db.run(usersCreateSQL, (err) => {
    if (err) throw err;
    console.log("Users table created");

    const profilesCreateSQL = `
        CREATE TABLE IF NOT EXISTS profiles (
            profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            full_name TEXT,
            description TEXT,
            sex TEXT,
            birthdate TEXT,
            FOREIGN KEY (user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE 
        );
    `;

    db.run(profilesCreateSQL, (err) => {
        if (err) throw err;
        console.log("Profiles table created");
    });
});

// Routing
app.get("/", (req, res) => {
    res.render('login');
});
app.post("/login", (req, res) => {
    const {username, password} = req.body;
    const sql = `
        SELECT * FROM users
        WHERE username = ?
    `;

    db.get(sql, [username], async(err, userData) =>{
        if(err) return res.send("Error");
        if(!userData) return res.send("ไม่พบผู้ใช้");

        const chkPasswd = await bcrypt.compare(password, userData.password);
        if(!chkPasswd) return res.send("รหัสผ่านผิด");

        req.session.user = {
            id: userData.user_id,
            username: userData.username,
            role: userData.role
        }

        res.redirect("/dashboard")
    });
});

app.get('/register', (req, res) => {
    res.render("registration");
});
app.post('/register', (req, res) => {
    
});

app.listen(port, () => {
    console.log(`Starting server at port ${port}`);
});