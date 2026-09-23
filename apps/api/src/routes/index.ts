import { Router } from "express";
import { authRouter } from "./auth.routes";
import { formsRouter } from "./forms.routes";
import { publicRouter } from "./public.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/forms", formsRouter);
apiRouter.use("/public", publicRouter);
