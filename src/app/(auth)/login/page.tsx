"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <Card className="border-border/50 shadow-2xl backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold">ZB Reader</CardTitle>
        <CardDescription className="text-base mt-2">
          登录你的阅读账户
        </CardDescription>
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
              className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
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
              className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button 
            type="submit" 
            className="w-full h-11 font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" 
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
