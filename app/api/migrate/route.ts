/**
 * API Route: Trigger Data Migration
 * POST /api/migrate
 *
 * Triggers the migration script to move user's data from old flat structure
 * to new nested canvas structure.
 */

import { NextResponse } from "next/server";
import { runMigration } from "@/scripts/migrate-to-canvases";

export async function POST() {
  try {
    // Run migration (not in dry-run mode)
    const stats = await runMigration(false);

    // Check if there were errors
    if (stats.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Migration completed with errors",
          stats,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Migration completed successfully",
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Migration API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
