const db = require("../database");

// CREATE COURSE
function createCourse(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const { title, description } = req.body;

    let thumbnailPath = "/images/default.jpg";
    if (req.file) {
        thumbnailPath = "/uploads/" + req.file.filename;
    }

    const sql = `
        INSERT INTO courses (title, description, thumbnail, teacher_id)
        VALUES (?, ?, ?, ?);
    `;

    db.run(sql,
    [title, description, thumbnailPath, req.session.user_id],
    (err) => {
        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        res.redirect("/dashboard");
    });
}

// GET COURSES
function getCourses(req, res) {

  const sql = `
    SELECT * FROM courses
    WHERE teacher_id = ?;
  `;

  db.all(sql, [req.session.user_id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.send("Database error");
    }

    res.render("teacher/courses", { courses: rows });
  });
}

module.exports = {
  createCourse,
  getCourses
};