import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "Oxz8eU0CipNGMcKz4XVpJuKQ7ySOXodc";
const PROJECT = "aspan-store";
const AUTHOR = "Aspan-Official";

/**
 * SIMPAN STATUS ORDER
 * sementara pakai memory
 * (kalau server restart, status reset — nanti bisa upgrade DB)
 */
const PAID_ORDERS = {};

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "QRIS API ON",
    author: AUTHOR,
  });
});

// ================= CREATE QRIS =================
app.post("/qris", async (req, res) => {
  try {
    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({
        error: "order_id dan amount wajib diisi",
        author: AUTHOR,
      });
    }

    const response = await fetch(
      "https://app.pakasir.com/api/transactioncreate/qris",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: PROJECT,
          order_id,
          amount,
          api_key: API_KEY,
        }),
      }
    );

    const data = await response.json();

    return res.json({
      ...data,
      author: AUTHOR,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      author: AUTHOR,
    });
  }
});

// ================= WEBHOOK PAKASIR =================
app.post("/webhook/pakasir", (req, res) => {
  const payload = req.body;

  console.log("📩 WEBHOOK MASUK:", payload);

  const orderId =
    payload?.order_id ||
    payload?.transaction?.order_id ||
    payload?.data?.order_id;

  const status =
    payload?.status ||
    payload?.transaction?.status ||
    payload?.data?.status;

  if (orderId && status === "success") {
    PAID_ORDERS[orderId] = {
      status: "success",
      paid_at: new Date().toISOString(),
      raw: payload,
    };

    console.log("✅ ORDER SUCCESS:", orderId);
  }

  return res.json({ ok: true });
});

// ================= CEK STATUS =================
app.get("/status/:order_id", (req, res) => {
  const { order_id } = req.params;

  if (PAID_ORDERS[order_id]) {
    return res.json({
      order_id,
      status: "success",
      paid_at: PAID_ORDERS[order_id].paid_at,
      author: AUTHOR,
    });
  }

  return res.json({
    order_id,
    status: "pending",
    author: AUTHOR,
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 QRIS API running on port", PORT);
});
