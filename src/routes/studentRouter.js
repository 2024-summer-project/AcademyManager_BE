const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticateJWT } = require("../lib/middlewares/auth.js");

// 학원에서 학생 삭제
router.delete("/:user_id", authenticateJWT, studentController.deleteStudent);

// 모든 원생 조회
router.get("/", authenticateJWT, studentController.getStudent);

// 학생이 듣는 강의 내역 조회
router.get(
  "/:user_id/lecture",
  authenticateJWT,
  studentController.getStudentLecture
);

module.exports = router;
