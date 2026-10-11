import type { APIRoute } from "astro";
import { getSetList } from "@/lib/setList";

export const GET: APIRoute = async () => {
    try {
        const data = await getSetList();

        return new Response(JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300, s-maxage=3600",
            },
        });
    } catch (error) {
        console.error("Set list unavailable", error);
        return Response.json({ error: "No se pudo actualizar el catálogo. Inténtalo de nuevo." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
};
