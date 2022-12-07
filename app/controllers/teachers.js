import User from '../models/User'
import Course from '../models/Course'
import { StatusCodes } from 'http-status-codes'
import { BadRequestError, UnauthenticatedError, NotFoundError } from '../errors'
//{{URL}}/teacher/courses
const getOwnerCourses = async (req, res) => {
    const userCheck = await User.findOne({ _id: req.user.userId });
    if (userCheck.permission === 'teacher') {
        const { search, limit } = req.query;
        req.body.createdBy = req.user.userId;
        const courses = await Course.find({ createdBy: req.user.userId }).sort('createdAt');
        let sortedCourses = [...courses];
        if (search) {
            sortedCourses = sortedCourses.filter((course) => {
                return course.name.startsWith(search);
            })
        }
        if (limit) {
            sortedCourses = sortedCourses.slice(0, Number(limit));
        }
        if (sortedCourses.length < 1) {
            return res.status(StatusCodes.OK).json({ msg: "No courses match your search" });
        }
        res.status(StatusCodes.OK).json({ sortedCourses, count: sortedCourses.length });
    }
    else {
        throw new UnauthenticatedError(`User have no permission`)
    }

}
//{{URL}}/teacher/courses
const createCourse = async (req, res) => {
    const userCheck = await User.findOne({ _id: req.user.userId });
    if (userCheck.permission === 'teacher') {
        req.body.createdBy = req.user.userId;
        const course = await Course.create({ ...req.body });
        res.status(StatusCodes.CREATED).json({
            course
        })
    }
    else {
        throw new UnauthenticatedError(`User have no permission`)
    }
}
// {{URL}}/teacher/courses/:id
const updateCourse = async (req, res) => {
    const userCheck = await User.findOne({ _id: req.user.userId });
    if (userCheck.permission === 'teacher') {
        const {
            user: { userId },
            params: { id: courseId },
        } = req;
        const courseCheck = await Course.findOne({ _id: courseId })
        if (courseCheck.createdBy == userId) {
            const course = await Course.findByIdAndUpdate(
                {
                    _id: courseId,
                    createdBy: userId
                },
                req.body,
                { new: true, runValidators: true }
            )
            if (!course) {
                throw new NotFoundError(`No course with id ${courseId}`)
            }
            res.status(StatusCodes.OK).json({ course })
        } else {
            throw new UnauthenticatedError("Teacher doesnt own this course");
        }
    }
    else {
        throw new UnauthenticatedError(`User have no permission`)
    }
}

// {{URL}}/teacher/courses/:id
const deleteCourse = async (req, res) => {
    const userCheck = await User.findOne({ _id: req.user.userId });
    if (userCheck.permission === 'teacher') {
        const {
            user: { userId },
            params: { id: courseId },
        } = req;
        const courseCheck = await Course.findOne({ _id: courseId })
        if (courseCheck.createdBy == userId) {
            const course = await Course.findByIdAndRemove({
                _id: courseId,
                createdBy: userId,
            })
            if (!course) {
                throw new NotFoundError(`No course with id ${courseId}`)
            }
            res.status(StatusCodes.OK).json({ msg: `Delete course ID: ${courseId} successfully ` })
        }
        else {
            throw new UnauthenticatedError("Teacher doesnt own this course");
        }
    }
    else {
        throw new UnauthenticatedError(`User have no permission`)
    }
}

export {
    getOwnerCourses,
    createCourse,
    updateCourse,
    deleteCourse,
}

//flow
/*
 khi getOwnerCourses thì sẽ lấy ra tất cả khoá học mà teacher đó đã tạo.
 khi createCourse thì sẽ tạo ra khoá học mới
 Khi updateCourse thì sẽ kiểm tra khoá học đó có phải thuộc quyền sở hữu của giảng viên đó không, nếu có thì sẽ thực hiện update khoá học
 Khi deleteCourse thì sẽ kiểm tra khoá học đó có phải thuộc quyền sở hữu của giảng viên đó không, nếu có thì sẽ thực hiện delete khoá học
*/