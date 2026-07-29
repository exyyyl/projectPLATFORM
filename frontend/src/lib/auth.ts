const AUTH_STORAGE_KEY = "projectplatform-authenticated";

export function grantProfileAccess() {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
}

export function revokeProfileAccess() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function hasProfileAccess() {
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}
