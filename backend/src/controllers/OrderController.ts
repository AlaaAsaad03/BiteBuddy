import Stripe from "stripe";
import { Request, Response } from "express";
import Restaurant, { MenuItemType } from "../models/restaurant";


const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE = new Stripe(
    process.env.STRIPE_API_KEY as string
);


type CheckoutSessionRequest = {
    cartItems: {
        menuItemId: string;
        name: string;
        quantity: string;
    }[];

    deliveryDetails: {
        email: string;
        name: string;
        addressLine1: string;
        city: string;
    };

    restaurantId: string;
}

const createCheckoutSession = async (req: Request, res: Response) => {

    try {
        const checkoutSessionRequest: CheckoutSessionRequest = req.body;
        const restaurant = await Restaurant.findById(checkoutSessionRequest.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        // line items are created from the cart items and the restaurant's menu items
        const lineItems = createLineItems(
            checkoutSessionRequest, restaurant.menuItems
        );

        // session is created with the line items and the delivery details
        const session = await createSession(lineItems, "Test order id", restaurant.deliveryPrice, restaurant._id.toString());

        if (!session.url) {
            return res.status(500).json({ message: "Error creating stripe session" });
        }

        // return the session URL to the frontend
        res.json({ url: session.url });



    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.raw.message });
    }
}

const createLineItems = (
    checkoutSessionRequest: CheckoutSessionRequest,
    menuItems: MenuItemType[]
) => {
    const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
        // Find the menu item in the restaurant's menu items
        const menuItem = menuItems.find((item) => item._id.toString() === cartItem.menuItemId.toString());

        if (!menuItem) {
            throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
        }

        // Create a line item for the checkout session
        const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
            price_data: {
                currency: "gbp",
                unit_amount: menuItem.price,
                product_data: {
                    name: menuItem.name,
                }
            },
            quantity: parseInt(cartItem.quantity),
        }
        return line_item;
    })
    return lineItems;
}

const createSession = async (
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
    orderId: string,
    deliveryPrice: number,
    restaurantId: string
) => {
    const sessionData = await STRIPE.checkout.sessions.create({
        line_items: lineItems,
        shipping_options: [
            {
                shipping_rate_data: {
                    display_name: "Delivery",
                    type: "fixed_amount",
                    fixed_amount: {
                        amount: deliveryPrice,
                        currency: "gbp",
                    },
                },
            },
        ],
        mode: "payment",
        metadata: {
            orderId,
            restaurantId,
        },
        success_url: `${FRONTEND_URL}/order-status?success=true`,
        cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
    });

    return sessionData;
};




export default { createCheckoutSession }

