import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";
import dotenv from "dotenv";
import { parseJobPosting } from "./config/openai";
import { addJobToSheet } from "./config/spreedSheet";
import workflow from "./tools";
// Load environment variables
dotenv.config();

const channelIds = [1918258764];
const keywordRegex =
  /hiring|apply|salary|lpa|internship|job|position|experience/i;
// Your Telegram API credentials
const apiId = Number(process.env.API_ID);

const apiHash = process.env.API_HASH as string;

// Phone number to use
const phoneNumber = process.env.PHONE_NUMBER as string;

// Store session as a string (empty for first login)
const stringSession = new StringSession(process.env.TELEGRAM_SESSION);

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
    console.time("process");
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

    // Array to store all job postings
    const jobPostings: any[] = [];

    for (const username of channelUsernames) {
      try {
        // Find the dialog that matches this username
        const dialog = dialogs.find(
          (d) =>
            d.entity &&
            "username" in d.entity &&
            d.entity.username === username.replace("@", "")
        );

        console.log(`Unread count for ${username}:`, dialog?.unreadCount);

        if (dialog && dialog.unreadCount > 0) {
          console.log(`${username} has ${dialog.unreadCount} unread messages`);

          // Get only the unread messages
          const messages = await client.getMessages(dialog.inputEntity, {
            limit: dialog.unreadCount,
          });

          console.log(`Retrieved ${messages.length} messages from ${username}`);

          // Filter messages that contain job-related keywords
          const jobRelatedMessages = messages.filter((msg) => {
            const messageText = msg?.message;
            return messageText && keywordRegex.test(messageText);
          });

          console.log(
            `Found ${jobRelatedMessages.length} job-related messages from ${username}`
          );

          // Process messages in batches to avoid rate limiting
          const BATCH_SIZE = 5;
          for (let i = 0; i < jobRelatedMessages.length; i += BATCH_SIZE) {
            const batch = jobRelatedMessages.slice(i, i + BATCH_SIZE);
            let count = 0;
            // Process each message in the batch concurrently
            const batchResults = await Promise.all(
              batch.map(async (msg) => {
                try {
                  count++;
                  console.log(
                    `Processing message ${count} of ${BATCH_SIZE} in batch`
                  );
                  const jobData = await parseJobPosting(msg.message);

                  if (jobData?.isValidJob) {
                    const validJob = jobData.jobs
                      .map((job) => (job.applyLink ? job : null))
                      .filter((job) => job !== null);
                    if (validJob.length > 0) {
                      await Promise.all(
                        validJob.map((job) => workflow.invoke(job.applyLink))
                      );
                    }
                    // Add source information
                    return {
                      ...jobData,
                      source: username,
                      messageId: msg.id,
                      messageDate: new Date(msg.date * 1000).toISOString(),
                    };
                  }
                  return null;
                } catch (error) {
                  console.error(`Error parsing message ${msg.id}:`, error);
                  return null;
                }
              })
            );

            // Add valid job postings to our collection
            const validJobs = batchResults.filter((job) => job !== null);
            console.log(
              `Adding ${validJobs.length} valid job postings from batch`
            );
            jobPostings.push(...validJobs);

            console.log(
              `Processed batch: Found ${validJobs.length} valid job postings`
            );
          }

          // Mark messages as read after processing
          if (messages.length > 0) {
            try {
              await client.markAsRead(dialog.inputEntity);
              console.log(
                `Marked ${messages.length} messages as read for ${username}`
              );
            } catch (readError) {
              console.error(
                `Error marking messages as read for ${username}:`,
                readError
              );
            }
          }
        } else {
          console.log(`No unread messages for ${username}`);
        }
      } catch (channelError) {
        console.error(`Error processing channel ${username}:`, channelError);
        // Continue with other channels even if one fails
      }
    }

    // Output all job postings as JSON
    if (jobPostings.length > 0) {
      console.log("\n=== PARSED JOB POSTINGS ===");
      console.log(`Total job postings found: ${jobPostings.length}`);

      // Save all job postings to Google Sheets at once
      const saved = await addJobToSheet(jobPostings);
      if (saved) {
        console.log(
          `Successfully saved ${jobPostings.length} job postings to Google Sheets`
        );
      } else {
        console.log("Failed to save job postings to Google Sheets");
      }
    } else {
      console.log("No job postings found in unread messages");
    }

    console.timeEnd("process");
    return jobPostings;
  } catch (error) {
    console.error("Error in getUnreadMessages:", error);
    return [];
  }
};

export { connect, getUnreadMessages, getMessages };
