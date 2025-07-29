"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function syncUser(){
    try {
        const {userId}= await auth();
        const user=await currentUser();

        if(!userId || !user)return;

        // check if user exists 
        const existingUser=await prisma.user.findUnique({
            where:{
                clerkId:userId,
            },
        });

        if(existingUser)return existingUser;
        const dbUser=await prisma.user.create({
            data: {
                clerkId: userId,
                name: `${user.firstName || ""} ${user.lastName || ""}`,
                username: user.username ?? user.emailAddresses[0].emailAddress.split("@")[0],
                email: user.emailAddresses[0].emailAddress,
                image: user.imageUrl,
            }
        })
        return dbUser;
    } catch (error) {
        console.log("Error syncing user", error);
    }

}

export async function getUserByClerkId(clerkId: string){
    return prisma.user.findUnique({
        where:{
            clerkId,
        },
        include:{
            _count:{
                select:{
                    following:true,
                    followers:true,
                    posts:true,
                }
            }
        }
    })
}

// clerk and db is different in nextjs and clerk so we need to implement this in order to get the id of the user from db 
export async function fetDbUserId(){
    const {userId  : clerkId}=await auth();
    if(!clerkId) return null;
    const user=await getUserByClerkId(clerkId);
    if(!user)throw new Error("User not found in database");

    return user.id;
}


export async function getRandomUsers(){
    try {
        const userId= await fetDbUserId();
        if(!userId) return  [];
        // get 3 randoomm users exclude ourself and users that we are following
        const randomUsers=await prisma.user.findMany({
            where:{
                AND:[
                    {NOT: {id: userId}},
                    {NOT: {followers: {some: {followerId: userId}}}},
                ]
            },
            select:{
                id: true,
                name: true,
                username: true,
                image: true,
                _count:{
                    select:{
                        followers:true,
                    }
                }
            },
            take:3,
        });
        return randomUsers;


    } catch (error) {
        console.log("Error fetching random users", error);
        return [];
    }
}


export async function toggleFollow(targetUserId: string){
   try {
    const userId= await fetDbUserId();
    if(!userId) return ;
    if(userId===targetUserId) throw new Error("Cannot follow yourself");
    const existingFollow= await prisma.follows.findUnique({
        where:{
            followerId_followingId:{
                followerId: userId,
                followingId: targetUserId,
            }
        },
    })
    if(existingFollow) {
    await prisma.follows.delete({
        where:{
            followerId_followingId:{
                followerId: userId,
                followingId: targetUserId,
            }
        }
    });
    }else{
      await prisma.$transaction([
        prisma.follows.create({
            data:{
                followerId: userId,
                followingId: targetUserId,
            }
        }),
        prisma.notification.create({
            data:{
                type:"FOLLOW",
                userId: targetUserId,// user being followed
                creatorId: userId, // user who is following
            }
        })
      ])
    }
    revalidatePath("/");
    return {success:true};
   } catch (error) {
    console.log("Error toggling follow", error);
    return {success:false,error:"Error Toggling follow"};
   }
}