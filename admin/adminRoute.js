const express = require("express");
const router = express.Router();
const db = require("../database");

// Middleware: allow only admin
function checkAdmin(req, res, next) {
    if (!req.session.role || req.session.role !== "admin") {
        return res.redirect("/dashboard");
    }
    next();
}

// Admin dashboard
router.get("/", checkAdmin, (req, res) => {

    const userSearch = (req.query.user_search || "").trim();
    const userSort = req.query.user_sort || "user_id_desc";

    let userOrderBy = "user_id DESC";

    if (userSort === "user_id_asc") userOrderBy = "user_id ASC";
    if (userSort === "date_desc") userOrderBy = "created_at DESC";
    if (userSort === "date_asc") userOrderBy = "created_at ASC";
    if (userSort === "username_asc" || userSort === "learner" || userSort === "teacher" || userSort === "admin")
        userOrderBy = "username COLLATE NOCASE ASC";
    if (userSort === "username_desc") userOrderBy = "username COLLATE NOCASE DESC";


    const logSearch = (req.query.log_search || "").trim();
    const logSort = req.query.log_sort || "log_id_desc";

    let logOrderBy = "log_id DESC";

    if (logSort === "log_id_asc") logOrderBy = "log_id ASC";
    if (logSort === "username_asc") logOrderBy = "username COLLATE NOCASE ASC";
    if (logSort === "username_desc") logOrderBy = "username COLLATE NOCASE DESC";
    if (logSort === "date_desc") logOrderBy = "activity_logs.created_at DESC";
    if (logSort === "date_asc") logOrderBy = "activity_logs.created_at ASC";
    if (logSort === "action_asc") logOrderBy = "activity_logs.action ASC";
    if (logSort === "action_desc") logOrderBy = "activity_logs.action DESC";


    let usersQuery = `
        SELECT user_id, username, email, role, created_at
        FROM users
        WHERE username LIKE ? COLLATE NOCASE 
        OR email LIKE ? COLLATE NOCASE
        ORDER BY ${userOrderBy}
    `;

    if (userSort === "learner" || userSort === "teacher" || userSort === "admin") {
        usersQuery = `
            SELECT user_id, username, email, role, created_at
            FROM users
            WHERE (username LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE)
            AND role = '${userSort}'
            ORDER BY ${userOrderBy}
        `;
    }

    let logsQuery = `
        SELECT log_id, username, action, created_at
        FROM activity_logs
        WHERE username LIKE ? COLLATE NOCASE
        OR action LIKE ? COLLATE NOCASE
        ORDER BY ${logOrderBy}
    `;

    db.all(logsQuery, [`%${logSearch}%`, `%${logSearch}%`], (err, logs) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        db.all(usersQuery, [`%${userSearch}%`, `%${userSearch}%`], (err, users) => {

            if (err) {
                console.error(err);
                return res.send("Database error");
            }

            res.render("admin", {
                users,
                logs,
                user_search: userSearch,
                user_sort: userSort,
                log_search: logSearch,
                log_sort: logSort,
                username: req.session.username,
                role: req.session.role 
            });

        });
    });

});


// Delete user
router.post("/delete/:id", checkAdmin, (req, res) => {

    const userId = req.params.id;

    const del = `DELETE FROM users WHERE user_id = ?`;

    db.run(del, [userId], function (err) {

        if (err) {
            console.error(err);
            return res.send("Delete failed");
        }

        // Log action
        const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Deleted user with ID ${userId}`
        ]);

        res.redirect("/admin");
    });

});

router.post("/logout", (req, res) => {

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

router.post("/change-role/:id", (req, res) => {

const userId = req.params.id
const newRole = req.body.role

if (newRole === "admin") {
    return res.status(400).send("Cannot change role to admin");
}

    const sql = `
    UPDATE users
    SET role = ?
    WHERE user_id = ? AND role != 'admin'
    `

    db.run(sql, [newRole, userId], (err) => {

    if (err) {
    console.log(err)
    }

    const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Changed role for user with ID ${userId} to ${newRole}`
        ]);

res.redirect("/admin")

})

})

module.exports = router;