import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

//   signup route

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  try {
    // Create user in the database
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });

    // Generate JWT for the user
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    // Send the JWT back to the client
    return c.json({ jwt });
  } catch (e) {
    console.error("Error during signup:", e);
    c.status(500);
    return c.json({ error: "An error occurred during signup" });
  } finally {
    await prisma.$disconnect();
  }
});

// signin route

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  // Check if user exists
  if (!user) {
    c.status(403);
    return c.json({ error: "user not found" });
  }

  // Generate JWT if user is found
  const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);
  return c.json({ jwt });
});
