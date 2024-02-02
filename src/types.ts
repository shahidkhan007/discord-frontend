import { Socket } from "socket.io-client";

export enum UserRole {
    Host = "Host",
    Viewer = "Viewer",
}

export type Profile = {
    id: string;
    name: string;
    role: UserRole;
};

export type User = {
    profile: Profile;
    socket: Socket;
};

export enum MessageType {
    SDP = "sdp",
    Answer = "answer",
    ICE = "ice",
    CreateConnection = "create-connection",
    NoHost = "no-host",
}

export type Message = {
    type: MessageType;
    payload: any;
};

export type AppCtxType = {
    profile: Profile | null;
};
