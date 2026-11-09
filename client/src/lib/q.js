import api from "../services/api";
export const get = (url, params) => api.get(url, { params }).then((r) => r.data.data ?? r.data);
export const send = (method, url, body, config) => api.request({ method, url, data: body, ...config }).then((r) => r.data);
