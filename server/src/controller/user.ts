import { getAuth } from "@clerk/express";
import User from "../models/user";
import { setProfilePercentage } from "../helper/utils";

export const createUser = async (req: any, res: any) => {
  try {
    const { clerkId, name, email } = req.body;
    if (!clerkId || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await User.create({
      clerkId,
      personalInfo: { name, email },
    });
    res.status(201).json({ message: "User created successfully", data: user });
  } catch (error) {
    res.status(500).json({ error: error as string });
  }
};

export const getMyProfile = async (req: any, res: any) => {
  try {
    const userId = getAuth(req).userId;
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User found", data: user });
  } catch (error) {
    res.status(500).json({ error: error as string });
  }
};

export const updateProfile = async (req: any, res: any) => {
  try {
    const userId = getAuth(req).userId;
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let percentage = setProfilePercentage(req.body);
    user.set({
      ...req.body,
      profileCompletedPercentage: percentage,
    });
    await user.save();
    res.status(200).json({ message: "User updated successfully", data: user });
  } catch (error) {
    res.status(500).json({ error: error as string });
  }
};
