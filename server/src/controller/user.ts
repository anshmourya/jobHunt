import User from "../models/user";

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
