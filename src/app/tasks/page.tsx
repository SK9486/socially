"use client";

async function page() {
  const res = await fetch("http://localhost:3000/api/tasks");
  const tasks = await res.json();
  console.log(tasks);
  return <div>page</div>;
}

export default page;
