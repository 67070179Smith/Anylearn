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

        const coursesCreateSQL = `
            CREATE TABLE IF NOT EXISTS courses (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            teacher_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE
            );
        `;

        db.run(coursesCreateSQL, (err) => {
            if (err) throw err;
            console.log("Courses table created");

            const topicsCreateSQL = `
                CREATE TABLE IF NOT EXISTS topics (
                topic_id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                topic_order INTEGER DEFAULT 0,
                FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
                );  
            `;

            db.run(topicsCreateSQL, (err) => {
                if (err) throw err;
                console.log("Topics table created");
                
                const contentsCreateSQL = `
                    CREATE TABLE IF NOT EXISTS contents (
                    content_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic_id INTEGER NOT NULL,
                    content_type TEXT CHECK(content_type IN ('text', 'image')) NOT NULL,
                    content_text TEXT,
                    image_url TEXT,
                    content_order INTEGER DEFAULT 0,
                    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
                    );
                `;

                db.run(contentsCreateSQL, (err) => {
                    if (err) throw err;
                    console.log("Contents table created");
                    
                    const enrollmentCreateSQL = `
                        CREATE TABLE IF NOT EXISTS enrollments (
                        enroll_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        course_id INTEGER NOT NULL,
                        enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                        FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
                        UNIQUE(user_id, course_id) 
                        );
                    `;

                    db.run(enrollmentCreateSQL, (err) => {
                        if (err) throw err;
                        console.log("Enrollment table created");
                    });
                });
            });
        });
    });
});

// Routing
app.get("/", (req, res) => {
    res.render("login", { error: null, username: "" });
});
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";

  db.get(sql, [username], async (err, user) => {
    if (err) return res.send("Database error");

    if (!user) {
      return res.render("login", {
        error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        username: username
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login", {
        error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        username: username
      });
    }

    req.session.user_id = user.user_id;
    req.session.role = user.role;

    res.redirect("/dashboard");
  });
});

app.get('/register', (req, res) => {
    res.render("registration");
});
app.post('/register', (req, res) => {
    const { username, email, password, cfmpassword, role } = req.body;
    const chkUpper = /[A-Z]/.test(password);
    const chkLower = /[a-z]/.test(password);
    const chkNum = /[0-9]/.test(password);
    const chkExtra = /[^A-Za-z0-9]/.test(password);
    const chkEmail = /^.+@.+\.com$/.test(email);
    if (!chkUpper || !chkLower || !chkNum || !chkExtra || password.length < 8) {
        return res.send("Password ต้องมีความยาวอย่างน้อย 8 ตัวอักษร มีตัวเลข ตัวพิมใหญ่ พิมพ์เล็กและอักขระพิเศษอย่างน้อย 1 ตัวอักษร");
    }
    if (!chkEmail) return res.send("Email ไม่ถูกต้อง");
    if (cfmpassword != password) return res.send("Password ไม่เหมือนกัน");

    const sql = `
        SELECT user_id FROM users
        WHERE username = ? AND email = ?;
    `;
    db.get(sql, [username, email], async (err, data) => {
        if (err) return res.send("Error");
        if (data) return res.send("Username นี้ถูกใช้แล้ว");

        const hashedPwd = await bcrypt.hash(password, 5);
        const sql = `
            INSERT INTO users(username, password, email, role)
            VALUES (?,?,?,?);
        `;
        db.run(sql, [username, hashedPwd, email, role], (err) => {
            if (err) return res.send("Error");
            res.redirect("/");
        });
    });
});

app.listen(port, () => {
    console.log(`Starting server at port ${port}`);
});