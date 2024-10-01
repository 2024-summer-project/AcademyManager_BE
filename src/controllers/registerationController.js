const { asyncWrapper } = require("../lib/middlewares/async");
const prisma = require("../lib/prisma/index");
const { CustomError } = require("../lib/errors/customError");
const ErrorCode = require("../lib/errors/errorCode");
const { StatusCodes } = require("http-status-codes");
const { Status } = require("@prisma/client");
const crypto = require("crypto");
const { error } = require("console");

function generateInviteKey() {
  return crypto.randomBytes(16).toString("hex");
}

exports.registerAcademy = asyncWrapper(async(req, res, next) => {
    const { academy_id, academy_name, academy_email, address, phone_number } =
    req.body;

    const inviteKey = generateInviteKey();
    try {
        const newAcademy = await prisma.academy.create({
            data: {
                academy_id,
                academy_key : inviteKey,
                academy_name,
                academy_email,
                address,
                phone_number,
                status: "PENDING" // 학원의 상태를 "PENDING"로 설정합니다.
            }
        });

        res.status(StatusCodes.CREATED).json({
            message: '학원 등록이 성공적으로 완료되었습니다.',
            data: newAcademy
        });
    } catch (error) {
        if (error.code === 'P2002') { // Prisma의 unique constraint 오류 코드
            throw new CustomError(
                "이미 존재하는 학원 ID나 이메일입니다.",
                StatusCodes.DUPLICATE_ENTRY,
                StatusCodes.DUPLICATE_ENTRY
            );
        } else {
            throw new CustomError(
                "학원 등록 중 오류가 발생했습니다.",
                StatusCodes.INTERNAL_SERVER_ERROR,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
})

exports.registerUser = asyncWrapper(async(req, res, next) =>{
    const { user_id, academy_key, role } = req.body;

    try {
        //입력받은 academy_key로 academy찾기
        const searchAcademy = await prisma.academy.findUniqueOrThrow({
            where : { academy_key }
        }).catch((error) => {
            if (error.code === "P2018" || error.code === "P2025") {
                // prisma not found error code
                throw new CustomError(
                  "학원을 찾을 수 없습니다.",
                  StatusCodes.NOT_FOUND,
                  StatusCodes.NOT_FOUND
                );
              } else {
                throw new CustomError(
                  "Prisma Error occurred!",
                  ErrorCode.INTERNAL_SERVER_PRISMA_ERROR,
                  StatusCodes.INTERNAL_SERVER_ERROR
                );
              }
        })
        
        // 유효성 검사 -> User DB에 user_id가 존재하는지 검사
        if(await prisma.user.findUnique({where : {user_id:user_id, role:role}}) === null) {
            return next(new CustomError(
                "해당하는 유저가 존재하지 않습니다. 또는 역할이 잘못되었습니다.",
                StatusCodes.NOT_FOUND,
                StatusCodes.NOT_FOUND
            ));
        }
        //학원 유저 신청 목록DB에 user_id가 이미 있는지 검사
        const checkUser = await prisma.AcademyUserRegistrationList.findUnique({
            where : { user_id: user_id, role: role}
        })

        if (checkUser) {
            throw new CustomError(
                "이미 등록요청된 유저입니다.",
                StatusCodes.CONFLICT,
                StatusCodes.CONFLICT
            );
        }
        //없다면 DB에 req.body내용 추가
        const newUser = await prisma.AcademyUserRegistrationList.create({
            data: {
                user_id,
                academy_id : searchAcademy.academy_id,
                role,
                status: "PENDING"
            }
        });
        
        // 학생의 경우 부모도 등록. response할 때 부모의 user_id도 같이 보내줌.
        let parent = null;
        if (newUser.role === "STUDENT") {
            parent = await prisma.Family.findFirst({
              where: { student_id: user_id },
            });
            console.log(`parent : `);
            console.log(parent);
            if (parent) {

                // 부모가 등록되지 않은 경우에만 추가
                await prisma.AcademyUserRegistrationList.create({
                    data: {
                    user_id: parent.parent_id,
                    academy_id: searchAcademy.academy_id,
                    role: "PARENT",
                    status: "PENDING",
                    },
                });
            } 
          }
        
        const resData = {
            user_id: newUser.user_id,
            academy_id: newUser.academy_id,
            role: newUser.role,
            status: newUser.status,
            parent_id: (newUser.role === "STUDENT" && parent) ? parent.parent_id : null,
        };
        
        res.status(StatusCodes.CREATED).json({
            message: '등록요청이 성공적으로 완료되었습니다.',
            data: resData
        });
        
        
    } catch(error) {
        console.error("Error during registration: ", error.message); // 에러 메시지 출력

        throw new CustomError(
            "사용자 등록 요청 중 오류가 발생했습니다.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            StatusCodes.INTERNAL_SERVER_ERROR
        );
    }
})
exports.decideUserStatus = asyncWrapper(async (req, res, next) => {
    const { academy_id, user_id, agreed } = req.body;

    // 등록된 유저 검색
    const searchUser = await prisma.AcademyUserRegistrationList.findUnique({
        where: {
            academy_id: academy_id,
            user_id: user_id,
        },
    });

    if (!searchUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "해당하는 유저가 존재하지 않습니다." });
    }

    const newStatus = agreed ? 'APPROVED' : 'REJECTED';

    const updatedUser = await prisma.AcademyUserRegistrationList.update({
        where: {
            academy_id: academy_id,
            user_id: user_id,
        },
        data: { status: newStatus },
    });

    let parent = null;
    if (searchUser.role === "STUDENT") {
        parent = await prisma.Family.findFirst({ where: { student_id: user_id } });

        if (parent) {
            await prisma.AcademyUserRegistrationList.update({
                where: {
                    academy_id: academy_id,
                    user_id: parent.parent_id,
                },
                data: { status: newStatus },
            });
        }
    }

    const resData = {
        user_id: updatedUser.user_id,
        academy_id: updatedUser.academy_id,
        role: updatedUser.role,
        status: updatedUser.status,
        parent_id: parent ? parent.parent_id : null,
    };

    return res.status(StatusCodes.OK).json({
        message: '유저 승인/거절이 성공적으로 완료되었습니다.',
        data: resData,
    });
});


exports.listUser = asyncWrapper(async (req, res, next) => {
    const role = req.query.role;
    const academy_id = req.query.academy_id;
    
    try {
        let result;
        // 유효성검사 : 학원 존재여부 확인
        if(await prisma.academy.findUnique({where : {academy_id}}) === null) {
            return next(new CustomError(
                `id가 ${academy_id}에 해당하는 학원이 존재하지 않습니다.`,
                StatusCodes.NOT_FOUND,
                StatusCodes.NOT_FOUND
            ));
        }

        if (role === "TEACHER") {
            result = await prisma.AcademyUserRegistrationList.findMany({
                where: {
                    academy_id : academy_id,
                    role: "TEACHER",
                    status: "PENDING"
                }
            });
        } else if (role === "STUDENT") {
            result = await prisma.AcademyUserRegistrationList.findMany({
                where: {
                    academy_id : academy_id,
                    role: "STUDENT",
                    status: "PENDING"
                }
            });
        } else { // 유효하지 않은 역할일 경우
            return next(new CustomError(
                "유효하지 않은 역할입니다.",
                StatusCodes.BAD_REQUEST,
                StatusCodes.BAD_REQUEST
            ));
        }

        // 등록요청한 유저가 없을 경우
        if (!result || result.length === 0) {
            return next(new CustomError(
                "해당 조건에 맞는 사용자가 없습니다.",
                StatusCodes.NOT_FOUND,
                StatusCodes.NOT_FOUND
            ));
        }

        res.status(StatusCodes.OK).json({ data: result });

    } catch (error) {
        next(new CustomError(
            "불러오는 중에 오류가 발생했습니다.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            StatusCodes.INTERNAL_SERVER_ERROR
        ));
    }
})

exports.listAcademy = asyncWrapper(async(req, res, next) => {
    try {
        const result = await prisma.Academy.findMany({
            where : {
                status: "PENDING"
            }
        })

        if (!result || result.length === 0) {
            return next(new CustomError(
                "해당 조건에 맞는 사용자가 없습니다.",
                StatusCodes.NOT_FOUND,
                StatusCodes.NOT_FOUND
            ));
        }

        res.status(StatusCodes.OK).json({ data: result });

    } catch(error) {
        next(new CustomError(
            "아카데미 목록을 불러오는 중에 오류가 발생했습니다.",
            StatusCodes.INTERNAL_SERVER_ERROR,
            StatusCodes.INTERNAL_SERVER_ERROR
        ));
    }
})