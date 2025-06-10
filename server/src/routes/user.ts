import express from "express";
import { createUser, getMyProfile, updateProfile } from "../controller/user";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/create-user", createUser);
router.get("/my-profile", requireAuth(), getMyProfile);
router.put("/update-profile", requireAuth(), updateProfile);

export default router;
