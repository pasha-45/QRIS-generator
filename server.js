import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "Oxz8eU0CipNGMcKz4XVpJuKQ7ySOXodc";
const PROJECT = "aspan-store";
const AUTHOR = "Aspan-Official";

// ============================
// CREATE QRIS INVOICE
// ============================
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

    res.json({
      ...data,
      author: AUTHOR,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      author: AUTHOR,
    });
  }
});

// ============================
// CHECK STATUS TRANSACTION
// ============================
app.get("/status/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!order_id) {
      return res.status(400).json({
        error: "order_id wajib diisi",
        author: AUTHOR,
      });
    }

    // Pakasir: detail transaksi
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

    // coba ambil status dari berbagai kemungkinan bentuk response
    const status =
      data?.transaction?.status ||
      data?.data?.status ||
      data?.status ||
      "pending";

    res.json({
      order_id,
      status,
      raw: data, // biar kamu bisa lihat response asli dari pakasir
      author: AUTHOR,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      author: AUTHOR,
    });
  }
});

// ============================
// HEALTH CHECK
// ============================
app.get("/", (req, res) => {
  res.json({
    message: "QRIS API running",
    author: AUTHOR,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("QRIS API running on port " + PORT));
