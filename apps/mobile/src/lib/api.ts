import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AuthResponse,
  CreateSwingRequest,
  CreateSwingResponse,
  ListSwingsResponse,
  LoginRequest,
  RegisterRequest,
  UploadSwingRequest,
  UploadSwingResponse
} from "@swing/shared";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_TOKEN_KEY = "swing.auth.token";

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

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

export function listSwings() {
  return apiFetch<ListSwingsResponse>("/v1/swings");
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
