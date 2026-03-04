import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DEVICE_ID_KEY = "zb-reader-device-id"

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server"

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return ""

  const ua = navigator.userAgent

  if (/iPhone/.test(ua)) return "iPhone"
  if (/iPad/.test(ua)) return "iPad"
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return "Android Phone"
    return "Android Tablet"
  }
  if (/Mac/.test(ua)) return "Mac"
  if (/Windows/.test(ua)) return "Windows"
  if (/Linux/.test(ua)) return "Linux"

  return "Unknown Device"
}
