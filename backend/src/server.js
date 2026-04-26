require("dotenv").config();

const app = require("./app");
const { prisma } = require("./config/database");

const port = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    app.listen(port, () => {
      console.log(`ClinBridge backend running on http://localhost:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
