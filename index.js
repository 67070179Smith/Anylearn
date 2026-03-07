// Library
const express = require("express");
const path = require("path");
const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require("./database")
const teacherRoutes = require("./teacher/teacherRoutes");

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
    secret: 'anylearnfundamentalwebprogrammingtermproject',
    resave: false,
    saveUninitialized: false
}));
app.use("/teacher", teacherRoutes);
const adminRoutes = require("./admin/adminRoute");
app.use("/admin", adminRoutes);

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
        req.session.username = user.username;
        req.session.role = user.role;

        const log = `
        INSERT INTO activity_logs (user_id, username, action)
        VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            "Login"
        ]);

        if (user.role === "admin") {
            res.redirect("/admin");
        } 
        else {
            res.redirect("/dashboard");
        }
            });
        });

app.post("/guest", (req, res) => {
    req.session.user_id = null;
    req.session.username = "Guest";
    req.session.role = "guest";
    res.redirect("/dashboard");
});

app.get('/register', (req, res) => {
    res.render("registration", { error: null, username: "", fullname: "",email: "", password: "", chkpassword: "" });
});
app.post('/register', (req, res) => {
    const { username, fullname, email, password, cfmpassword } = req.body;
    const chkUpper = /[A-Z]/.test(password);
    const chkLower = /[a-z]/.test(password);
    const chkNum = /[0-9]/.test(password);
    const chkExtra = /[^A-Za-z0-9]/.test(password);
    const chkEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(username === "" || email === "" || password === "" || cfmpassword === "") {
        return res.render("registration", {
            error: "โปรดกรอกข้อมูลให้ครบ",
            username: username,
            fullname: fullname,
            email: email,
            password: password,
            chkpassword: cfmpassword
        });
    }
    if (!chkEmail) {
        return res.render("registration", {
            error: "Email ไม่ถูกต้อง",
            username: username,
            fullname: fullname,
            email: "",
            password: "",
            chkpassword: cfmpassword
        });
    }
    if (!chkUpper) {
        return res.render("registration", {
            error: "รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }
    if (!chkLower) {
        return res.render("registration", {
            error: "รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }
    if (!chkExtra) {
        return res.render("registration", {
            error: "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }
    if (!chkNum) {
        return res.render("registration", {
            error: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }
    if (password.length < 8) {
        return res.render("registration", {
            error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }
    if (cfmpassword != password) {
        return res.render("registration", {
            error: "รหัสผ่านไม่ตรงกัน",
            username: username,
            fullname: fullname,
            email: email,
            password: "",
            chkpassword: ""
        });
    }

    const sql = `
        SELECT user_id FROM users
        WHERE username = ? AND email = ?;
    `;
    db.get(sql, [username, email], async (err, data) => {
        if (err) return res.send("Error");
        if (data) {
            return res.render("registration", {
                error: "Username นี้ถูกใช้แล้ว",
                username: "",
                fullname: fullname,
                email: email,
                password: "",
                chkpassword: ""
            });
        }

        const hashedPwd = await bcrypt.hash(password, 5);
        const sql = `
            INSERT INTO users(username, password, email, role, full_name, description, gender, birthdate)
            VALUES (?,?,?,?,?,?,?,?);
        `;
        db.run(sql, [username, hashedPwd, email, "learner", fullname, "", "", ""], (err) => {
            if (err) return res.send("Error");

            const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

            db.run(log, [
                null,
                username,
                "User registered"
            ]);

            res.redirect("/");
        });
    });
});

app.get('/dashboard', (req, res) => {

    if (!req.session.role) return res.redirect('/');

    const viewRole = req.session.role === "learner" ? "student" : req.session.role;

    const q = req.query.q || "";

    let sql;
    let params;

    if (viewRole === "teacher") {

        if (q === "") {
            // ต้องjoin ไม่ได้ใส่ชื่ออาจารย์ไว้
            sql = `
            SELECT courses.*, users.username AS teacher_name
            FROM courses
            JOIN users ON courses.teacher_id = users.user_id
            WHERE courses.teacher_id = ?
    `;
            params = [req.session.user_id];

        } else {

            sql = `
                SELECT courses.*, users.username AS teacher_name
                FROM courses
                JOIN users ON courses.teacher_id = users.user_id
                WHERE courses.teacher_id = ?
                AND (courses.title LIKE ? OR courses.description LIKE ?)
            `;
            params = [
                req.session.user_id,
                `%${q}%`,
                `%${q}%`
            ];

        }

    } else {

        // สำหรับคอร์สที่นักเรียนสมัคร

        if (q === "") {
            sql = `
            SELECT courses.*, users.username AS teacher_name
            FROM enrollments
            JOIN courses ON enrollments.course_id = courses.course_id
            JOIN users ON courses.teacher_id = users.user_id
            WHERE enrollments.user_id = ?
            `;
            params = [];
        } else {
            sql = `
                SELECT courses.*, users.username AS teacher_name
                FROM enrollments
                JOIN courses ON enrollments.course_id = courses.course_id
                JOIN users ON courses.teacher_id = users.user_id
                WHERE enrollments.user_id = ?
                AND (courses.title LIKE ? OR courses.description LIKE ?)
            `;
            params = [`%${q}%`, `%${q}%`];
        }

    }

    db.all(sql, params, (err, courses) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        console.log(courses);
        
        res.render("dashboard", {
            username: req.session.username || "Guest",
            role: viewRole,
            courses: courses,
            query: q
        });

    });

});

app.get("/course/:id", (req, res) => {

    const courseId = req.params.id;

    const sql = `
        SELECT courses.*, users.username AS teacher_name
        FROM courses
        JOIN users ON courses.teacher_id = users.user_id
        WHERE courses.course_id = ?
    `;

    db.get(sql, [courseId], (err, course) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (!course) {
            return res.send("Course not found");
        }

        res.render("course", {
            course: course,
            role: req.session.role,
            username: req.session.username
        });

    });

});

app.post("/logout", (req, res) => {
    const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            "Logged out"
        ]);

    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get('/profile', (req, res) => {
    const sql = `SELECT * FROM users WHERE user_id = ?`
    db.get(sql, [req.session.user_id], (err, user) => {
        res.render('profile', {error: null, data: user, role: req.session.role});
    });
});

app.get('/editprofile', (req, res) => {
    const sql = `SELECT * FROM users WHERE user_id = ?`
    db.get(sql, [req.session.user_id], (err, user) => {
        res.render('profile_edit', {error: null, data: user, role: req.session.role});
    });
});

app.post('/editprofile', (req,res)=>{
    const { fullname, username, email, description, gender, birthdate, profile_pic } = req.body;

    const updateSQL = `
        UPDATE users 
        SET full_name = ?, username = ?, email = ?, description = ?, gender = ?, birthdate = ?, profile_pic = ?
        WHERE user_id = ?
    `;

    db.run(updateSQL,
        [fullname, username, email, description, gender, birthdate, profile_pic, req.session.user_id],
        (err, result)=>{
            if(err) throw err;
            res.redirect('/profile');
        }
    );
});

app.listen(port, () => {
    console.log(`Starting server at port ${port}`);
});
