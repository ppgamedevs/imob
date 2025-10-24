/**
 * Delete Me API
 *
 * GDPR-compliant user deletion endpoint that:
 * 1. Anonymizes PII (email, name, image, phone)
 * 2. Cascade deletes user-generated content (SavedSearch, WatchItem, CompareSet)
 * 3. Invalidates all sessions
 * 4. Keeps aggregated stats and business data (Listing, Analysis)
 *
 * Usage: DELETE /api/me/delete
 * Auth: Requires authenticated session
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/obs/logger";
import { captureException } from "@/lib/obs/sentry";

const logger = createLogger({ name: "delete-user" });

export async function DELETE(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    logger.info({ userId }, "User deletion requested");

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count user data for logging
    const [savedSearchCount, watchItemCount, compareSetCount, sessionCount, apiKeyCount] =
      await Promise.all([
        prisma.savedSearch.count({ where: { userId } }),
        prisma.watchItem.count({ where: { userId } }),
        prisma.compareSet.count({ where: { userId } }),
        prisma.session.count({ where: { userId } }),
        prisma.apiKey.count({ where: { userId } }),
      ]);

    logger.info(
      {
        userId,
        savedSearches: savedSearchCount,
        watchItems: watchItemCount,
        compareSets: compareSetCount,
        sessions: sessionCount,
        apiKeys: apiKeyCount,
      },
      "Starting user deletion process",
    );

    // Execute deletion in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete user-generated content
      const deletedSavedSearches = await tx.savedSearch.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedSavedSearches.count }, "Deleted saved searches");

      const deletedWatchItems = await tx.watchItem.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedWatchItems.count }, "Deleted watch items");

      const deletedCompareSets = await tx.compareSet.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedCompareSets.count }, "Deleted compare sets");

      // 2. Delete API keys
      const deletedApiKeys = await tx.apiKey.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedApiKeys.count }, "Deleted API keys");

      // 3. Invalidate all sessions
      const deletedSessions = await tx.session.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedSessions.count }, "Deleted sessions");

      // 4. Delete OAuth accounts
      const deletedAccounts = await tx.account.deleteMany({
        where: { userId },
      });
      logger.info({ count: deletedAccounts.count }, "Deleted OAuth accounts");

      // 5. Anonymize user PII
      const timestamp = new Date().getTime();
      const anonymizedUser = await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${timestamp}@example.com`,
          name: "Deleted User",
          image: null,
          emailVerified: null,
          // Keep role for audit purposes
          // Keep Stripe data for financial records (required by law)
          // Keep proTier status for analytics
        },
      });

      logger.info({ userId }, "Anonymized user PII");

      return {
        deletedSavedSearches: deletedSavedSearches.count,
        deletedWatchItems: deletedWatchItems.count,
        deletedCompareSets: deletedCompareSets.count,
        deletedApiKeys: deletedApiKeys.count,
        deletedSessions: deletedSessions.count,
        deletedAccounts: deletedAccounts.count,
        anonymizedEmail: anonymizedUser.email,
      };
    });

    logger.info({ userId, result }, "User deletion complete");

    return NextResponse.json({
      success: true,
      message: "Your account has been deleted and personal information anonymized",
      details: {
        savedSearchesDeleted: result.deletedSavedSearches,
        watchItemsDeleted: result.deletedWatchItems,
        compareSetsDeleted: result.deletedCompareSets,
        apiKeysDeleted: result.deletedApiKeys,
        sessionsInvalidated: result.deletedSessions,
        accountsDeleted: result.deletedAccounts,
        emailAnonymizedTo: result.anonymizedEmail,
      },
      note: "Aggregated analytics and business records (listings, analyses) are retained for legal and operational purposes.",
    });
  } catch (error) {
    logger.error({ error }, "User deletion failed");
    captureException(error as Error, {
      tags: { endpoint: "delete_user" },
    });

    return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 });
  }
}
