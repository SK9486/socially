import { getPosts } from "@/action/postAction";
import { getDbUserId } from "@/action/userAction";
import CreatePost from "@/components/CreatePost";
import PostCard from "@/components/PostCard";
import WhoToFollow from "@/components/WhoToFollow";
import { currentUser } from "@clerk/nextjs/server";

export default async function Page() {
  const user = await currentUser();
  const posts = await getPosts();
  const dbUserId = await getDbUserId();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className="lg:col-span-6">
        {user ? <CreatePost /> : null}
        <div className="space-y-6">
          {posts ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  content: post.content || "", // Convert null to empty string
                  likes: post.likes.map((like) => ({
                    ...like,
                    id: like.userId,
                  })),
                }}
                dbUserId={dbUserId}
              />
            ))
          ) : (
            <div className="text-center text-gray-400">No posts to show</div>
          )}
        </div>
      </div>
      <div className="hidden lg:block sticky top-20 lg:col-span-4">
        <WhoToFollow />
      </div>
    </div>
  );
}
