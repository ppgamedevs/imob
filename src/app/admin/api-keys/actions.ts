'use server';

import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/api/validate-key';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createApiKey(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user is admin (you may want to add admin role check here)
  // For now, any authenticated user can create keys

  const name = formData.get('name') as string;
  const domain = formData.get('domain') as string | null;
  const rateLimitStr = formData.get('rateLimit') as string;
  const expiresAtStr = formData.get('expiresAt') as string | null;

  const rateLimit = rateLimitStr ? parseInt(rateLimitStr, 10) : 1000;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  const key = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      userId: session.user.id,
      name: name || null,
      domain: domain || null,
      rateLimit,
      expiresAt,
      isActive: true,
    },
  });

  revalidatePath('/admin/api-keys');
  return { key: apiKey.key, id: apiKey.id };
}

export async function revokeApiKey(keyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  revalidatePath('/admin/api-keys');
  return { success: true };
}

export async function getApiKeys() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  const keys = await prisma.apiKey.findMany({
    where: {
      userId: session.user.id,
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
