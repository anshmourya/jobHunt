import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { createUser } from "@/apis/user";
export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    // Do something with payload
    // For this guide, log payload to console
    const { id } = evt.data;
    const eventType = evt.type;
    console.log(
      `Received webhook with ID ${id} and event type of ${eventType}`
    );

    //if user is created
    if (eventType === "user.created") {
      console.log("user");
      console.log("User created:", evt.data);
      const { id } = evt.data;
      await createUser({
        clerkId: id,
        email: evt.data.email_addresses[0].email_address,
        name: evt.data.first_name + " " + evt.data.last_name,
      });
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
