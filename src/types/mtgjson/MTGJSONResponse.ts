export type MTGJSONResponse<T> = {
    meta: {
        date: string;
        version: string;
    };
    data: T;
};
