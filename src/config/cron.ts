import cron from "node-cron";
import { chatModel } from "src/models/user/chat-schema";

export const startCronJobs = () => {
  // 🕛 Runs once every 24 hours (at midnight)
  cron.schedule("0 0 * * *", async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 2);

      const result = await chatModel.deleteMany({
        createdAt: { $lt: oneWeekAgo },
      });

      console.log(
        `[CRON] Deleted ${result.deletedCount} chats older than 7 days`,
      );
    } catch (error) {
      console.error("[CRON] Error deleting old chats:", error);
    }
  });

  console.log("[CRON] Chat cleanup cron started (every 10 seconds)");
};
