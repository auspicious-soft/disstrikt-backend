import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import * as crypto from "crypto"; // Signature verify ke liye

if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = crypto.webcrypto;
}

import { fileURLToPath } from "url";
import connectDB from "./config/db";
import {
  checkAdminAuth,
  checkSubscription,
  checkUserAuth,
} from "./middleware/check-auth";
import { admin, auth, paidUser, user } from "./routes";
import {
  handleStripeWebhook,
  rawBodyMiddleware,
} from "./controllers/admin/plan-setting-controller";
import { initializeFirebase } from "./utils/FCM/fcm";
import { planServices } from "./services/admin/admin-services";
import { decodeSignedPayload } from "./utils/helper";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8000;
const app = express();

initializeFirebase();

//Webhook Routes

app.post(
  `/webhook`,
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.post("/in-app-android", rawBodyMiddleware, async (req: any, res: any) => {
  try {
    const bodyBuffer = req.body as Buffer;
    if (bodyBuffer.length === 0) return res.status(400).send("Empty body");

    const bodyStr = bodyBuffer.toString("utf8");
    // console.log("Full body string:", bodyStr);

    let rtdnPayload: any;

    // Parse body as JSON
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(bodyStr);
    } catch (e) {
      // console.error("JSON parse error:", e);
      return res.status(400).send("Invalid JSON");
    }

    // Check if it's Pub/Sub wrapped (has 'message.data' as base64)
    if (parsedBody.message && parsedBody.message.data) {
      // console.log("Pub/Sub wrapped detected");
      const encodedData = parsedBody.message.data;
      const rtdnJson = Buffer.from(encodedData, "base64").toString("utf8");
      rtdnPayload = JSON.parse(rtdnJson);
    } else {
      // Direct RTDN (test or direct delivery)
      // console.log("Direct RTDN detected");
      rtdnPayload = parsedBody; // Direct use karo
    }

    // console.log("Final RTDN payload:", rtdnPayload); // {version: '1.0', packageName: '...', subscriptionNotification: {...}}

    // Verification (purchaseDataSignature pe, if present)
    if (rtdnPayload.subscriptionNotification) {
      const subNotif = rtdnPayload.subscriptionNotification;
      if (subNotif.oneoff) {
        const purchaseData = subNotif.oneoff.purchaseData;
        const signature = subNotif.oneoff.purchaseDataSignature;
        if (purchaseData && signature) {
          const publicKey = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8vVipthABb2jstNhGdbZEFl7DA5zoNpN6zSZzE8yShI0xKbN/sl4GkD7L0XAdahYuwCEZ1YGuWMwisMSN8QoVYOCB7JdoNpc7IPvA8Iaox9RUBmwzB77AX88KQCVSI/hpKJMjOe/SL//Zd2Qvrukll7E/6olYrkQleIhbLhvz+B6mO5MLHAzWUv83GFGoXGoUJAgstl2nmclx4HwucuSflcWxpBEx2oaVjaC3lnPjk1L/w+3UJSHQYlSfyzsb2zOGWGoll6+WmZZ/EigqRxbP41B2QybF+cJkhcbmHsAMA9mVHhJwbJ5m/jh2JbhM51FsfYX2hoZKm/mOMSFm6fYHwIDAQAB\n-----END PUBLIC KEY-----`; // Replace with actual
          const verified = crypto
            .createVerify("SHA1")
            .update(purchaseData)
            .verify(publicKey, signature, "base64");
          // console.log("Signature verified:", verified ? "Yes" : "No");
          if (!verified) return res.status(400).send("Invalid signature");
        }
      }
    }

    // Process karo
    await planServices.handleInAppAndroidWebhook(rtdnPayload, req);

    res.status(200).send("OK");
  } catch (err) {
    console.error("Error:", err);
    res.status(200).send("OK");
  }
});

app.post(
  "/in-app-ios",
  rawBodyMiddleware,
  async (req: Request, res: Response) => {
    try {
      const bodyBuffer = req.body as Buffer;
      if (bodyBuffer.length === 0) return res.status(400).send("Empty body");
      const bodyStr = bodyBuffer.toString("utf8");
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(bodyStr);
      } catch (e) {
        return res.status(400).send("Invalid JSON");
      }
      const { signedPayload } = parsedBody;
      if (!signedPayload) {
        console.log("⚠️ No signedPayload in request");
        return res.sendStatus(200);
      }
      const decodedOuter = await decodeSignedPayload(signedPayload);
      await planServices.handleInAppIOSWebhook(decodedOuter, req, res);
      res.status(200).send("OK");
    } catch (err) {
      console.error("Error:", err);
      res.status(200).send("OK");
    }
  }
);

app.use(express.json());
app.set("trust proxy", true);
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
app.use("/api/admin", checkAdminAuth, admin);

// //*****************Stripe Test Routes*****************/
// app.get("/success-test", stripeSuccess);
// app.get("/cancel-test", stripeCancel);

// app.use("/api", checkAuth, stripe);

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
