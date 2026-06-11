import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db, { schema } from "../../database";

async function createGhostUser(
  workspaceId: string,
  email: string,
  name: string,
  password: string,
  role: string,
) {
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select({ id: schema.userTable.id, name: schema.userTable.name })
    .from(schema.userTable)
    .where(eq(schema.userTable.email, normalizedEmail))
    .limit(1);

  let userId: string;
  let isNew = false;

  if (existing) {
    userId = existing.id;

    const [member] = await db
      .select({ userId: schema.workspaceUserTable.userId })
      .from(schema.workspaceUserTable)
      .where(
        and(
          eq(schema.workspaceUserTable.workspaceId, workspaceId),
          eq(schema.workspaceUserTable.userId, existing.id),
        ),
      )
      .limit(1);

    if (member) {
      throw new HTTPException(409, {
        message: "User is already a member of this workspace",
      });
    }
  } else {
    userId = createId();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(schema.userTable).values({
      id: userId,
      name,
      email: normalizedEmail,
      emailVerified: false,
    });

    // Better Auth reads this row for email+password login
    await db.insert(schema.accountTable).values({
      accountId: normalizedEmail,
      providerId: "credential",
      userId,
      password: hashedPassword,
    });

    isNew = true;
  }

  await db.insert(schema.workspaceUserTable).values({
    userId,
    workspaceId,
    role,
    joinedAt: new Date(),
  });

  return {
    userId,
    email: normalizedEmail,
    name: existing?.name ?? name,
    isNew,
  };
}

export default createGhostUser;
