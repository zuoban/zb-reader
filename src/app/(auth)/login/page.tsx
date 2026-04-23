"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/bookshelf";
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        login,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户名/邮箱或密码错误");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("登录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="book-card-glass overflow-hidden rounded-2xl py-5">
      <CardHeader className="relative text-center pb-2">
        <div className="liquid-hairline absolute inset-x-6 top-0 h-px" />
        <div className="flex justify-center mb-4">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <Image src="/logo.svg" alt="ZB Reader" width={88} height={88} />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">ZB Reader</CardTitle>
        <CardDescription className="text-base mt-2">
          登录后继续你的阅读进度
        </CardDescription>
        <div className="liquid-control mx-auto mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>私人 EPUB 阅读空间</span>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="login" className="text-sm font-medium">用户名或邮箱</Label>
            <Input
              id="login"
              type="text"
              placeholder="请输入用户名或邮箱"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="h-11 rounded-xl bg-background/42"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl bg-background/42"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button 
            type="submit" 
            className="top-action-primary w-full h-11 rounded-xl font-semibold" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
          <p className="text-sm text-muted-foreground">
            还没有账户？{" "}
            <Link 
              href="/register" 
              className="text-primary font-medium hover:underline transition-colors duration-200"
            >
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
