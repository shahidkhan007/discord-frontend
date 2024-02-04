import { Socket } from "socket.io-client";
import { WebRTCHost } from "./WebRTC";

export enum UserRole {
    Host = "Host",
    Viewer = "Viewer",
}

export type Profile = {
    id: string;
    name: string;
    role: UserRole;
    color: string;
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
    dp: string;
};

export enum ChatMessageType {
    Text = "text",
    UserDP = "user-dp",
    UserConnected = "user-connected",
}

export type ChatMessage<Data = any> = {
    type: ChatMessageType;
    sender: Profile;
    data: Data;
};

export type ChatMessageData = {
    body: string;
};

export type TextMessage = ChatMessage<ChatMessageData>;

export type Viewer = Profile & {
    status: string;
    el: HTMLAudioElement;
    webrtc: WebRTCHost | null;
    dp: string;
};
