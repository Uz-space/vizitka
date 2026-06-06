import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, profileTable, settingsTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  AdminLoginBody,
  AdminLoginResponse,
  AdminLogoutResponse,
  GetAdminMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateProfile() {
  const rows = await db.select().from(profileTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db
    .insert(profileTable)
    .values({
      fullName: "Sizning ismingiz",
      title: "Kasb / Lavozim",
      bio: "O'zingiz haqingizda qisqacha ma'lumot bu yerda chiqadi. Admin paneldan tahrirlang.",
      phone: "+998900000000",
      instagram: "@username",
      telegram: "@username",
      photoUrl: null,
    })
    .returning();
  return created;
}

function serializeProfile(profile: Awaited<ReturnType<typeof getOrCreateProfile>>) {
  return {
    ...profile,
    createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
  };
}

async function getAdminPasswordHash(): Promise<string | null> {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "admin_password_hash"))
    .limit(1);
  return rows[0]?.value ?? null;
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = await getAdminPasswordHash();
  if (hash) {
    return bcrypt.compare(password, hash);
  }
  const envPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  return password === envPassword;
}

router.get("/profile", async (req, res): Promise<void> => {
  const profile = await getOrCreateProfile();
  res.json(GetProfileResponse.parse(serializeProfile(profile)));
});

router.put("/profile", async (req, res): Promise<void> => {
  const session = req.session as { isAdmin?: boolean };
  if (!session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid profile update body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateProfile();
  const [updated] = await db
    .update(profileTable)
    .set(parsed.data)
    .where(eq(profileTable.id, existing.id))
    .returning();

  res.json(UpdateProfileResponse.parse(serializeProfile(updated)));
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const valid = await verifyAdminPassword(parsed.data.password);
  if (!valid) {
    res.status(401).json({ error: "Noto'g'ri parol" });
    return;
  }

  const session = req.session as { isAdmin?: boolean };
  session.isAdmin = true;
  res.json(AdminLoginResponse.parse({ success: true }));
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json(AdminLogoutResponse.parse({ success: true }));
  });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const session = req.session as { isAdmin?: boolean };
  if (!session.isAdmin) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(GetAdminMeResponse.parse({ authenticated: true }));
});

router.post("/admin/change-password", async (req, res): Promise<void> => {
  const session = req.session as { isAdmin?: boolean };
  if (!session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Joriy va yangi parol kiritilishi shart" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    return;
  }

  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) {
    res.status(401).json({ error: "Joriy parol noto'g'ri" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);

  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "admin_password_hash"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settingsTable)
      .set({ value: hash })
      .where(eq(settingsTable.key, "admin_password_hash"));
  } else {
    await db
      .insert(settingsTable)
      .values({ key: "admin_password_hash", value: hash });
  }

  req.log.info("Admin password changed");
  res.json({ success: true });
});

export default router;
