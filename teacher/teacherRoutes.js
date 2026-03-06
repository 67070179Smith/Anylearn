const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const teacherService = require("./teacherService");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1E9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  }
});

// upload middleware
router.post(
    "/course/create",
    upload.single("thumbnail"),
    teacherService.createCourse
);

router.get(
    "/courses",
    teacherService.getCourses
);

module.exports = router;