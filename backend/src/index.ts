import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';

// Create the main Hono app
const app = new Hono<{
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string,
  }
}>();

// Use the Prisma client in route handler
app.post('/api/v1/signup', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,  // Use c.env.DATABASE_URL inside the handler
  }).$extends(withAccelerate());  // Enabling Prisma Accelerate

  const body = await c.req.json();
  try {
    // Create user in the database
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password
      }
    });

    // Generate JWT for the user
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    // Send the JWT back to the client
    return c.json({ jwt });
  } catch (e) {
    console.error('Error during signup:', e);  // Logging the error for debugging
    c.status(500);  // Set status to 500 for internal server error
    return c.json({ error: "An error occurred during signup" });
  } finally {
    // Cleanup Prisma client to avoid memory leaks
    await prisma.$disconnect();
  }
});

export default app;
