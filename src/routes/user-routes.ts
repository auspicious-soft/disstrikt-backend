import { Router } from "express";
import { userMoreInfo } from "src/controllers/auth-controller";

// Code
const router = Router();

router.post("/user-more-info", userMoreInfo);

//============================== ADMIN Routes
export { router };