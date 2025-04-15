import { Request, Response } from "express";
import Restaurant from "../models/restaurant";


const searchRestaurant = async (req: Request, res: Response) => {
    try {
        const city = req.params.city;

        // Optional query params
        const searchQuery = (req.query.searchQuery as string) || "";         // For name or cuisine search
        const selectedCuisines = (req.query.selectedCuisines as string) || ""; // Comma-separated cuisines
        const sortOption = (req.query.sortOption as string) || "lastUpdated";  // Sorting field
        const page = parseInt(req.query.page as string) || 1;                  // Pagination page number

        // Build the base MongoDB query
        let query: any = {};

        // Match restaurants where the city matches (case-insensitive)
        query["city"] = new RegExp(city, "i");

        // Check if there are any restaurants in that city
        const cityCheck = await Restaurant.countDocuments(query);
        if (cityCheck === 0) {
            return res.status(404).json({
                data: [],
                pagination: {
                    total: 0,
                    page: 1,
                    pages: 1,
                },
            });
        }

        // If cuisines are selected, filter to restaurants that serve *all* of them (case-insensitive)
        if (selectedCuisines) {
            const cuisinesArray = selectedCuisines
                .split(",")
                .map((cuisine) => new RegExp(cuisine, "i"));

            // $all = every value in cuisinesArray must be present in the restaurant's cuisines field
            query["cuisines"] = { $all: cuisinesArray };
        }

        // If searchQuery is provided, allow partial matches on restaurant name or cuisines
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, "i");

            // $or = match name OR one of the cuisines
            query["$or"] = [
                { restaurantName: searchRegex },
                { cuisines: { $in: [searchRegex] } },
            ];
        }

        // Pagination setup
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        // Run the database query with sort, skip, and limit
        const restaurants = await Restaurant.find(query)
            .sort({ [sortOption]: 1 }) // Sort ascending by the given field
            .skip(skip)
            .limit(pageSize)
            .lean();                  // Return plain JavaScript objects

        // Count the total number of matching documents for pagination
        const total = await Restaurant.countDocuments(query);

        // Send the data and pagination info as the response
        const response = {
            data: restaurants,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / pageSize), // Total pages
            },
        };

        res.json(response);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

export default {
    searchRestaurant,
};
