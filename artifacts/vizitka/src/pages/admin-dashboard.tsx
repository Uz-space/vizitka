import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LogOut, Save, UserCircle, Camera, Loader2, Lock } from "lucide-react";
import {
  useGetProfile,
  useUpdateProfile,
  useGetAdminMe,
  useAdminLogout,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  fullName: z.string().min(1, "Ism familya kiritilishi shart"),
  title: z.string().optional().nullable(),
  bio: z.string(),
  phone: z.string(),
  instagram: z.string(),
  telegram: z.string(),
  photoUrl: z.string().optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parolni kiriting"),
  newPassword: z.string().min(6, "Yangi parol kamida 6 ta belgi bo'lishi kerak"),
  confirmPassword: z.string().min(1, "Parolni tasdiqlang"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Parollar mos kelmadi",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useGetAdminMe({
    query: { retry: false },
  });

  const { data: profile, isLoading: isProfileLoading } = useGetProfile({
    query: { enabled: !!session?.authenticated },
  });

  const updateProfileMutation = useUpdateProfile();
  const logoutMutation = useAdminLogout();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      title: "",
      bio: "",
      phone: "",
      instagram: "",
      telegram: "",
      photoUrl: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const isInitialized = useRef(false);
  useEffect(() => {
    if (profile && !isInitialized.current) {
      profileForm.reset({
        fullName: profile.fullName || "",
        title: profile.title || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        instagram: profile.instagram || "",
        telegram: profile.telegram || "",
        photoUrl: profile.photoUrl || "",
      });
      if (profile.photoUrl) setPhotoPreview(profile.photoUrl);
      isInitialized.current = true;
    }
  }, [profile, profileForm]);

  useEffect(() => {
    if ((!isSessionLoading && session && !session.authenticated) || isSessionError) {
      setLocation("/admin");
    }
  }, [session, isSessionLoading, isSessionError, setLocation]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json() as { url: string };
      profileForm.setValue("photoUrl", url, { shouldDirty: true });
      toast({ title: "Rasm yuklandi", description: "Saqlash tugmasini bosing." });
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "Rasmni yuklab bo'lmadi." });
      setPhotoPreview(profile?.photoUrl || null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onProfileSubmit = (values: ProfileFormValues) => {
    const dataToSubmit = {
      ...values,
      title: values.title || null,
      photoUrl: values.photoUrl || null,
    };

    updateProfileMutation.mutate(
      { data: dataToSubmit },
      {
        onSuccess: (updatedData) => {
          toast({ title: "Saqlandi", description: "Profil muvaffaqiyatli yangilandi." });
          queryClient.setQueryData(getGetProfileQueryKey(), updatedData);
          isInitialized.current = false;
        },
        onError: () => {
          toast({ variant: "destructive", title: "Xato", description: "Profilni saqlashda muammo." });
        },
      }
    );
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        toast({ variant: "destructive", title: "Xato", description: data.error ?? "Parolni o'zgartirib bo'lmadi." });
        return;
      }

      toast({ title: "Parol o'zgartirildi", description: "Yangi parol muvaffaqiyatli saqlandi." });
      passwordForm.reset();
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "Server bilan bog'liqlikda muammo." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/admin"),
    });
  };

  if (isSessionLoading || isProfileLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.authenticated) return null;

  const currentPhotoUrl = profileForm.watch("photoUrl");

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="text-primary" />
            <span className="font-serif font-medium text-lg">Vizitka Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              Kartani ko'rish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Chiqish
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Profile card */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-secondary/30 pb-8">
            <CardTitle className="font-serif text-2xl">Profilni tahrirlash</CardTitle>
            <CardDescription>Vizitka kartangizda ko'rinadigan ma'lumotlarni yangilang.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">

                {/* Photo upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-secondary border-4 border-background shadow-md flex items-center justify-center">
                      {(photoPreview || currentPhotoUrl) ? (
                        <img
                          src={photoPreview || currentPhotoUrl || ""}
                          alt="Profil rasmi"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-4xl text-primary">
                          {profileForm.watch("fullName")?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      data-testid="button-upload-photo"
                      className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    data-testid="input-photo-file"
                  />
                  <p className="text-sm text-muted-foreground">
                    {isUploadingPhoto ? "Yuklanmoqda..." : "Rasmni o'zgartirish uchun bosing"}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ism Familya</FormLabel>
                          <FormControl>
                            <Input placeholder="Alisher Karimov" {...field} className="bg-background" data-testid="input-fullname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kasb / Lavozim</FormLabel>
                          <FormControl>
                            <Input placeholder="Dasturchi, Blogger..." {...field} value={field.value || ""} className="bg-background" data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>O'zingiz haqingizda</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Qisqacha ma'lumot..." className="resize-none h-24 bg-background" {...field} data-testid="input-bio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t border-border">
                    <h3 className="font-medium mb-4">Aloqa va ijtimoiy tarmoqlar</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon raqam</FormLabel>
                            <FormControl>
                              <Input placeholder="+998901234567" {...field} className="bg-background" data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="telegram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telegram</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} className="bg-background" data-testid="input-telegram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@username" {...field} className="bg-background" data-testid="input-instagram" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-xl px-8"
                    disabled={updateProfileMutation.isPending || (!profileForm.formState.isDirty && !isUploadingPhoto)}
                    data-testid="button-save"
                  >
                    {updateProfileMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saqlanmoqda...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Saqlash</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Change password card */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-secondary/30 pb-8">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle className="font-serif text-2xl">Parolni o'zgartirish</CardTitle>
            </div>
            <CardDescription>Admin paneliga kirish parolini yangilang.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joriy parol</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} className="bg-background" data-testid="input-current-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid sm:grid-cols-2 gap-6">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yangi parol</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} className="bg-background" data-testid="input-new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parolni tasdiqlang</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} className="bg-background" data-testid="input-confirm-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="rounded-xl px-8"
                    disabled={isChangingPassword}
                    data-testid="button-change-password"
                  >
                    {isChangingPassword ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />O'zgartirilmoqda...</>
                    ) : (
                      <><Lock className="w-4 h-4 mr-2" />Parolni o'zgartirish</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
