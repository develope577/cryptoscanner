import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import symbolsRouter from "./symbols.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(symbolsRouter);

export default router;
