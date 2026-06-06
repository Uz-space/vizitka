import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(uploadRouter);

export default router;
