export type ScryfallRelatedCard = {
    object: "related_card";
    id: string;
    component: "combo_piece" | "token" | "meld_part" | string;
    name: string;
    type_line: string;
    uri: string;
};
