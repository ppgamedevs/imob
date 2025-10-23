'use server';

import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api/validate-key';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guards';
import { z } from 'zod';

// Validation schema
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  domain: z.string().url('Invalid domain URL').optional().nullable(),
  rateLimit: z.number().int().positive().max(10000).default(1000),
  expiresAt: z.date().optional().nullable(),
});

export async function createApiKey(formData: FormData) {
  // Admin guard
  const user = await requireAdmin();

  // Validate and parse input
  const name = formData.get('name') as string;
  const domain = formData.get('domain') as string | null;
  const rateLimitStr = formData.get('rateLimit') as string;
  const expiresAtStr = formData.get('expiresAt') as string | null;

  const validated = createApiKeySchema.parse({
    name,
    domain: domain || null,
    rateLimit: rateLimitStr ? parseInt(rateLimitStr, 10) : 1000,
    expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
  });

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      userId: user.id,
      name: validated.name,
      domain: validated.domain,
      rateLimit: validated.rateLimit,
      expiresAt: validated.expiresAt,
      isActive: true,
    },
  });

  revalidatePath('/admin/api-keys');
  return { key: apiKey.key, id: apiKey.id };
}

export async function revokeApiKey(keyId: string) {
  // Admin guard
  await requireAdmin();

  // Validate input
  const validated = z.string().uuid().parse(keyId);

  await prisma.apiKey.update({
    where: { id: validated },
    data: { isActive: false },
  });

  revalidatePath('/admin/api-keys');
  return { success: true };
}

export async function getApiKeys() {
  // Admin guard
  const user = await requireAdmin();

  const keys = await prisma.apiKey.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          usage: true,
        },
      },
    },
  });

  return keys;
}
