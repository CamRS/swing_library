import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type {
  AuthResponse,
  CreateSwingRequest,
  CreateSwingResponse,
  ListSwingAnalysesResponse,
  ListSwingFrameTagsResponse,
  ListSharedSwingsResponse,
  ListSwingsResponse,
  LoginRequest,
  RequestSwingAnalysisRequest,
  RequestSwingAnalysisResponse,
  RegisterRequest,
  UploadSwingRequest,
  UploadSwingResponse,
  UpsertSwingFrameTagsRequest,
  UpsertSwingFrameTagsResponse
} from "@swing/shared";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_TOKEN_KEY = "swing.auth.token";
const API_BASE_CANDIDATES = Array.from(
  new Set([
    API_BASE_URL,
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    ...(Platform.OS === "android" ? ["http://10.0.2.2:4000"] : [])
  ])
);
const API_FETCH_TIMEOUT_MS = 4000;
const LOCAL_HOST_ALIASES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "minio",
  "host.docker.internal"
]);
let resolvedApiBaseUrl = API_BASE_URL;

export async function getAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string) {
  return AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken() {
  return AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const bases = API_BASE_CANDIDATES;
  let lastNetworkError: Error | null = null;

  for (const base of bases) {
    let response: Response;
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS)
      : null;

    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        signal: controller?.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {})
        }
      });
    } catch (err) {
      if (timeoutId != null) {
        clearTimeout(timeoutId);
      }
      const message = err instanceof Error ? err.message : String(err);
      lastNetworkError = new Error(
        `Network request failed (${base}${path}): ${message}`
      );
      continue;
    }

    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }

    resolvedApiBaseUrl = base;

    if (!response.ok) {
      const text = await response.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json?.message) {
            throw new Error(json.message);
          }
        } catch {
          throw new Error(text);
        }
      }

      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  throw lastNetworkError ?? new Error(`Network request failed (${path})`);
}

function normalizePreviewUrl(previewUrl: string) {
  const extractHost = (value: string) => {
    const protocolIndex = value.indexOf("://");
    const withoutProtocol =
      protocolIndex >= 0 ? value.slice(protocolIndex + 3) : value;
    const hostAndPath = withoutProtocol.split("/")[0] ?? "";
    const host = hostAndPath.split(":")[0] ?? "";
    return host.toLowerCase();
  };

  const replaceHost = (value: string, nextHost: string) => {
    const protocolIndex = value.indexOf("://");
    if (protocolIndex < 0) {
      return value;
    }

    const protocol = value.slice(0, protocolIndex);
    const withoutProtocol = value.slice(protocolIndex + 3);
    const slashIndex = withoutProtocol.indexOf("/");
    if (slashIndex < 0) {
      return `${protocol}://${nextHost}`;
    }

    const hostAndPort = withoutProtocol.slice(0, slashIndex);
    const suffix = withoutProtocol.slice(slashIndex);
    const colonIndex = hostAndPort.indexOf(":");
    const port = colonIndex >= 0 ? hostAndPort.slice(colonIndex) : "";
    return `${protocol}://${nextHost}${port}${suffix}`;
  };

  try {
    const mediaHost = extractHost(previewUrl);
    const apiHost = extractHost(resolvedApiBaseUrl);
    const isContainerHost =
      mediaHost === "minio" || mediaHost === "host.docker.internal";

    if (!LOCAL_HOST_ALIASES.has(mediaHost)) {
      return previewUrl;
    }

    if (!isContainerHost && LOCAL_HOST_ALIASES.has(apiHost)) {
      return previewUrl;
    }

    return replaceHost(previewUrl, apiHost);
  } catch {
    return previewUrl;
  }
}

export function registerUser(payload: RegisterRequest) {
  return apiFetch<AuthResponse>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload: LoginRequest) {
  return apiFetch<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function requestSwingUpload(payload: UploadSwingRequest) {
  return apiFetch<UploadSwingResponse>("/v1/swings/uploads", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createSwing(payload: CreateSwingRequest) {
  return apiFetch<CreateSwingResponse>("/v1/swings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listSwings() {
  const response = await apiFetch<ListSwingsResponse>("/v1/swings");
  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      previewUrl: normalizePreviewUrl(item.previewUrl)
    }))
  };
}

export async function listSharedSwings(ownerId?: string) {
  const params = new URLSearchParams();
  if (ownerId) {
    params.set("ownerId", ownerId);
  }

  const query = params.toString();
  const response = await apiFetch<ListSharedSwingsResponse>(
    `/v1/swings/shared${query ? `?${query}` : ""}`
  );

  return {
    ...response,
    items: response.items.map((item) => ({
      ...item,
      previewUrl: normalizePreviewUrl(item.previewUrl)
    }))
  };
}

export function upsertSwingFrameTags(
  swingId: string,
  payload: UpsertSwingFrameTagsRequest
) {
  return apiFetch<UpsertSwingFrameTagsResponse>(
    `/v1/swings/${swingId}/frame-tags`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
}

export function listSwingFrameTags(swingId: string) {
  return apiFetch<ListSwingFrameTagsResponse>(`/v1/swings/${swingId}/frame-tags`);
}

export function requestSwingAnalysis(
  swingId: string,
  payload: RequestSwingAnalysisRequest = {}
) {
  return apiFetch<RequestSwingAnalysisResponse>(`/v1/swings/${swingId}/analysis`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listSwingAnalyses(swingId: string) {
  return apiFetch<ListSwingAnalysesResponse>(`/v1/swings/${swingId}/analysis`);
}

export async function uploadToSignedUrl(
  uploadUrl: string,
  fileUri: string,
  headers?: Record<string, string>
) {
  return FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: "PUT",
    headers
  });
}
