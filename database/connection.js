const mongoose = require("mongoose");
const connectionString = process.env.DB_CONNECTION_STRING;

const connectToDB = async () => {
	try {
		await mongoose.connect(connectionString, { connectTimeoutMS: 2000 });
		console.log("Successfully connected to the database ! 🥳");
	} catch (error) {
		console.error("Error connecting to DB: ", error);
	}
};

connectToDB();
