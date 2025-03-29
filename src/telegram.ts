import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const channelIds = [1918258764];

// Your Telegram API credentials
const apiId = Number(process.env.API_ID);

const apiHash = process.env.API_HASH as string;

// Phone number to use
const phoneNumber = process.env.PHONE_NUMBER as string;

// Store session as a string (empty for first login)
const stringSession = new StringSession(
  "1BQANOTEuMTA4LjU2LjEzOAG7fPlzmHjSfvaHioII7Lzf8XT6FHvr6y1mN2XzhVqeTRYNC2X2sAoltwxmCnStVHvQv5cI9WMFa+Fe52VMAfSua0zBqCxgORojs0LsmvdeE8s0Pd+m8ucc6Q10At/1EU9YZsIPDl05UmWed1qdvadWARuP6OBCsy6I6mevtALS2I4V5yS+Dc+t7XA9swaFp04RcjNU3MAGhRGANkbKIDrdJe6c6vakpUSUARFpeCJ+PhV/qD36+tiazY+E1rHQWvn9sjfsLQbXRA59PAwkGXD9jvnyH+uQJHEHPuqs/B631KF1I8Gv0EFy641SW5tQgYvYSumRwsSNE9miMBSDNuTHjw=="
);

const connection = () =>
  new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

const connect = async () => {
  try {
    console.log("Loading interactive example...");

    // Create the client
    const client = await connection();

    // Start the client, this will prompt for phone number and code
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () =>
        await input.text("Please enter your password (if any): "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });

    // Save the session string for future use
    console.log("You should save this string to avoid logging in again:");
    console.log(client.session.save());

    // Get information about yourself
    const me = await client.getMe();
    console.log("Successfully logged in as:", me.username || me.firstName);

    // Listen for new messages
    console.log("Listening for new messages...");

    client.addEventHandler(async (update) => {
      console.log(update.className);
      if (update.className === "UpdateNewMessage" && update.message.out) {
        // This is a message you sent
        console.log("You sent a message:", update.message.message);
      }

      if (update.className === "UpdateShortMessage") {
        console.log(update.message, update);
        // This is a message you received
        const sender = update.message.sender
          ? update.message.sender.username ||
            update.message.sender.firstName ||
            "Unknown"
          : "Unknown";

        console.log(`New message from ${sender}: ${update.message.message}`);
      }
    });

    // Keep the connection alive
    await new Promise((resolve) => {
      // This promise never resolves, keeping the script running
    });
  } catch (error) {
    console.error("Error connecting to Telegram:", error);
  }
};

const getMessages = async () => {
  const client = await connection();

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () =>
      await input.text("Please enter your password (if any): "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });

  const list = await client.getDialogs({});

  // Check the type of peer before accessing channelId
  if (list[0].message?.peerId) {
    const peerId = list[0].message.peerId;
    console.log("Peer type:", peerId.className);

    // Check if it's a channel
    if (peerId.className === "PeerChannel") {
      console.log("Channel ID:", Number(peerId.channelId));

      try {
        // Get the channel entity properly
        const channel = await client.getEntity(peerId);

        console.log(channel, "ddddddddd");

        // Now use the entity to get messages
        const messages = await client.getMessages(channel, { limit: 10 });

        console.log("Retrieved messages:", messages.length);
        messages.forEach((msg, index) => {
          console.log(
            `Message ${index + 1}:`,
            msg.message || "[No text content]"
          );
        });
      } catch (error) {
        console.error("Error getting messages:", error);
      }
    }
    // Check if it's a chat
    else if (peerId.className === "PeerChat") {
      console.log("Chat ID:", peerId.chatId);

      try {
        // Get the chat entity properly
        const chat = await client.getEntity(peerId);

        // Now use the entity to get messages
        const messages = await client.getMessages(chat, { limit: 10 });

        console.log("Retrieved messages:", messages.length);
        messages.forEach((msg, index) => {
          console.log(
            `Message ${index + 1}:`,
            msg.message || "[No text content]"
          );
        });
      } catch (error) {
        console.error("Error getting messages:", error);
      }
    }
    // Check if it's a user
    else if (peerId.className === "PeerUser") {
      console.log("User ID:", peerId.userId);

      try {
        // Get the user entity properly
        const user = await client.getEntity(peerId);

        // Now use the entity to get messages
        const messages = await client.getMessages(user, { limit: 10 });

        console.log("Retrieved messages:", messages.length);
        messages.forEach((msg, index) => {
          console.log(
            `Message ${index + 1}:`,
            msg.message || "[No text content]"
          );
        });
      } catch (error) {
        console.error("Error getting messages:", error);
      }
    }
  } else {
    console.log("No peerId found in the first dialog");
  }
};

//get unread message
const getUnreadMessages = async (channelUsernames: string[]) => {
  try {
    // Create the client
    const client = await connection();

    // Start the client
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () =>
        await input.text("Please enter your password (if any): "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });

    // First get all dialogs to find unread counts
    const dialogs = await client.getDialogs();

    for (const username of channelUsernames) {
      // Find the dialog that matches this username
      const dialog = dialogs.find(
        (d) =>
          d.entity &&
          "username" in d.entity &&
          d.entity.username === username.replace("@", "")
      );

      console.log(dialog?.unreadCount);

      if (dialog && dialog.unreadCount > 0) {
        console.log(`${username} has ${dialog.unreadCount} unread messages`);

        // Get only the unread messages
        const messages = await client.getMessages(dialog.inputEntity, {
          limit: dialog.unreadCount,
        });

        console.log(`Unread messages from ${username}:`, messages);
      } else {
        console.log(`No unread messages for ${username}`);
      }
    }
  } catch (error) {
    console.log("Error:", error);
  }
};

getUnreadMessages(["TechUprise_Updates"]);
// getMessages();

export { connect };
