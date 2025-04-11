import { Request, Response } from "express";
import mongoose from "mongoose";
import Restaurant from "../models/restaurant";
import axios from "axios";
import FormData from 'form-data';

const createMyRestaurant = async (req: Request, res: Response) => {
    try {
        const existingRestaurant = await Restaurant.findOne({ user: req.userId });

        if (existingRestaurant) {
            return res
                .status(409)
                .json({ message: "User restaurant already exists" });
        }


        const imageUrl = await uploadImage(req.file as Express.Multer.File);

        const restaurant = new Restaurant(req.body);
        restaurant.imageUrl = imageUrl;
        restaurant.user = new mongoose.Types.ObjectId(req.userId);
        restaurant.lastUpdated = new Date();
        await restaurant.save();

        res.status(201).send(restaurant);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const uploadImage = async (file: Express.Multer.File) => {
    if (!file) {
        throw new Error('No file uploaded');
    }

    const formData = new FormData();
    formData.append("UPLOADCARE_PUB_KEY", process.env.UPLOADCARE_PUBLIC_KEY!);
    formData.append("UPLOADCARE_STORE", "auto");
    formData.append("file", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
    });

    try {
        const response = await axios.post("https://upload.uploadcare.com/base/", formData, {
            headers: formData.getHeaders(), // ✅ Sets correct content-type
        });

        console.log('Uploadcare Response:', response.data);

        if (!response.data || !response.data.file) {
            throw new Error('File upload failed');
        }

        const fileUUID = response.data.file;
        return `https://ucarecdn.com/${fileUUID}/`;
    } catch (error: any) {
        console.error('Error uploading image:', error.message);
        console.error('Response Data:', error.response?.data);
        throw new Error('Uploadcare upload failed');
    }
};






export default { createMyRestaurant };
