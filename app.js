require("dotenv").config(); // Ligne 1
require("./database/connection.js"); // Ligne 2

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const userRouter = require("./routes/user.js");
const libraryGameRouter = require("./routes/library.js");
const memoryGameRouter = require("./routes/memory.js");

const app = express();

const cors = require("cors"); // Lign after const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    // Replace 'allowedOrigins' with your specific origins for production
    const allowedOrigins = ["http://localhost:4000", process.env.FRONTEND_URL];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.disable("x-powered-by");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/library", libraryGameRouter);
app.use("/memory", memoryGameRouter);

module.exports = app;
