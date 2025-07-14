import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db";
import bodyParser from "body-parser";
import { checkSubscription, checkUserAuth } from "./middleware/check-auth";
import { admin, auth, paidUser, user } from "./routes";
import { handleStripeWebhook } from "./controllers/admin/admin-controller";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8000;
const app = express();

//Webhook Routes

app.post(
  `/webhook`,
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);
//Webhook Routes

app.use(express.json());
app.set("trust proxy", true);
app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  })
);

var dir = path.join(__dirname, "static");
app.use(express.static(dir));

var uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

connectDB();

app.get("/", (_, res: any) => {
  res.send("Hello world entry point 🚀✅");
});

// //*****************User Auth Routes**************/
app.use("/api", auth);

// //*****************User Routes******************/
app.use("/api/user", checkUserAuth, user);

app.use("/api/paid-user", checkUserAuth, checkSubscription, paidUser);

// //*****************Admin Routes******************/
app.use("/api/admin", admin);

// //*****************Stripe Test Routes*****************/
// app.get("/success-test", stripeSuccess);
// app.get("/cancel-test", stripeCancel);

// app.use("/api", checkAuth, stripe);

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
