"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // 防止浏览器自动弹出安装提示
      event.preventDefault();
      // 保存事件以便稍后触发
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!installPrompt) return;

    // 显示安装提示
    await installPrompt.prompt();

    // 等待用户反馈
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  return {
    isInstallAvailable: !!installPrompt,
    isInstalled,
    installApp: handleInstallClick,
  };
}
