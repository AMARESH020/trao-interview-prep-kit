const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api";

type ApiOptions = RequestInit;

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";

    try {
      const data = await response.json();

      if (
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
      ) {
        message = data.message;
      }
    } catch {
      // Ignore non-JSON error responses.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}