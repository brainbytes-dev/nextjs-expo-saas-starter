import { DEMO_MODE } from "@/lib/demo-mode";

let handlers: {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
} | null = null;

if (!DEMO_MODE) {
  const { auth } = await import("@/lib/auth");
  const { toNextJsHandler } = await import("better-auth/next-js");
  handlers = toNextJsHandler(auth);
}

export const GET = async (request: Request): Promise<Response> => {
  if (!handlers) {
    return Response.json(
      { error: "Auth API is disabled in demo mode" },
      { status: 404 }
    );
  }
  return handlers.GET(request);
};

export const POST = async (request: Request): Promise<Response> => {
  if (!handlers) {
    return Response.json(
      { error: "Auth API is disabled in demo mode" },
      { status: 404 }
    );
  }
  return handlers.POST(request);
};
