import { isAxiosError } from "axios";
import { api } from "../../lib/api";

export type WsUser = {
    id: string;
    username: string;
};

export type WsUserCreate = {
    username: string;
};

export async function createWsUser(payload: WsUserCreate): Promise<WsUser> {
    const response = await api.post<WsUser>("/ws/users", payload);
    return response.data;
}

export function getCreateWsUserErrorMessage(error: unknown): string {
    if (isAxiosError(error) && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") return detail;
    }
    return "Failed to register name. Please try again.";
}
