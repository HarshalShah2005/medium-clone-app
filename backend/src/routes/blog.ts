import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { createBlogInput } from "@harshal2005/medium-common";
import { updateBlogInput } from "@harshal2005/medium-common";

export  const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string
        JWT_SECRET: string
	},
    Variables: {
        userId: string
    }
}>()

blogRouter.use('/*', async (c, next) => {
    const token = c.req.header("authorization") || "";
    const user = await verify(token, c.env.JWT_SECRET);

    if(!user) {
        c.status(403);
        return c.json({
            message: "You are not authorized"
        })
    }

    c.set("userId", user.id as string);
    await next();
})

blogRouter.post('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    
    const body = await c.req.json();
    const success = createBlogInput.safeParse(body);
    if(!success) {
        c.status(411);
        return c.json({
            message: "Invalid input"
        })
    }

    const userId = c.get("userId") as string;
    const blog = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: userId 
        }
    })

    return c.json({
        id: blog.id
    })
})

blogRouter.put('/', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    
    const body = await c.req.json();
    const success = updateBlogInput.safeParse(body);
    if(!success) {
        c.status(411);
        return c.json({
            message: "Invalid input"
        })
    }

    const blog = await prisma.post.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content
        }
    })

    return c.json({
        id: blog.id
    })
})

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    
    
    const blogs = await prisma.post.findMany({
        select: {
            title: true,
            content: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });
    return c.json({
        blogs
    })
})

blogRouter.get('/:id', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    
    try {
        const id = c.req.param("id");

        const blog = await prisma.post.findUnique({
            where: {
                id: id
            },
            select: {
                title: true,
                content: true,
                id: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        })

        return c.json({
            blog
        })
    } catch(e) {
        c.status(411);
        return c.json({
            message: "Error while fetching blog post"
        });
    }
})
