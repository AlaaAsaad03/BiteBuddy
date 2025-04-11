import exp from "constants";
import express from "express";
import MyRestaurantController from "../controllers/MyRestaurantController";
import multer from "multer";
import { jwtCheck, jwtParse } from "../middleware/auth";


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB limit

    }
});


router.post("/", jwtCheck, jwtParse, upload.single("imageFile"), MyRestaurantController.createMyRestaurant);


export default router;