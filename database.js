const sqlite3 = require('sqlite3').verbose();

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
        full_name TEXT NOT NULL,
        description TEXT,
        gender TEXT,
        birthdate DATETIME,
        profile_pic TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `

db.run(usersCreateSQL, (err) => {
    if (err) throw err;
    console.log("Users table created");

    const coursesCreateSQL = `
            CREATE TABLE IF NOT EXISTS courses (
            course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            thumbnail TEXT DEFAULT '/images/default-course.jpg',
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
                    content_type TEXT CHECK(content_type IN ('text', 'image', 'video')) NOT NULL,
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


                    const createLogs = `
                            CREATE TABLE IF NOT EXISTS activity_logs (
                            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER,
                            username TEXT,
                            action TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
                            );`;
                    db.run(createLogs, (err) => {
                        if (err) throw err;
                        console.log("Activity logs table created");
                    });
                });
            });
        });
    });
});


module.exports = db;