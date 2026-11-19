const TOKEN_KEY = "p02_token";
const USER_KEY = "p02_user";

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function user() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function setSession(nextToken, nextUser) {
  if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
  if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(method, url, body) {
  const options = { method: method, headers: {} };
  const current = token();
  if (current) options.headers["Authorization"] = "Bearer " + current;
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  let response = null;
  try {
    response = await fetch(url, options);
  } catch (e) {
    throw new Error("网络连接失败，请检查本地服务是否运行");
  }
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = { message: "服务器返回内容无法解析" };
  }
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      if (location.hash !== "#/login") location.hash = "#/login";
    }
    const error = new Error(data.message || "请求失败");
    error.status = response.status;
    error.field = data.field || null;
    error.code = data.code;
    throw error;
  }
  return data;
}

function get(url) {
  return request("GET", url);
}

function post(url, body) {
  return request("POST", url, body);
}

function put(url, body) {
  return request("PUT", url, body);
}

function del(url) {
  return request("DELETE", url);
}

function download(fileName, content, mime) {
  const blob = new Blob([content], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result)); };
    reader.onerror = function () { reject(new Error("文件读取失败")); };
    reader.readAsDataURL(file);
  });
}

export default { request, get, post, put, del, download, readFileAsDataUrl, token, user, setSession, clearSession };
