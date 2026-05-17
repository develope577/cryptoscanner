import { Router } from "express";
import { getAll, get } from "../engine/store.js";

const router = Router();

router.get("/symbols", (_req, res) => {
  res.json(getAll());
});

router.get("/symbols/:symbol", (req, res) => {
  const state = get(req.params.symbol!.toUpperCase());

  if (!state) {
    res.status(404).json({ error: "Symbol not found" });
    return;
  }

  res.json(state);
});

export default router;
