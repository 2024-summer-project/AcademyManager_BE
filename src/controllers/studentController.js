const { asyncWrapper } = require("../lib/middlewares/async");
const prisma = require("../lib/prisma/index");
const { CustomError } = require("../lib/errors/customError");
const ErrorCode = require("../lib/errors/errorCode");
const { StatusCodes } = require("http-status-codes");

exports.deleteStudent = asyncWrapper(async (req, res, next) => {
  const { user_id } = req.params;

  //user_id가 올바르게 전달되었는지 확인
  if (!user_id || user_id.trim() === "") {
    return next(
      new CustomError(
        "유효한 user_id가 제공되지 않았습니다.",
        StatusCodes.BAD_REQUEST,
        StatusCodes.BAD_REQUEST
      )
    );
  }
  //학생 정보 조회
  const userTableStudent = await prisma.user.findUnique({
    where: {
      user_id: user_id,
    },
  });

  const registerationTableStudent =
    await prisma.AcademyUserRegistrationList.findUnique({
      where: {
        user_id: user_id,
      },
    });

  // 학생이 존재하지 않거나 학생 역할이 아닌 경우
  if (!userTableStudent || userTableStudent.role !== "STUDENT") {
    return next(
      new CustomError(
        `User DB에 ID ${user_id}에 해당하는 학생이 없습니다.`,
        StatusCodes.NOT_FOUND,
        StatusCodes.NOT_FOUND
      )
    );
  }

  if (!registerationTableStudent || registerationTableStudent.role !== "STUDENT") {
    return next(
      new CustomError(
        `AcademyUserRegistrationList DB에 ID ${user_id}에 해당하는 학생이 없습니다.`,
        StatusCodes.INTERNAL_SERVER_ERROR,
        StatusCodes.INTERNAL_SERVER_ERROR
      )
    );
  }

  //학생의 academy_id를 NULL로 업데이트
  await prisma.user.update({
    where: {
      user_id: user_id,
    },
    data: {
      academy_id: null,
    },
  });

  //AcademyUserRegistrationList에서 해당 학생 행 삭제
  await prisma.AcademyUserRegistrationList.delete({
    where: {
      user_id: user_id,
    },
  });

  // 성공 응답
  res.status(StatusCodes.OK).json({
    message: `학생 ID ${user_id}의 academy_id가 성공적으로 NULL로 설정되었고, 등록 목록에서 삭제되었습니다.`,
  });
});