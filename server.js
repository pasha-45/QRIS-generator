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
// HELPERS
// ============================
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: "Invalid JSON response" };
  }

  return { ok: res.ok, statusCode: res.status, data };
}

function pickStatus(data) {
  // coba cari status di beberapa kemungkinan struktur response
  return (
    data?.transaction?.status ||
    data?.payment?.status ||
    data?.data?.status ||
    data?.status ||
    null
  );
}

// ============================
// ROOT
// ============================
app.get("/", (req, res) => {
  res.json({ message: "QRIS API running", author: AUTHOR });
});

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

    const response = await postJSON(
      "https://app.pakasir.com/api/transactioncreate/qris",
      {
        project: PROJECT,
        order_id,
        amount,
        api_key: API_KEY,
      }
    );

    res.json({
      ...response.data,
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

    // beberapa endpoint kemungkinan untuk detail/status
    const endpointsToTry = [
      "https://app.pakasir.com/api/transactiondetail",
      "https://app.pakasir.com/api/transactiondetail/qris",
      "https://app.pakasir.com/api/transactionstatus",
      "https://app.pakasir.com/api/transactioncheck",
    ];

    let lastRaw = null;
    let finalStatus = null;
    let usedEndpoint = null;

    for (const url of endpointsToTry) {
      const resp = await postJSON(url, {
        project: PROJECT,
        order_id,
        api_key: API_KEY,
      });

      lastRaw = resp.data;

      const st = pickStatus(resp.data);
      if (st) {
        finalStatus = st;
        usedEndpoint = url;
        break;
      }
    }

    // kalau tetap tidak ketemu status
    if (!finalStatus) {
      finalStatus = "pending";
    }

    res.json({
      order_id,
      status: String(finalStatus).toLowerCase(),
      endpoint_used: usedEndpoint,
      raw: lastRaw,
      author: AUTHOR,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      author: AUTHOR,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("QRIS API running on port " + PORT));
