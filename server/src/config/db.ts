import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!, {
      dbName: process.env.MONGO_DB,
    });
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export default connectDB;
