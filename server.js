import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "Oxz8eU0CipNGMcKz4XVpJuKQ7ySOXodc";
const PROJECT = "aspan-store";
const AUTHOR = "Aspan-Official";

// ROOT (buat test)
app.get("/", (req, res) => {
  res.json({ ok: true, message: "API ON", author: AUTHOR });
});

// CREATE QRIS
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

// STATUS (sementara dummy dulu biar service stabil)
app.get("/status/:order_id", (req, res) => {
  const { order_id } = req.params;

  return res.json({
    order_id,
    status: "pending",
    author: AUTHOR,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("QRIS API running on port", PORT);
});
