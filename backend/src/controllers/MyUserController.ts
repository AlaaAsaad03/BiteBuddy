import { Request, Response } from "express";
import User from "../models/user";



const createCurrentUser = async (req: Request, res: Response) => {
  try {
    const { auth0Id } = req.body;
    const existingUser = await User.findOne({ auth0Id });

    // 1. check if the user exist 
    if (existingUser) {

      // return the user object to the calling client
      return res.status(200).send();
    }

    // 2. create a new user if the it is not exist 
    const newUser = new User(req.body);
    await newUser.save();

    // 3. return the user object to the calling client
    res.status(201).json(newUser.toObject());
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const { name, addressLine1, country, city } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // 1. update the user object with the new data
    user.name = name;
    user.addressLine1 = addressLine1;
    user.country = country;
    user.city = city;

    // 2. save the updated user object to the database
    await user.save();

    // 3. return the updated user object to the calling client
    res.send(user);


  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating user" });
  }

}

export default {
  createCurrentUser,
  updateCurrentUser,
};
