"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
    <Card className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-all duration-300">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <span className="font-heading text-3xl font-bold italic">Z</span>
          </div>
        </div>
        <CardTitle className="font-heading text-3xl font-bold tracking-tight text-foreground">ZB Reader</CardTitle>
        <CardDescription className="text-sm mt-2 font-medium text-muted-foreground">
          登录后继续你的阅读进度
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 pt-0">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs font-bold text-destructive animate-fade-in uppercase tracking-wider">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="login" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase ml-1">用户名或邮箱</Label>
            <Input
              id="login"
              type="text"
              placeholder="Username or Email"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="h-11 rounded-md border-border bg-background transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase ml-1">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-md border-border bg-background transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/5"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2 pb-8 px-6">
          <Button 
            type="submit" 
            className="h-11 w-full rounded-md font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="h-px flex-1 bg-border/50" />
            <span>OR</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            还没有账户？{" "}
            <Link 
              href="/register" 
              className="text-foreground font-bold hover:underline transition-colors"
            >
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
