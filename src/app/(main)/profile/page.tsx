"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Loader2, Save, KeyRound, User as UserIcon, Mail, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();

      if (res.ok) {
        setProfile(data.user);
        setUsername(data.user.username);
        setEmail(data.user.email);
      } else {
        toast.error(data.error || "获取用户信息失败");
      }
    } catch {
      toast.error("获取用户信息失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        await update({ avatar: data.avatar });
        await fetchProfile();
        toast.success("头像上传成功");
      } else {
        toast.error(data.error || "头像上传失败");
      }
    } catch {
      toast.error("头像上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setSaving(true);

    try {
      const updates: Record<string, string> = {
        username,
        email,
      };

      if (password) {
        updates.password = password;
      }

      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (res.ok) {
        await update({
          username: data.user.username,
          email: data.user.email,
          avatar: data.user.avatar,
        });
        setPassword("");
        setConfirmPassword("");
        toast.success("保存成功");
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-noise min-h-screen">
        <BackgroundDecoration />
        <Navbar />
        <main className="relative z-10 mx-auto w-full max-w-5xl px-3 py-8 sm:px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-noise min-h-screen">
      <BackgroundDecoration />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="section-shell relative mb-6 overflow-hidden px-5 py-5 sm:mb-8 sm:px-6">
          <div className="liquid-hairline absolute inset-x-5 top-0 h-px" />
          <div className="liquid-control mb-2 inline-flex items-center gap-2 rounded-xl px-3 py-1 text-xs text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>账户中心</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">个人资料</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理您的账户信息和安全设置
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="book-card-glass overflow-hidden rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl">头像</CardTitle>
              <CardDescription>
                点击头像可更换新的图片
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div
                  className="relative group transition-all duration-200"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="h-24 w-24 border border-[color:var(--glass-border)] shadow-[0_18px_40px_-30px_color-mix(in_oklab,var(--foreground)_38%,transparent)] transition-colors duration-200 group-hover:border-ring/35">
                    <AvatarImage src={profile?.avatar || undefined} />
                    <AvatarFallback className="bg-accent text-foreground text-2xl font-semibold">
                      {profile?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">上传头像</p>
                  <p className="text-xs text-muted-foreground">
                    支持 JPG、PNG 格式，最大 2MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="book-card-glass overflow-hidden rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                基本信息
              </CardTitle>
              <CardDescription>
                更新您的个人资料
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card className="book-card-glass overflow-hidden rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                修改密码
              </CardTitle>
              <CardDescription>
                不修改密码请留空
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">新密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少 6 个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="h-11 rounded-xl bg-background/42"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="h-11 rounded-xl bg-background/42"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="book-card-glass overflow-hidden rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{profile?.email}</span>
                </div>
                <Separator orientation="vertical" className="hidden h-5 sm:block" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>注册于 {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("zh-CN") : "未知"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="top-action-primary h-11 min-w-[120px] rounded-xl font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存更改
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
