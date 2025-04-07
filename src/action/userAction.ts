"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { SuiteContext } from "node:test";

export async function syncUser() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId || !user) return;
    const userExists = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (userExists) return userExists;
    const dbUser = await prisma.user.create({
      data: {
        clerkId: userId,
        name: `${user.firstName || ""} ${user.lastName || ""}`,
        username:
          user.username || user.emailAddresses[0].emailAddress.split("@")[0],
        email: user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
      },
    });
    return dbUser;
  } catch (error) {
    console.log("Error while syncing user:", error);
  }
}

export async function getUserByClerkId(clerkId: string) {
  try {
    return prisma.user.findUnique({
      where: { clerkId },
      include: {
        _count: {
          select: {
            following: true,
            followers: true,
            posts: true,
          },
        },
      },
    });
  } catch (error) {
    console.log("Error while getting user:", error);
    return null;
  }
}

export async function getDbUserId() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error("User not found");
  return user?.id;
}

export async function getRandomUser() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];
    const user = await prisma.user.findMany({
      where: {
        AND: [
          {
            NOT: { id: userId },
          },
          {
            NOT: {
              followers: {
                some: {
                  followerId: userId,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3,
    });
    return user;
  } catch (error) {
    console.log("Error while getting random user:", error);
    return [];
  }
}

export async function toggleFollow(targetId: string) {
  try {
    const userId = await getDbUserId();
    if (userId === targetId) {
      throw new Error("You cannot follow yourself");
    }
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId as string,
          followingId: targetId,
        },
      },
    });
    if (existingFollow) {
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId as string,
            followingId: targetId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId as string,
            followingId: targetId,
          },
        }),
        prisma.notification.create({
          data: {
            userId: targetId,
            creatorId: userId as string,
            type: "FOLLOW",
          },
        }),
      ]);
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.log("Error while toggling follow:", error);
    return { success: false, error: "Error toggle follow" };
  }
}
