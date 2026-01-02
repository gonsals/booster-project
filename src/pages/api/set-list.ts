import type { APIRoute } from "astro";
import { getSetList } from "@/lib/setList";

export const GET: APIRoute = async () => {
    const data = await getSetList();

    return new Response(JSON.stringify(data), {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400",
        },
    });
};
