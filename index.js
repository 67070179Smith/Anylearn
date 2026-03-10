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
    res.redirect("/browse");
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

    const viewRole = req.session.role //=== "learner" ? "student" : req.session.role;
    const q = req.query.q || "";

    let sql;
    let params;

    if (viewRole === "teacher") {

        if (q === "") {

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

        if (q === "") {

            sql = `
                SELECT courses.*, users.username AS teacher_name
                FROM enrollments
                JOIN courses ON enrollments.course_id = courses.course_id
                JOIN users ON courses.teacher_id = users.user_id
                WHERE enrollments.user_id = ?
            `;

            params = [req.session.user_id];

        } else {

            sql = `
                SELECT courses.*, users.username AS teacher_name
                FROM enrollments
                JOIN courses ON enrollments.course_id = courses.course_id
                JOIN users ON courses.teacher_id = users.user_id
                WHERE enrollments.user_id = ?
                AND (courses.title LIKE ? OR courses.description LIKE ?)
            `;

            params = [
                req.session.user_id,
                `%${q}%`,
                `%${q}%`
            ];
        }
    }

    db.all(sql, params, (err, courses) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        // If not teacher → render normally
        if (viewRole !== "teacher") {

            return res.render("dashboard", {
                username: req.session.username || "Guest",
                role: viewRole,
                courses: courses,
                query: q,
                feedbackList: []
            });

        }

        // Teacher → also load feedback
        const feedbackSQL = `
            SELECT
                feedback.text,
                feedback.timestamp,
                users.username,
                courses.title AS course_title
            FROM feedback
            JOIN users ON feedback.user_id = users.user_id
            JOIN courses ON feedback.course_id = courses.course_id
            WHERE courses.teacher_id = ?
            ORDER BY feedback.timestamp DESC
        `;

        db.all(feedbackSQL, [req.session.user_id], (err, feedbackRows) => {

            if (err) {
                console.error(err);
                return res.send("Database error");
            }

            res.render("dashboard", {
                username: req.session.username || "Guest",
                role: viewRole,
                courses: courses,
                query: q,
                feedbackList: feedbackRows
            });

        });

    });

});

app.get("/course/:id", (req, res) => {

    const courseId = req.params.id;

    const courseSQL = `
        SELECT courses.*, users.username AS teacher_name
        FROM courses
        JOIN users ON courses.teacher_id = users.user_id
        WHERE courses.course_id = ?
    `;

    db.get(courseSQL, [courseId], (err, course) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (!course) {
            return res.send("Course not found");
        }

        const topicsSQL = `
            SELECT 
                topics.topic_id,
                topics.title AS topic_title,
                topics.topic_order,
                contents.content_id,
                contents.content_type,
                contents.content_text,
                contents.image_url,
                contents.content_order
            FROM topics
            LEFT JOIN contents
            ON topics.topic_id = contents.topic_id
            WHERE topics.course_id = ?
            ORDER BY topics.topic_order, contents.content_order
        `;

        db.all(topicsSQL, [courseId], (err, rows) => {

            if (err) {
                console.error(err);
                return res.send("Database error");
            }

            const topics = {};

            rows.forEach(row => {

                if (!topics[row.topic_id]) {
                    topics[row.topic_id] = {
                        topic_id: row.topic_id,
                        title: row.topic_title,
                        contents: []
                    };
                }

                if (row.content_id) {
                    topics[row.topic_id].contents.push({
                        content_id: row.content_id,
                        content_type: row.content_type,
                        content_text: row.content_text,
                        image_url: row.image_url
                    });
                }

            });

            const topicsArray = Object.values(topics);

            const role = req.session.role || "guest";
            const userId = req.session.user_id;

            if (!userId || role === "guest") {

                return res.render("course", {
                    course,
                    topics: topicsArray,
                    role,
                    username: req.session.username,
                    editMode: false,
                    enrolled: false,
                    students: []
                });

            }

            const enrollSQL = `
                SELECT 1
                FROM enrollments
                WHERE user_id = ?
                AND course_id = ?
            `;

            db.get(enrollSQL, [userId, courseId], (err, row) => {

                if (err) {
                    console.error(err);
                    return res.send("Database error");
                }

                const enrolled = !!row;

                const studentsSQL = `
                    SELECT users.user_id, users.username
                    FROM enrollments
                    JOIN users ON enrollments.user_id = users.user_id
                    WHERE enrollments.course_id = ?
                `;

                db.all(studentsSQL, [courseId], (err, students) => {

                    if (err) {
                        console.error(err);
                        return res.send("Database error");
                    }

                    res.render("course", {
                        course,
                        topics: topicsArray,
                        role,
                        username: req.session.username,
                        editMode: false,
                        enrolled,
                        students
                    });

                });

            });

        });

    });

});

app.get("/course/:id/edit", (req, res) => {

    const courseId = req.params.id;

    if (req.session.role !== "teacher") {
        return res.redirect("/course/" + courseId);
    }

    const courseSQL = `
        SELECT courses.*, users.username AS teacher_name
        FROM courses
        JOIN users ON courses.teacher_id = users.user_id
        WHERE courses.course_id = ?
    `;

    db.get(courseSQL, [courseId], (err, course) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (!course) {
            return res.send("Course not found");
        }

        const topicSQL = `
            SELECT *
            FROM topics
            WHERE course_id = ?
            ORDER BY topic_order
        `;

        db.all(topicSQL, [courseId], (err, topics) => {

            if (err) {
                console.error(err);
                return res.send("Database error");
            }

            if (topics.length === 0) {
                return res.render("course", {
                    course,
                    topics: [],
                    role: req.session.role,
                    username: req.session.username,
                    editMode: true,
                    students: []
                });
            }

            const topicIds = topics.map(t => t.topic_id);

            const contentSQL = `
                SELECT *
                FROM contents
                WHERE topic_id IN (${topicIds.map(() => "?").join(",")})
                ORDER BY content_order
            `;

            db.all(contentSQL, topicIds, (err, contents) => {

                if (err) {
                    console.error(err);
                    return res.send("Database error");
                }

                const topicMap = {};

                topics.forEach(topic => {
                    topic.contents = [];
                    topicMap[topic.topic_id] = topic;
                });

                contents.forEach(content => {
                    if (topicMap[content.topic_id]) {
                        topicMap[content.topic_id].contents.push(content);
                    }
                });

                res.render("course", {
                    course,
                    topics,
                    role: req.session.role,
                    username: req.session.username,
                    editMode: true,
                    students: []
                });

            });

        });

    });

});

app.post("/course/:id/enroll", (req, res) => {

    if (!req.session.user_id) {
        return res.redirect("/register");
    }

    const userId = req.session.user_id;
    const courseId = req.params.id;

    const sql = `
        INSERT OR IGNORE INTO enrollments (user_id, course_id)
        VALUES (?, ?)
    `;

    db.run(sql, [userId, courseId], (err) => {

        if (err) {
            console.error(err);
            return res.send("Enrollment failed");
        }

        res.redirect("/course/" + courseId);

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

app.get("/browse", (req, res) => {

    if (!req.session.role) {
        return res.redirect("/");
    }

    const q = req.query.q || "";

    let sql;
    let params;

    if (q === "") {

        sql = `
            SELECT courses.*, users.username AS teacher_name
            FROM courses
            JOIN users ON courses.teacher_id = users.user_id
            ORDER BY courses.created_at DESC
        `;

        params = [];

    } else {

        sql = `
            SELECT courses.*, users.username AS teacher_name
            FROM courses
            JOIN users ON courses.teacher_id = users.user_id
            WHERE courses.title LIKE ? OR courses.description LIKE ?
            ORDER BY courses.created_at DESC
        `;

        params = [`%${q}%`, `%${q}%`];

    }

    db.all(sql, params, (err, courses) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        res.render("browse", {
            username: req.session.username || "Guest",
            role: req.session.role,
            courses: courses,
            query: q
        });

    });

});

app.post("/course/:id/feedback", (req, res) => {

    if (!req.session.user_id) {
        return res.redirect("/register");
    }

    const courseId = req.params.id;
    const userId = req.session.user_id;
    const text = req.body.text;

    const sql = `
        INSERT INTO feedback (course_id, user_id, text)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [courseId, userId, text], (err) => {

        if (err) {
            console.error(err);
            return res.send("Failed to send feedback");
        }

        const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Sent feedback for course with ID ${courseId}`
        ]);

        res.redirect("/course/" + courseId);

    });

});

app.listen(port, () => {
    console.log(`Starting server at port ${port}`);
});
