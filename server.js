import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" })); // ⬅️ penting biar webhook gak error

const API_KEY = "Oxz8eU0CipNGMcKz4XVpJuKQ7ySOXodc";
const PROJECT = "aspan-store";
const AUTHOR = "Aspan-Official";

/**
 * SIMPAN STATUS ORDER (memory)
 * NOTE: reset kalau Railway restart
 */
const ORDERS = {};

// ================= ROOT =================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "QRIS API ON", author: AUTHOR });
});

// ================= CREATE QRIS =================
app.post("/qris", async (req, res) => {
  try {
    const { order_id, amount } = req.body || {};

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

    // simpan awal sebagai pending
    ORDERS[order_id] = {
      status: "pending",
      created_at: new Date().toISOString(),
    };

    return res.json({ ...data, author: AUTHOR });
  } catch (err) {
    console.error("❌ CREATE QRIS ERROR:", err.message);
    return res.status(500).json({
      error: err.message,
      author: AUTHOR,
    });
  }
});

// ================= WEBHOOK PAKASIR =================
app.post("/webhook/pakasir", (req, res) => {
  try {
    const payload = req.body || {};

    console.log("📩 WEBHOOK MASUK:");
    console.log(JSON.stringify(payload, null, 2));

    const orderId =
      payload.order_id ||
      payload.transaction?.order_id ||
      payload.data?.order_id;

    const statusRaw =
      payload.status ||
      payload.transaction?.status ||
      payload.data?.status;

    const status = String(statusRaw || "").toLowerCase();

    if (orderId && ["success", "paid", "completed"].includes(status)) {
      ORDERS[orderId] = {
        status: "success",
        paid_at: new Date().toISOString(),
        raw: payload,
      };

      console.log("✅ ORDER SUCCESS:", orderId);
    }

    // ⬅️ WAJIB 200, JANGAN 500
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err.message);
    // tetap balas 200 supaya Pakasir stop retry
    return res.status(200).json({ ok: false });
  }
});

// ================= ANTI 405 (PAKASIR SERING PANGGIL GET / OPTIONS) =================
app.all("/webhook/pakasir", (req, res) => {
  return res.status(200).json({ ok: true });
});

// ================= STATUS + FALLBACK KE PAKASIR =================
app.get("/status/:order_id", async (req, res) => {
  const { order_id } = req.params;

  // 1️⃣ kalau sudah success di memory
  if (ORDERS[order_id]?.status === "success") {
    return res.json({
      order_id,
      status: "success",
      paid_at: ORDERS[order_id].paid_at,
      author: AUTHOR,
    });
  }

  // 2️⃣ fallback: cek langsung ke Pakasir (sandbox fix)
  try {
    const response = await fetch(
      "https://app.pakasir.com/api/transactiondetail",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: PROJECT,
          order_id,
          api_key: API_KEY,
        }),
      }
    );

    const data = await response.json();

    const statusRaw =
      data?.transaction?.status ||
      data?.data?.status ||
      data?.status ||
      "";

    const status = String(statusRaw).toLowerCase();

    if (["success", "paid", "completed"].includes(status)) {
      ORDERS[order_id] = {
        status: "success",
        paid_at: new Date().toISOString(),
        raw: data,
      };

      return res.json({
        order_id,
        status: "success",
        paid_at: ORDERS[order_id].paid_at,
        author: AUTHOR,
      });
    }
  } catch (err) {
    console.error("❌ FALLBACK STATUS ERROR:", err.message);
  }

  // 3️⃣ default pending
  return res.json({
    order_id,
    status: "pending",
    author: AUTHOR,
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 QRIS API running on port", PORT);
});
