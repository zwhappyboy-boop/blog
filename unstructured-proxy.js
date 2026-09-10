/**
 * 万能工具箱 · Unstructured.io PDF 转 Word 代理 Worker
 * ------------------------------------------------------------
 * 用途：浏览器端无法直接调用 unstructured.io API（CORS 限制），
 *       通过本 Worker 中转：上传 PDF → 创建解析任务 → 轮询状态 → 下载结果。
 *
 * 部署方法（Cloudflare Workers）：
 *   1. 打开 https://dash.cloudflare.com → Workers & Pages → 创建 Worker
 *   2. 把本文件内容粘贴进 Worker 代码
 *   3. 把下方 UNSTRUCTURED_API_KEY 换成你自己的 Key（也可以改用环境变量 UNSTRUCTURED_API_KEY）
 *   4. 保存并部署，记下 Worker 域名，如 https://unstructured-proxy.你的子域.workers.dev
 *   5. 在网站 script.js 顶部把 UNSTRUCTURED_PROXY_URL 改为你的 Worker 域名
 *
 * 接口：
 *   POST /api/convert   multipart 上传 PDF → 返回 { job_id, file_id }
 *   GET  /api/status    ?job_id=xxx → 返回 { status, output_file_ids }
 *   GET  /api/download  ?job_id=xxx&file_id=xxx → 返回解析后的 JSON 元素数组
 */

const UNSTRUCTURED_API_URL = "https://platform-api.transform.unstructured.io/api/v1";
// 建议部署后在 Cloudflare Worker 设置页添加环境变量 UNSTRUCTURED_API_KEY（更安全）
// 未设置时回退到下方硬编码值
const UNSTRUCTURED_API_KEY_FALLBACK = "FoBFvxu9FnboulkI5lWMC88cm9h93W";

// 允许的跨域来源，* 表示任意站点；如需更严格可改成你的网站域名
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 创建解析任务的节点配置（vlm 分区 + 允许 fast 快速通道，兼顾精度与速度）
const JOB_NODES = JSON.stringify({
  job_nodes: [
    {
      name: "Partitioner",
      type: "partition",
      subtype: "vlm",
      settings: { is_dynamic: true, allow_fast: true },
    },
  ],
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function error(msg, status = 500) {
  return json({ error: msg }, status);
}

async function createJob(request, env) {
  // 1. 读取前端上传的 PDF
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return error("请求体不是有效的 multipart/form-data", 400);
  }
  const file = form.get("file");
  if (!file || !file.size) return error("未收到文件", 400);

  // 2. 转发给 unstructured：创建解析任务
  const apiKey = env.UNSTRUCTURED_API_KEY || UNSTRUCTURED_API_KEY_FALLBACK;
  const upstream = new FormData();
  upstream.append("request_data", JOB_NODES);
  upstream.append(
    "input_files",
    new Blob([await file.arrayBuffer()], { type: file.type || "application/pdf" }),
    file.name
  );

  const resp = await fetch(`${UNSTRUCTURED_API_URL}/jobs/`, {
    method: "POST",
    headers: { "unstructured-api-key": apiKey },
    body: upstream,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return error(data.detail || `创建任务失败（HTTP ${resp.status}）`, resp.status);
  }
  const fileId =
    (data.output_node_files && data.output_node_files[0] && data.output_node_files[0].file_id) ||
    (data.input_file_ids && data.input_file_ids[0]) ||
    null;
  return json({ job_id: data.id, file_id: fileId, status: data.status });
}

async function getStatus(url, env) {
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return error("缺少 job_id", 400);
  const apiKey = env.UNSTRUCTURED_API_KEY || UNSTRUCTURED_API_KEY_FALLBACK;
  const resp = await fetch(`${UNSTRUCTURED_API_URL}/jobs/${jobId}`, {
    headers: { "unstructured-api-key": apiKey },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return error(data.detail || `查询任务失败（HTTP ${resp.status}）`, resp.status);
  const files = (data.output_node_files || []).map((f) => f.file_id);
  return json({ job_id: data.id, status: data.status, output_file_ids: files });
}

async function download(url, env) {
  const jobId = url.searchParams.get("job_id");
  const fileId = url.searchParams.get("file_id");
  if (!jobId || !fileId) return error("缺少 job_id 或 file_id", 400);
  const apiKey = env.UNSTRUCTURED_API_KEY || UNSTRUCTURED_API_KEY_FALLBACK;
  const resp = await fetch(
    `${UNSTRUCTURED_API_URL}/jobs/${jobId}/download?file_id=${encodeURIComponent(fileId)}`,
    { headers: { "unstructured-api-key": apiKey } }
  );
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return error(t || `下载结果失败（HTTP ${resp.status}）`, resp.status);
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
      if (path === "/api/unconvert" && request.method === "POST") return createJob(request, env);
      if (path === "/api/status" && request.method === "GET") return getStatus(url, env);
      if (path === "/api/download" && request.method === "GET") return download(url, env);
      return error("Not Found", 404);
    } catch (e) {
      return error("Worker 内部错误: " + e.message, 500);
    }
  },
};