import mongoose from "mongoose";
import Topic from "./topic.model"
const CourseSchema = new mongoose.Schema(
  {
    //required: name, typeOf, price
    name: {
      type: String,
      required: [true, "Please provide Course name"],
      maxlength: 100,
      trim: true,
      unique: true,
    },
    briefDescription: {
      type: String,
      trim: true,
    },
    detailDescription: {
      type: String,
      trim: true,
    },
    // status: {
    //     type: String,
    //     enum: ['in progress', 'completed'],
    //     default: 'in progress',
    //     trim: true,
    // },
    image: {
      type: String,
      default: "./default.png",
    },
    studentList: {
      type: Array,
      default: [],
    },
    viewList: {
      type: Array,
      default: [],
    },
    ratingList: {
      type: Array,
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating must be above 0.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    price: {
      type: Number,
      required: [true, "Please provide price of Course"],
    },
    //mỗi khi feedback sẽ lưu một object có id ,name, content
    feedback: {
      type: Array,
      default: [],
    },
    // category: {
    //   type: mongoose.Types.ObjectId,
    //   ref: "CourseCategory",
    //   required: [true, "Please provide category of course"],
    // },
    languageId: {
      type: mongoose.Types.ObjectId,
      ref: "CourseLanguage",
      required: [true, "Please provide language of course"],
    },
    languageName: {
      type: String,
      ref: "CourseLanguage",
      required: [true, "Please provide language name"],
    },

    categoryId: {
      type: mongoose.Types.ObjectId,
      ref: "CourseCategory",
      required: [true, "Please provide category of course"],
    },
    categoryName: {
      type: String,
      ref: "CourseLanguage",
      required: [true, "Please provide category's id"],
    },
    topic: {
      type: Array,
      default: [],
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide user"],
    },
  },
  { timestamps: true }
); // timestamps -> key createdAt, updatedAt

CourseSchema.pre("deleteOne", function (next) {
  const courseID = this.getQuery()["_id"];
  Topic.deleteMany({ createdIn: courseID }, function (err, result) {
    if (err) {
      next(err);
    }
    next();
  })
})
export default mongoose.model("Course", CourseSchema);

/*
model sẽ có: name, category, description, status( của khoá học ), image, studentList(danh sách sinh viên đăng ký),createdBy( lưu id của giáo viên tạo khoá học)
            rating, ratingList(danh sách sinh viên đã rating và điểm rating), price, feedback(danh sách sinh viên đã feedback, nội dung feedback)
*/
