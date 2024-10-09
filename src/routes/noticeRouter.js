// noticeRouter.js
const express = require("express");
const { authenticateJWT } = require("../lib/middlewares/auth.js");
const router = express.Router();
const noticeController = require("../controllers/noticeController");
const { uploadNoticeFile } = require("../lib/middlewares/uploadFile.js");

/**
 * @swagger
 * /notice/create:
 *   post:
 *     summary: 공지 업로드
 *     description: 새로운 공지사항을 업로드합니다. 'CHIEF' 또는 'TEACHER' 권한이 필요합니다.
 *     tags: [Notice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 공지 제목
 *                 example: 코로나19로 인한 학원 운영 방침
 *               content:
 *                 type: string
 *                 description: 공지 내용
 *                 example: 코로나19로 인한 운영 방침 안내
 *               academy_id:
 *                 type: string
 *                 description: 학원 ID
 *                 example: test_academy2
 *               lecture_id:
 *                 type: integer
 *                 description: 강의 ID (전체 공지의 경우 "0")
 *                 example: 0
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 공지에 첨부할 파일
 *     responses:
 *       201:
 *         description: 공지가 성공적으로 생성되었습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 공지사항이 성공적으로 생성되었습니다.
 *                 data:
 *                   type: object
 *                   properties:
 *                     notice:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: 코로나19로 인한 학원 운영 방침
 *                         content:
 *                           type: string
 *                           example: 코로나19로 인한 운영 방침 안내
 *                         academy_id:
 *                           type: string
 *                           example: test_academy2
 *                         lecture_id:
 *                           type: integer
 *                           example: 0
 *                         user_id:
 *                           type: string
 *                           example: chief_seonu
 *                         notice_num:
 *                           type: integer
 *                           example: 5
 *                         notice_id:
 *                           type: string
 *                           example: test_academy2_0_5
 *                     files:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["코로나.jpg"]
 *       400:
 *         description: 유효한 값들이 입력되지 않았습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 유효한 값들을 입력해주세요.
 *       500:
 *         description: 파일 이동 중 오류가 발생했습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 파일 이동 중 오류가 발생했습니다.
 */

router.post(
  "/create",
  authenticateJWT("CHIEF", "TEACHER"),
  uploadNoticeFile.array("file"),
  noticeController.createNotice
);
/**
 * @swagger
 * /notice/list:
 *   get:
 *     summary: 공지 목록 조회
 *     description: 학원 및 강의에 대한 공지 목록을 조회합니다. 'CHIEF', 'TEACHER', 'PARENT', 또는 'STUDENT' 권한이 필요합니다.
 *     tags: [Notice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lecture_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 강의 ID
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *         description: 페이지 번호
 *         example: 1
 *       - in: query
 *         name: page_size
 *         required: true
 *         schema:
 *           type: integer
 *         description: 한 페이지에 표시할 공지 개수
 *         example: 10
 *     responses:
 *       200:
 *         description: 공지 목록 조회에 성공했습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 공지사항 목록 조회에 성공했습니다.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: 코로나19로 인한 학원 운영 방침
 *                       content:
 *                         type: string
 *                         example: 코로나19 예방 방침 공지합니다.
 *                       user_id:
 *                         type: string
 *                         example: chief_seonu
 *                       views:
 *                         type: integer
 *                         example: 123
 *       400:
 *         description: 유효하지 않은 파라미터가 입력되었습니다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 유효한 값들을 입력해주세요.
 */
// 공지 목록 조회
router.get(
  "/list",
  authenticateJWT("CHIEF", "TEACHER", "PARENT", "STUDENT"),
  noticeController.getNoticeList
);

module.exports = router;
