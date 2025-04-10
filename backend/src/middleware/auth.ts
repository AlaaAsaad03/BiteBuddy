import { auth } from "express-oauth2-jwt-bearer";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";



declare global {
    namespace Express {
        interface Request {
            auth0Id: string;
            userId: string;
        }
    }
}


export const jwtCheck = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});

// Middleware to parse a JWT token from the request and attach user info to the request object
export const jwtParse = async (req: Request, res: Response, next: NextFunction) => {

    // Extract the 'Authorization' header from the request
    const { authorization } = req.headers;

    // If there is no authorization header or it doesn't start with "Bearer ", reject the request
    if (!authorization || !`${authorization}`.startsWith('Bearer ')) {
        return res.sendStatus(401);
    }

    // get the token from the authorization header
    const token = authorization.split(' ')[1];

    try {

        const decoded = jwt.decode(token) as jwt.JwtPayload;

        // Get the 'sub' field from the token, which represents the Auth0 user ID
        const auth0Id = decoded.sub;

        const user = await User.findOne({ auth0Id });

        if (!user) {
            return res.sendStatus(401);
        }

        // add the user id to the request object
        req.auth0Id = auth0Id as string;
        req.userId = user._id.toString();
        next();

    } catch (error) {
        return res.sendStatus(401);
    }

}