import { NextResponse } from "next/server"
import { findUserByEmail, findUserById, updateUserRecord, StoredUserAccount } from "@/lib/users-db"

// GET /api/auth/me?email=...&userId=... - Live user session sync directly from Supabase
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const userId = searchParams.get("userId")

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: "Missing email or userId parameter" },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
      )
    }

    const user = email ? await findUserByEmail(email) : await findUserById(userId!)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
      )
    }

    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(
      {
        success: true,
        source: "quant_auth",
        user: safeUser,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }
}

// PATCH /api/auth/me - Update user settings (language, name, etc.) in Supabase
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { userId, email, language, name } = body

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: "Missing userId or email identifier" },
        { status: 400 }
      )
    }

    const user = userId ? await findUserById(userId) : await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    const updates: Partial<StoredUserAccount> = {}
    if (language === "en" || language === "id") {
      updates.language = language
    }
    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim()
    }

    if (Object.keys(updates).length > 0) {
      await updateUserRecord(user.id, updates)
    }

    const updated = await findUserById(user.id)
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User could not be reloaded" },
        { status: 500 }
      )
    }

    const { passwordHash: _, ...safeUser } = updated
    return NextResponse.json(
      {
        success: true,
        user: safeUser,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    )
  }
}

