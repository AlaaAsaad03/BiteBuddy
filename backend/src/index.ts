import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import myUserRoute from "./routes/MyUserRoute";
import multer from "multer";
import MyRestaurantRoute from "./routes/MyRestaurantRoute";
import dotenv from 'dotenv';
dotenv.config();
console.log("Uploadcare key:", process.env.UPLOADCARE_PUBLIC_KEY);

mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING as string)
  .then(() => console.log("Connected to database!"));



const app = express();
const upload = multer();

app.use(express.json());
app.use(cors());



app.get("/health", async (req: Request, res: Response) => {
  res.send({ message: "health OK!" });
});

app.use("/api/user", myUserRoute);
app.use("/api/myrestaurant", MyRestaurantRoute)
app.listen(7000, () => {
  console.log("server started on localhost:7000");
});
