import type { BoosterConfig } from "../types/mtgjson/Booster";
import type { Finish } from "../types/scryfall/ScryFallEnums";

export type PrintingReference = { uuid: string; identifiers: { scryfallId?: string }; finishes: string[] };
export type BoosterSet = { code: string; booster?: Record<string, BoosterConfig>; cards: PrintingReference[] };
export type BoosterMembership = { play: Set<Finish>; collector: Set<Finish>; products: Record<string, Set<Finish>>; warnings: string[] };

export function paperBoosterConfigs(set: BoosterSet) {
    return Object.entries(set.booster ?? {}).filter(([key]) => !/(^|[-_])(arena|mtgo|online)([-_]|$)/i.test(key));
}

export function preferredBooster(keys: string[]): string {
    return ["play", "draft", "set", "default", "jumpstart", "collector", "convention"].find(key => keys.includes(key)) ?? keys[0] ?? "all";
}

export function boosterLabel(key: string, name?: string) {
    return name ?? ({ play: "Play Booster", draft: "Draft Booster", set: "Set Booster", default: "Booster clásico",
        collector: "Collector Booster", "collector-sample": "Collector Sample", jumpstart: "Jumpstart", vip: "VIP", prerelease: "Prerelease",
        promo: "Promo Pack", "promo-foil": "Promo Pack Foil", "box-topper": "Box Topper" } as Record<string, string>)[key] ?? key.replaceAll("-", " ");
}

export function resolveBoosterMembers(set: BoosterSet, sources: BoosterSet[]) {
    const configs = paperBoosterConfigs(set);
    const byUuid = new Map([set, ...sources].flatMap((s) => s.cards).map((c) => [c.uuid, c]));
    const members = new Map<string, BoosterMembership>();
    for (const [key, config] of configs) {
        const used = new Set(config.boosters.filter((b) => b.weight > 0).flatMap((b) => Object.entries(b.contents).filter(([, count]) => (count ?? 0) > 0).map(([sheet]) => sheet)));
        for (const [name, sheet] of Object.entries(config.sheets)) {
            if (!used.has(name)) continue;
            for (const [uuid, weight] of Object.entries(sheet.cards)) {
                if (weight <= 0) continue;
                const info = byUuid.get(uuid);
                const id = info?.identifiers.scryfallId;
                if (!info || !id) throw new Error(`Unresolved booster printing: ${set.code}/${key}/${uuid}`);
                const finish: Finish = /etched/i.test(name) ? "etched" : sheet.foil
                    ? !info.finishes.includes("foil") && info.finishes.includes("etched") ? "etched" : "foil"
                    : "nonfoil";
                const member = members.get(id) ?? { play: new Set<Finish>(), collector: new Set<Finish>(), products: {}, warnings: [] };
                if (!info.finishes.includes(finish)) member.warnings.push(`${key}: ${finish} no confirmado por los datos de la impresión`);
                (member.products[key] ??= new Set<Finish>()).add(finish);
                if (key === "collector") member.collector.add(finish);
                if (/^(play|draft|set|default)$/.test(key)) member.play.add(finish);
                members.set(id, member);
            }
        }
    }
    return members;
}
