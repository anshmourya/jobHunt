import Axios, { AxiosRequestConfig } from "axios";

export const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;

const defaultAxios = Axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-type": "application/json",
  },
});

defaultAxios.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

/**
 * Fetches an authentication token from the server.
 *
 * @returns {Promise<string | null>} A promise that resolves to the authentication token if successful, or null if an error occurs.s
 */
async function getAuthToken() {
  try {
    const response = await fetch("/api/auth");
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

export async function apiClient(
  method: string,
  url: string,
  options: AxiosRequestConfig<unknown> = {}
) {
  const { data = {}, headers = {}, params = {}, ...rest } = options;
  const token = await getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return defaultAxios({
    url,
    data,
    method,
    params,
    headers,
    ...rest,
  });
}

export function apiClientPrelogin(
  method: string,
  url: string,
  options: AxiosRequestConfig<unknown> = {}
) {
  const { data = {}, headers = {}, params = {}, ...rest } = options;
  return defaultAxios({
    url,
    data,
    method,
    params,
    headers,
    ...rest,
  });
}

export const apis = {
  get: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClient("get", url, args),
  post: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClient("post", url, args),
  put: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClient("put", url, args),
  patch: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClient("patch", url, args),
  delete: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClient("delete", url, args),
  postPrelogin: (url: string, args?: AxiosRequestConfig<unknown>) =>
    apiClientPrelogin("post", url, args),
};
