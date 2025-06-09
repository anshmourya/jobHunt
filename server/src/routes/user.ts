import express from "express";
import { createUser, getMyProfile } from "../controller/user";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.post("/create-user", createUser);
router.get("/my-profile", requireAuth(), getMyProfile);

export default router;
