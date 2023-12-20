require("dotenv").config(); // Ligne 1
require("./database/connection.js"); // Ligne 2

var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth.js");
var libraryGameRouter = require("./routes/library.js");
var memoryGameRouter = require("./routes/memory.js");

var app = express();

var cors = require("cors"); // Lign after var app = express();

var corsOptions = {
	origin: function (origin, callback) {
		// Replace 'allowedOrigins' with your specific origins for production
		const allowedOrigins = ["http://localhost:4000", process.env.FRONTEND_URL];
		if (allowedOrigins.includes(origin) || !origin) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
	methods: ["GET", "POST", "PUT", "DELETE"],
};

app.use(cors(corsOptions));
app.disable("x-powered-by");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/library", libraryGameRouter);
app.use("/memory", memoryGameRouter);

module.exports = app;
