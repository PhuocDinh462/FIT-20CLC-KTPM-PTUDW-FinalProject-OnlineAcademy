import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import Course from "../models/course.model";
import User from "../models/user.model";
import Lecture from "../models/lecture.model";
import FeedBack from "../models/feedback.model";
import View from "../models/view.model";
import { formatDate, fullStar, halfStar, blankStar } from "./home.controller";

// {{URL}}/courses
const getAllCourses = async (req, res) => {
  const { search, limit } = req.query;
  const courses = await Course.find({}).sort("createdAt");
  let sortedCourses = [...courses];
  if (search) {
    sortedCourses = sortedCourses.filter(course => {
      return course.name.startsWith(search);
    });
  }
  if (limit) {
    sortedCourses = sortedCourses.slice(0, Number(limit));
  }
  if (sortedCourses.length < 1) {
    return res
      .status(StatusCodes.OK)
      .json({ msg: "No courses match your search" });
  }
  res
    .status(StatusCodes.OK)
    .json({ sortedCourses, count: sortedCourses.length });
};

// {{URL}}/courses/:id
const getCourse = async (req, res, next) => {
  try {
    req.session.courseId = req.params.id;

    const course = await Course.findById({ _id: req.params.id }).lean();
    const instructor = await User.findOne({ _id: course.createdBy }).lean();
    const lecture = await Lecture.find({ createdIn: req.params.id });
    const feedbacks = course.feedbackList;

    let getUser;
    let checkCourseExists = false;
    let checkFavorites = false;
    let checkLogin = false;

    if (req.session.authUser) {
      getUser = await User.findById({
        _id: req.session.authUser._id,
      }).lean();

      for (let i = 0; i < getUser.courseList.length; i++) {
        if (getUser.courseList[i].id === req.params.id) {
          checkCourseExists = true;
          break;
        }
      }

      for (let i = 0; i < getUser.watchList.length; i++) {
        if (getUser.watchList[i].id === req.params.id) {
          checkFavorites = true;
          break;
        }
      }
      checkLogin = true;
    }

    course.updatedAt = formatDate(course.updatedAt);
    course.numberOfStudents = course.studentList.length;
    course.numberOfFeedbacks = course.feedbackList.length;

    const listOfCourses = await Course.find({
      createdBy: instructor._id,
    }).lean();
    instructor.numberOfStudents = listOfCourses.reduce(
      (a, b) => a + b.studentList.length,
      0
    );
    instructor.numberOfCourses = listOfCourses.length;

    //Get feedback list
    let feedbackList = [];
    course.ratingPoint = 0;
    for (let i = 0; i < feedbacks.length; i++) {
      const feedback = await FeedBack.findById({
        _id: feedbacks[i]._id,
      }).lean();
      const userFeedback = await User.findById({
        _id: feedback.createdBy,
      }).lean();
      let f = new Intl.DateTimeFormat("en");
      feedback.createdAt = f.format(feedback.createdAt);

      const obj = {
        feedback: feedback,
        user: userFeedback,
      };
      feedbackList = [...feedbackList, obj];

      course.ratingPoint += feedback.numberRated;
    }
    course.ratingPoint = (course.ratingPoint / feedbacks.length).toFixed(1);

    //Get lecture
    let lectureList = [];
    let totalTime = 0;
    for (let i = 0; i < lecture.length; i++) {
      totalTime += lecture[i].duration;
      const times = {
        min: (lecture[i].duration / 60).toFixed(0),
        seconds: (lecture[i].duration % 60).toFixed(0),
      };
      const obj = {
        name: lecture[i].name,
        times,
      };
      lectureList = [...lectureList, obj];
    }



    res.render("vwCourseDetails/course_details", {
      CatList: req.session.CatList,
      course,
      instructor,
      checkFavorites,
      checkCourseExists,
      checkLogin,
      firstIdLecture: lecture[0]._id,
      feedbackList: feedbackList,
      lectureList,
      inforCourse: {
        totalTime: (totalTime / 60).toFixed(0),
        lengthCourse: lecture.length,
      },
      videoOfFirstLecture: lecture[0].video,
    });
  } catch (err) {
    console.log(err.message);
    next(createError.InternalServerError(err.message));
  }
};

// {{URL}}/courses
const addFeedback = async (req, res, next) => {
  const UserID = req.session.authUser._id;
  const { idlecture } = req.params;
  const { star, content } = req.body;
  const lecture = await Lecture.findById({ _id: idlecture });
  const idcourse = lecture.createdIn;

  const a = {
    content: content,
    numberRated: star,
    createdIn: idcourse,
    createdBy: UserID,
  };

  const createFeedback = await FeedBack.create({
    content: content,
    numberRated: star,
    createdIn: idcourse,
    createdBy: UserID,
  });

  const findCourse = await Course.findById({ _id: idcourse });

  const obj = { _id: createFeedback._id };
  findCourse.feedbackList.push(obj);
  await Course.findByIdAndUpdate(
    { _id: idcourse },
    {
      feedbackList: findCourse.feedbackList,
    },
    { new: true, runValidators: true }
  );
  res.redirect(`/courses/learn/${idlecture}`);
};

const viewLecture = async (req, res, next) => {
  const UserID = req.session.authUser._id;
  const getUser = await User.findById({ _id: UserID });
  const numberLectureStudied = getUser.lectureList.length;
  const { idlecture } = req.params;
  const lecture = await Lecture.findById({ _id: idlecture }).lean();
  const courseId = lecture.createdIn;
  const thisCourse = await Course.findById({ _id: courseId }).lean();

  let checkAccount = thisCourse.studentList.some(idStudent => {
    return String(UserID) === String(idStudent.id);
  });
  if (!checkAccount) return next(createError(401));

  const lectureList = await Lecture.find({ createdIn: courseId }).lean();
  const feedbacks = thisCourse.feedbackList;

  const newView = await View.create({
    createdIn: thisCourse._id,
    createdBy: UserID,
  });

  thisCourse.viewList.push(newView);
  await Course.findByIdAndUpdate(
    { _id: thisCourse._id },
    {
      viewList: thisCourse.viewList,
    },
    { new: true, runValidators: true }
  );

  let seconds = 0;
  for (let i = 0; i < lectureList.length; i++) {
    lectureList[i].currentLectureId = idlecture;
    lectureList[i].complete = getUser.lectureList.some(e => {
      return String(e._id) === String(lectureList[i]._id);
    });
    seconds += lectureList[i].duration;
  }

  const times = {
    hours: (seconds / 3600).toFixed(0),
    min: (seconds / 60).toFixed(0),
  };

  let averageRating = 0;
  let feedbackList = [];
  let star = {
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    s5: 0,
  };
  for (let i = 0; i < feedbacks.length; i++) {
    const feedback = await FeedBack.findById({ _id: feedbacks[i]._id }).lean();
    const userFeedback = await User.findById({
      _id: feedback.createdBy,
    }).lean();
    let f = new Intl.DateTimeFormat("en");
    feedback.createdAt = f.format(feedback.createdAt);

    const obj = {
      feedback: feedback,
      user: userFeedback,
    };
    feedbackList = [...feedbackList, obj];
    let numStar = parseInt(feedback.numberRated);
    if (numStar) {
      averageRating += numStar;
      if (numStar == 1) star.s1 += 1;
      else if (numStar == 2) star.s2 += 1;
      else if (numStar == 3) star.s3 += 1;
      else if (numStar == 4) star.s4 += 1;
      else if (numStar == 5) star.s5 += 1;
    }
  }

  if (feedbacks.length > 0) {
    averageRating = (averageRating / feedbacks.length).toFixed(1);
    star.s1 = (star.s1 * 100) / feedbacks.length;
    star.s2 = (star.s2 * 100) / feedbacks.length;
    star.s3 = (star.s3 * 100) / feedbacks.length;
    star.s4 = (star.s4 * 100) / feedbacks.length;
    star.s5 = (star.s5 * 100) / feedbacks.length;
  }

  res.render("vwLectureContent/content", {
    CatList: req.session.CatList,
    course: thisCourse,
    lecture: lecture,
    rate: averageRating,
    feedbackList: feedbackList,
    lectureStudied: numberLectureStudied,
    lectureList: lectureList,
    star: star,
    times,
  });
};

export { getAllCourses, getCourse, viewLecture, addFeedback };

/* 
main flow:
Khi getAllCourses để lấy toàn bộ courses trong website.
Khi getCourse để lấy ra một course dựa trên id của nó.
*/
