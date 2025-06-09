import express from "express";
import { createUser } from "../controller/user";

const router = express.Router();

router.post("/create-user", createUser);

export default router;
