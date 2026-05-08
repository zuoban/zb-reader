"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Loader2 } from "lucide-react";
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
    <Card className="liquid-panel w-full overflow-hidden rounded-[2rem] py-6 shadow-2xl transition-all duration-400 ease-out">
      <CardHeader className="relative text-center pb-4">
        <div className="liquid-hairline absolute inset-x-8 top-0 h-px opacity-60" />
        <div className="flex justify-center mb-6">
          <div className="relative flex h-20 w-20 items-center justify-center transition-transform duration-500 ease-out hover:scale-105">
            <Image 
              src="/logo.svg" 
              alt="ZB Reader" 
              width={72} 
              height={72} 
              className="drop-shadow-[0_4px_12px_rgba(var(--cta-rgb),0.3)]"
            />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">ZB Reader</CardTitle>
        <CardDescription className="text-[0.95rem] mt-3 font-medium text-muted-foreground/80">
          登录后继续你的阅读进度
        </CardDescription>
        <div className="liquid-control mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold text-muted-foreground/90">
          <BookOpen className="h-4 w-4 text-[color:var(--cta)] opacity-80" />
          <span className="tracking-wide uppercase opacity-80">Personal Reading Space</span>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-4">
          {error && (
            <div className="liquid-control rounded-xl border-destructive/24 bg-destructive/8 p-3 text-sm font-medium text-destructive animate-fade-in">
              {error}
            </div>
          )}
          <div className="space-y-2.5">
            <Label htmlFor="login" className="text-xs font-bold tracking-wider text-muted-foreground uppercase ml-1">用户名或邮箱</Label>
            <Input
              id="login"
              type="text"
              placeholder="请输入用户名或邮箱"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="h-12 rounded-xl bg-background/34 border-border/45 focus:border-[color:var(--cta)]/50 focus:ring-[color:var(--cta)]/20 transition-all duration-300"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-xs font-bold tracking-wider text-muted-foreground uppercase ml-1">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-xl bg-background/34 border-border/45 focus:border-[color:var(--cta)]/50 focus:ring-[color:var(--cta)]/20 transition-all duration-300"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-5 pt-4">
          <Button 
            type="submit" 
            className="h-12 w-full rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-[color:var(--cta)]/20 transition-all duration-400 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[color:var(--cta)]/25"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
          <p className="text-sm font-medium text-muted-foreground/80">
            还没有账户？{" "}
            <Link 
              href="/register" 
              className="text-[color:var(--cta)] font-bold hover:underline transition-colors duration-200"
            >
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
