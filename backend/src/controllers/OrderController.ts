import Stripe from "stripe";
import { Request, Response } from "express";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";


const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
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

        // new order is created with the restaurant, user, status, delivery details, and cart items
        const newOrder = new Order({
            restaurant: restaurant,
            user: req.userId,
            status: "placed",
            deliveryDetails: checkoutSessionRequest.deliveryDetails,
            cartItems: checkoutSessionRequest.cartItems,
            createdAt: new Date(),
        });

        // line items are created from the cart items and the restaurant's menu items
        const lineItems = createLineItems(
            checkoutSessionRequest, restaurant.menuItems
        );

        // session is created with the line items and the delivery details
        const session = await createSession(lineItems, newOrder._id.toString(), restaurant.deliveryPrice, restaurant._id.toString());

        if (!session.url) {
            return res.status(500).json({ message: "Error creating stripe session" });
        }

        await newOrder.save();
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

const stripeWebhookHandler = async (req: Request, res: Response) => {

    let event;

    try {

        // Check if the request is a Stripe webhook event(This protects against fake webhook calls)
        const sig = req.headers["stripe-signature"];
        event = STRIPE.webhooks.constructEvent(
            req.body,
            sig as string,
            STRIPE_ENDPOINT_SECRET
        );

    } catch (error: any) {
        console.log(error);
        return res.status(400).send(`Webhook error: ${error.message}`);
    }

    // Handle only the checkout session completion event
    if (event.type === "checkout.session.completed") {
        // Get the order ID from Stripe metadata
        const order = await Order.findById(event.data.object.metadata?.orderId);

        if (!order) {
            return res.status(404).send("Order not found");
        }

        //Update order details from the Stripe event
        order.totalAmount = event.data.object.amount_total;
        order.status = "paid";

        await order.save();
    }

    res.status(200).send();

}





export default { createCheckoutSession, stripeWebhookHandler };

