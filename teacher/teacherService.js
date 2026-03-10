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

        const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Created course with ID ${courseId}`
        ]);
        
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

// GET EDIT PAGE
function getEditCourse(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const courseId = req.params.id;

    const sql = `
        SELECT *
        FROM courses
        WHERE course_id = ?
        AND teacher_id = ?
    `;

    db.get(sql, [courseId, req.session.user_id], (err, course) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        if (!course) {
            return res.redirect("/dashboard");
        }

        res.render("teacher/editCourse", { course });
    });
}

function updateCourse(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const courseId = req.params.id;
    const { title, description } = req.body;

    let sql;
    let params;

    if (req.file) {

        const thumbnailPath = "/uploads/" + req.file.filename;

        sql = `
            UPDATE courses
            SET title = ?, description = ?, thumbnail = ?
            WHERE course_id = ? AND teacher_id = ?
        `;

        params = [
            title,
            description,
            thumbnailPath,
            courseId,
            req.session.user_id
        ];

    } else {

        sql = `
            UPDATE courses
            SET title = ?, description = ?
            WHERE course_id = ? AND teacher_id = ?
        `;

        params = [
            title,
            description,
            courseId,
            req.session.user_id
        ];
    }

    db.run(sql, params, (err) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Updated course with ID ${courseId}`
        ]);

        res.redirect(`/course/${courseId}`);
    });
}

function addTopic(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const courseId = req.params.id;
    const { title } = req.body;

    const orderSQL = `
        SELECT MAX(topic_order) AS maxOrder
        FROM topics
        WHERE course_id = ?
    `;

    db.get(orderSQL, [courseId], (err, row) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        const nextOrder = (row.maxOrder || 0) + 1;

        const insertSQL = `
            INSERT INTO topics (course_id, title, topic_order)
            VALUES (?, ?, ?)
        `;

        db.run(insertSQL, [courseId, title, nextOrder], (err) => {

            if (err) {
                console.error(err);
                return res.send("Database error");
            }

            res.redirect("/course/" + courseId + "/edit#topicsAccordion");

        });

    });

}

function deleteTopic(req, res) {

    const topicId = req.params.id;

    const findSql = `
        SELECT topic_order, course_id
        FROM topics
        WHERE topic_id = ?
    `;

    db.get(findSql, [topicId], (err, topic) => {

        if (err || !topic) {
            console.error(err);
            return res.send("Topic not found");
        }

        const { topic_order, course_id } = topic;

        const deleteContents = `
            DELETE FROM contents
            WHERE topic_id = ?
        `;

        db.run(deleteContents, [topicId], (err) => {

            if (err) {
                console.error(err);
                return res.send("Error deleting contents");
            }

            const deleteTopicSql = `
                DELETE FROM topics
                WHERE topic_id = ?
            `;

            db.run(deleteTopicSql, [topicId], (err) => {

                if (err) {
                    console.error(err);
                    return res.send("Error deleting topic");
                }

                const reorder = `
                    UPDATE topics
                    SET topic_order = topic_order - 1
                    WHERE course_id = ?
                    AND topic_order > ?
                `;

                db.run(reorder, [course_id, topic_order], (err) => {

                    if (err) {
                        console.error(err);
                        return res.send("Error reordering topics");
                    }

                    res.redirect("/course/" + course_id + "/edit");

                });

            });

        });

    });

}

function addContent(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const topicId = req.params.id;
    let { content_type, content_text } = req.body;

    if (content_type === "video" && content_text && content_text.includes("youtube.com/watch?v=")) {
        const id = content_text.split("v=")[1].split("&")[0];
        content_text = "https://www.youtube.com/embed/" + id;
    }

    let imagePath = null;

    if (req.file) {
        imagePath = "/uploads/" + req.file.filename;
    }

    const orderSQL = `
        SELECT MAX(content_order) AS maxOrder
        FROM contents
        WHERE topic_id = ?
    `;

    db.get(orderSQL, [topicId], (err, row) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        const nextOrder = (row.maxOrder || 0) + 1;

        const insertSQL = `
            INSERT INTO contents
            (topic_id, content_type, content_text, image_url, content_order)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.run(
            insertSQL,
            [topicId, content_type, content_text || null, imagePath, nextOrder],
            (err) => {

                if (err) {
                    console.error(err);
                    return res.send("Error adding content");
                }

                
                res.redirect("/course/" + req.body.course_id + "/edit#topicsAccordion");

            }
        );

    });

}

function deleteContent(req, res) {

    const contentId = req.params.id;

    const findSQL = `
        SELECT contents.topic_id, contents.content_order, topics.course_id
        FROM contents
        JOIN topics ON contents.topic_id = topics.topic_id
        WHERE contents.content_id = ?
    `;

    db.get(findSQL, [contentId], (err, content) => {

        if (err || !content) {
            console.error(err);
            return res.send("Content not found");
        }

        const { topic_id, content_order, course_id } = content;

        const deleteSQL = `
            DELETE FROM contents
            WHERE content_id = ?
        `;

        db.run(deleteSQL, [contentId], (err) => {

            if (err) {
                console.error(err);
                return res.send("Error deleting content");
            }

            const reorderSQL = `
                UPDATE contents
                SET content_order = content_order - 1
                WHERE topic_id = ?
                AND content_order > ?
            `;

            db.run(reorderSQL, [topic_id, content_order], (err) => {

                if (err) {
                    console.error(err);
                    return res.send("Error reordering contents");
                }

                res.redirect("/course/" + course_id + "/edit#topicsAccordion");

            });

        });

    });

}

function removeStudent(req, res) {

  if (!req.session.user_id || req.session.role !== "teacher") {
    return res.redirect("/dashboard");
  }

  const { courseId, userId } = req.params;

  const sql = `
    DELETE FROM enrollments
    WHERE course_id = ?
    AND user_id = ?
  `;

  db.run(sql, [courseId, userId], (err) => {

    if (err) {
      console.error(err);
      return res.send("Database error");
    }

    const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Removed student with ID ${userId}`
        ]);

    res.redirect("/course/" + courseId);

  });

}

function getTeacherFeedback(req, res) {

    if (!req.session.user_id || req.session.role !== "teacher") {
        return res.redirect("/dashboard");
    }

    const teacherId = req.session.user_id;

    const sql = `
        SELECT
            feedback.text,
            feedback.timestamp,
            users.username,
            courses.title AS course_title
        FROM feedback
        JOIN users
            ON feedback.user_id = users.user_id
        JOIN courses
            ON feedback.course_id = courses.course_id
        WHERE courses.teacher_id = ?
        ORDER BY feedback.timestamp DESC
    `;

    db.all(sql, [teacherId], (err, rows) => {

        if (err) {
            console.error(err);
            return res.send("Database error");
        }

        res.json(rows);

    });

}

function deleteCourse(req, res) {

  if (!req.session.user_id || req.session.role !== "teacher") {
    return res.redirect("/dashboard");
  }

  const courseId = req.params.id;

  const sql = `
    DELETE FROM courses
    WHERE course_id = ?
    AND teacher_id = ?
  `;

  db.run(sql, [courseId, req.session.user_id], function(err) {

    if (err) {
      console.error(err);
      return res.send("Database error");
    }

    if (this.changes === 0) {
      return res.send("Course not found or unauthorized");
    }

    const log = `
            INSERT INTO activity_logs (user_id, username, action)
            VALUES (?, ?, ?)
        `;

        db.run(log, [
            req.session.user_id,
            req.session.username,
            `Deleted course with ID ${courseId}`
        ]);

    res.redirect("/dashboard");

  });

}

module.exports = {
  createCourse,
  getCourses,
  getEditCourse,
  updateCourse,
  addTopic,
  deleteTopic,
  addContent,
  deleteContent,
  removeStudent,
  getTeacherFeedback,
  deleteCourse
};