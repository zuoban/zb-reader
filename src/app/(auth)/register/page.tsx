"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
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
    <Card className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-all duration-300">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <span className="font-heading text-3xl font-bold italic">Z</span>
          </div>
        </div>
        <CardTitle className="font-heading text-3xl font-bold tracking-tight text-foreground">ZB Reader</CardTitle>
        <CardDescription className="text-sm mt-2 font-medium text-muted-foreground">
          创建账号，开始你的阅读收藏
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
            <Label htmlFor="username" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase ml-1">用户名</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              maxLength={20}
              className="h-11 rounded-md border-border bg-background transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase ml-1">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              minLength={6}
              className="h-11 rounded-md border-border bg-background transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/5"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase ml-1">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            注册
          </Button>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="h-px flex-1 bg-border/50" />
            <span>OR</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            已有账户？{" "}
            <Link 
              href="/login" 
              className="text-foreground font-bold hover:underline transition-colors"
            >
              立即登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
