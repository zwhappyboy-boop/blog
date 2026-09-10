/**
 * 万能工具箱 · Adobe PDF Services PDF 转 Word 代理 Worker
 * ------------------------------------------------------------
 * 用途：浏览器端无法直接调用 Adobe PDF Services API（CORS 限制 + 密钥安全），
 *       通过本 Worker 中转完整流程：获取Token → 申请上传地址 → 上传PDF → 创建任务 → 轮询 → 下载
 *
 * 部署方法（Cloudflare Workers）：
 *   1. 打开 https://dash.cloudflare.com → Workers & Pages → 选中已有 Worker（autumn-leaf-63f4）
 *   2. Edit code → 全选删除 → 粘贴本文件内容 → Deploy
 *   3. 在 Worker Settings → Variables 中添加：
 *      ADOBE_CLIENT_ID     = 你的 Client ID
 *      ADOBE_CLIENT_SECRET = 你的 Client Secret
 *   4. 如果不设置环境变量，会回退到下方硬编码值
 *
 * 前端接口：
 *   POST /api/convert    multipart 上传 PDF → 返回 { jobId }（轮询用）
 *   GET  /api/status     ?jobId=xxx → 返回 { status, downloadUrl }
 *   GET  /api/download?url=xxx → 代理下载结果文件（避免 CORS）
 */

// === Adobe 凭证配置 ===
// 建议在 Cloudflare Worker Settings → Variables 中添加环境变量
// 未设置环境变量时回退到下方硬编码值
const ADOBE_CLIENT_ID_FALLBACK = "b1790a8951a647819afaa1c62d9577ea";
const ADOBE_CLIENT_SECRET_FALLBACK = "p8e-yIOhpPoJ-4vIv8ztKl59_eeGfPIuTnqW";

const ADOBE_API_BASE = "https://pdf-services.adobe.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function error(msg, status = 500) {
  return json({ error: msg }, status);
}

// Token 缓存（Worker 全局变量，同一实例内复用）
let _cachedToken = null;
let _tokenExpire = 0;

async function getAccessToken(env) {
  const now = Date.now();
  if (_cachedToken && now < _tokenExpire - 60000) {
    return _cachedToken;
  }

  const clientId = env.ADOBE_CLIENT_ID || ADOBE_CLIENT_ID_FALLBACK;
  const clientSecret = env.ADOBE_CLIENT_SECRET || ADOBE_CLIENT_SECRET_FALLBACK;

  if (!clientId || !clientSecret) {
    throw new Error("Adobe 凭证未配置（请在 Worker Settings 中设置 ADOBE_CLIENT_ID 和 ADOBE_CLIENT_SECRET）");
  }

  const resp = await fetch(`${ADOBE_API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `获取Token失败（HTTP ${resp.status}）`);
  }

  _cachedToken = data.access_token;
  _tokenExpire = now + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

/**
 * POST /api/convert — 完整流程：上传PDF → 创建导出任务 → 返回轮询地址
 * 前端只需调用一次，传入 PDF 文件，返回 jobId
 */
async function convert(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return error("请求体不是有效的 multipart/form-data", 400);
  }
  const file = form.get("file");
  if (!file || !file.size) return error("未收到文件", 400);

  const token = await getAccessToken(env);
  const clientId = env.ADOBE_CLIENT_ID || ADOBE_CLIENT_ID_FALLBACK;

  // 1. 申请预签名上传 URL
  const presignResp = await fetch(`${ADOBE_API_BASE}/assets`, {
    method: "POST",
    headers: {
      "X-API-Key": clientId,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mediaType: "application/pdf" }),
  });
  const presignData = await presignResp.json().catch(() => ({}));
  if (!presignResp.ok || !presignData.uploadUri || !presignData.assetID) {
    return error(presignData.error || `申请上传地址失败（HTTP ${presignResp.status}）`, presignResp.status);
  }

  // 2. 上传 PDF 到 Adobe S3 存储
  const fileBuffer = await file.arrayBuffer();
  const upResp = await fetch(presignData.uploadUri, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: fileBuffer,
  });
  if (!upResp.ok) {
    return error(`上传PDF失败（HTTP ${upResp.status}）`, upResp.status);
  }

  // 3. 创建导出任务（PDF → DOCX）
  const jobResp = await fetch(`${ADOBE_API_BASE}/operation/exportpdf`, {
    method: "POST",
    headers: {
      "X-API-Key": clientId,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assetID: presignData.assetID,
      targetFormat: "docx",
    }),
  });

  if (jobResp.status !== 201) {
    const jobErr = await jobResp.json().catch(() => ({}));
    return error(jobErr.error || `创建任务失败（HTTP ${jobResp.status}）`, jobResp.status);
  }

  // 从 location 头提取轮询 URL
  const location = jobResp.headers.get("location");
  if (!location) {
    return error("创建任务成功但未返回轮询地址", 500);
  }

  return json({ jobId: location });
}

/**
 * GET /api/status?jobId=xxx — 轮询任务状态
 * 返回 { status, downloadUrl }
 */
async function getStatus(url, env) {
  const location = url.searchParams.get("jobId");
  if (!location) return error("缺少 jobId 参数", 400);

  const token = await getAccessToken(env);
  const clientId = env.ADOBE_CLIENT_ID || ADOBE_CLIENT_ID_FALLBACK;

  const resp = await fetch(location, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-api-key": clientId,
    },
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return error(data.error || `查询任务状态失败（HTTP ${resp.status}）`, resp.status);
  }

  // Adobe 状态：in progress / done / failed
  const status = data.status || "unknown";
  let downloadUrl = null;

  if (status === "done" && data.asset && data.asset.downloadUri) {
    downloadUrl = data.asset.downloadUri;
  }

  return json({ status, downloadUrl });
}

/**
 * GET /api/download?url=xxx — 代理下载结果文件（避免 CORS）
 */
async function downloadFile(url, env) {
  const fileUrl = url.searchParams.get("url");
  if (!fileUrl) return error("缺少 url 参数", 400);

  const resp = await fetch(fileUrl);
  if (!resp.ok) {
    return error(`下载失败（HTTP ${resp.status}）`, resp.status);
  }
  const contentType = resp.headers.get("content-type") || "application/octet-stream";
  const body = await resp.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": contentType },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/convert" && request.method === "POST") return await convert(request, env);
      if (path === "/api/status" && request.method === "GET") return await getStatus(url, env);
      if (path === "/api/download" && request.method === "GET") return await downloadFile(url, env);
      return error("Not Found", 404);
    } catch (e) {
      return error("Worker 内部错误: " + (e.message || e.toString()), 500);
    }
  },
};
