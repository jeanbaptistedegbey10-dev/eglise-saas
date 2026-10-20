"use server";
import { prisma } from "@/lib/prisma";
export async function membresOk(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const l = await prisma.membre.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return l.map((x) => x.id);
}
