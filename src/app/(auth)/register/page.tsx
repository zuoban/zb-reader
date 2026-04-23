"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }

      // Auto login after registration
      const result = await signIn("credentials", {
        login: username,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/bookshelf");
        router.refresh();
      }
    } catch {
      setError("注册失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="book-card-glass overflow-hidden rounded-2xl py-5">
      <CardHeader className="relative text-center pb-2">
        <div className="liquid-hairline absolute inset-x-6 top-0 h-px" />
        <div className="flex justify-center mb-4">
          <div className="liquid-control flex h-16 w-16 items-center justify-center rounded-2xl">
            <Image src="/logo.svg" alt="ZB Reader" width={48} height={48} />
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">ZB Reader</CardTitle>
        <CardDescription className="text-base mt-2">
          创建账号，开始你的阅读收藏
        </CardDescription>
        <div className="liquid-control mx-auto mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span>同步进度与个人书架</span>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="2-20 个字符"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={20}
              className="h-11 rounded-xl bg-background/42"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl bg-background/42"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少 6 个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-xl bg-background/42"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            注册
          </Button>
          <p className="text-sm text-muted-foreground">
            已有账户？{" "}
            <Link 
              href="/login" 
              className="text-primary font-medium hover:underline transition-colors duration-200"
            >
              去登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
