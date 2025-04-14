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

const getMyRestaurant = async (req: Request, res: Response) => {
    try {
        const restaurant = await Restaurant.findOne({ user: req.userId });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.json(restaurant);

    } catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "Error fetching restaurant" });
    }
}

const updateMyRestaurant = async (req: Request, res: Response) => {
    try {
        const restaurant = await Restaurant.findOne({ user: req.userId });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        restaurant.restaurantName = req.body.restaurantName;
        restaurant.city = req.body.city;
        restaurant.country = req.body.country;
        restaurant.deliveryPrice = req.body.deliveryPrice;
        restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
        restaurant.cuisines = req.body.cuisines;
        restaurant.menuItems = req.body.menuItems;
        restaurant.lastUpdated = new Date();

        if (req.file) {
            const imageUrl = await uploadImage(req.file as Express.Multer.File);
            restaurant.imageUrl = imageUrl;
        }

        restaurant.save();
        res.status(200).send(restaurant);

    } catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "Something went wrong" });
    }
}





export default { createMyRestaurant, getMyRestaurant, updateMyRestaurant };
