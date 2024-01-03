const mongoose = require("mongoose").default;
const connectionString = process.env.DB_CONNECTION_STRING;

const connectToDB = () => {
  mongoose
    .connect(connectionString, { connectTimeoutMS: 2000 })
    .then(() => console.log("Successfully connected to the database ! 🥳"))
    .catch((error) => console.error("Error connecting to DB: ", error));
};

connectToDB();
