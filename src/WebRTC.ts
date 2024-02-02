import io, { Socket } from "socket.io-client";
import { Message, MessageType, Profile } from "./types";

const ICE_SERVERS = [
    {
        urls: "stun:3.29.88.49:4242",
    },
    {
        urls: "turn:3.29.88.49:4242",
        username: "test",
        credential: "test123",
    },
];

export class SignalingChannel {
    private socket: Socket;

    public createConnhandler: ((profile: Profile) => void) | null = null;
    public onHostAlreadyExists: ((hostProfile: Profile) => void) | null = null;
    private messageHandlers: Map<string, (message: Message) => void> = new Map();
    private profile: Profile | null;
    public onUserCreated: (() => void) | null = null;

    constructor(profile: Profile | null) {
        this.socket = io(process.env.NODE_ENV === "development" ? "http://127.0.0.1:4241" : "/");
        this.socket.connect();
        this.profile = profile;
    }

    public initiate() {
        this.socket.emit("create-user", this.profile);

        this.socket.on("create-connection", (profile: Profile) => {
            if (this.createConnhandler) {
                this.createConnhandler(profile);
            }
        });

        this.socket.on("user-created", () => {
            if (this.onUserCreated) {
                this.onUserCreated();
            }
        });

        this.socket.on("iceCandidate", (payload: any) => {
            const handler = this.messageHandlers.get(payload.profile.id);
            console.log("ICE received", payload, handler, this.messageHandlers);
            if (handler) {
                handler({
                    type: MessageType.ICE,
                    payload,
                });
            }
        });

        this.socket.on("sdp", (payload: any) => {
            const handler = this.messageHandlers.get(payload.profile.id);
            if (handler) {
                handler({
                    type: MessageType.SDP,
                    payload,
                });
            }
        });

        this.socket.on("answer", (payload: any) => {
            const handler = this.messageHandlers.get(payload.profile.id);
            if (handler) {
                handler({
                    type: MessageType.Answer,
                    payload,
                });
            }
        });

        this.socket.on("no-host", (payload: any) => {
            const handler = this.messageHandlers.get(payload.profile.id);
            if (handler) {
                handler({
                    type: MessageType.NoHost,
                    payload,
                });
            }
        });

        this.socket.on("host-already-exists", (payload: any) => {
            if (this.onHostAlreadyExists) {
                this.onHostAlreadyExists(payload.hostProfile);
            }
        });
    }

    public sendMessage(message: Message) {
        console.log("Sending message", message);
        this.socket.emit(message.type, message.payload);
    }

    public addHandler(profile: Profile, cb: (message: Message) => void) {
        this.messageHandlers.set(profile.id, cb);
    }
}

export class WebRTCHost {
    connection: RTCPeerConnection;
    hostProfile: Profile;
    viewerProfile: Profile | null = null;
    channel: SignalingChannel;
    onConnectionStateChange: ((viewerProfile: Profile, state: string) => void) | null = null;
    stream: MediaStream | null = new MediaStream();
    onTrackAdded: ((track: MediaStreamTrack) => void) | null = null;
    dataChannel: RTCDataChannel | null = null;

    constructor(hostProfile: Profile, _channel: SignalingChannel, tracks: MediaStreamTrack[]) {
        this.connection = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
        });
        this.hostProfile = hostProfile;
        this.channel = _channel;

        this.connection.onicecandidate = (ev) => {
            if (!this.viewerProfile) {
                console.log("Viewer profile not set, cannot send ICE candidate");
                return;
            }

            this.channel.sendMessage({
                type: MessageType.ICE,
                payload: {
                    profile: this.hostProfile,
                    candidate: ev.candidate,
                    viewer: this.viewerProfile,
                },
            });
        };

        this.connection.onconnectionstatechange = (ev) => {
            console.log("Connection state change", this.connection.connectionState);
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(this.viewerProfile!, this.connection.connectionState);
            }
        };

        this.connection.ontrack = (ev) => {
            console.log("New track received");
            this.stream?.addTrack(ev.track);

            if (this.onTrackAdded) {
                this.onTrackAdded(ev.track);
            }
        };

        this.connection.onnegotiationneeded = async () => {
            console.log("Renegotiation needed");
            const sdp = await this.connection.createOffer();
            this.connection.setLocalDescription(sdp);

            this.channel.sendMessage({
                type: MessageType.SDP,
                payload: { profile: this.viewerProfile, sdp },
            });
        };

        for (const track of tracks) {
            if ("contentHint" in track) {
                track.contentHint = "music";
            } else {
                console.log("Content hints not supported");
            }
            this.connection.addTrack(track);
        }
    }

    public setViewerProfile(profile: Profile) {
        this.viewerProfile = profile;
    }

    public async initiate() {
        if (!this.viewerProfile) {
            console.log("Viewer profile must be set in order to initiate a connection.");
            return;
        }

        this.channel.addHandler(this.viewerProfile, (message: Message) => {
            this.messageHandler(message);
            console.log("Message handler adder, viewer ID:", this.viewerProfile?.id);
        });

        // const sdp = await this.connection.createOffer();
        // await this.connection.setLocalDescription(sdp);
        // this.channel.sendMessage({
        //     type: MessageType.SDP,
        //     payload: { profile: this.viewerProfile, sdp },
        // });
    }

    private async messageHandler(message: Message) {
        console.log("Message received", message);
        switch (message.type) {
            case MessageType.ICE: {
                await this.connection.addIceCandidate(message.payload.candidate);
                break;
            }

            case MessageType.Answer: {
                console.log("Answer", message.payload.answer);
                await this.connection.setRemoteDescription(message.payload.answer);
                break;
            }

            default: {
                console.log("Unknown message type", message);
            }
        }
    }

    public getStream() {
        return this.stream;
    }

    public addTrack(track: MediaStreamTrack) {
        console.log("Adding new track to connection");
        this.connection.addTrack(track);
    }

    public createDataChannel(messageHandler: (message: any) => void) {
        this.dataChannel = this.connection.createDataChannel("general", { ordered: true });
        this.dataChannel.onmessage = (ev) => {
            messageHandler(JSON.parse(ev.data));
        };
    }

    public sendDTMessage(message: any) {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            this.dataChannel.send(JSON.stringify(message));
            return { sent: true, message: "" };
        }

        return {
            sent: false,
            message: this.dataChannel ? "Channel not ready" : "No channel to send data through",
        };
    }
}

export class WebRTCViewer {
    connection: RTCPeerConnection;
    channel: SignalingChannel;
    profile: Profile;
    stream: MediaStream;
    onConnected: ((stream: MediaStream) => void) | null = null;
    onNoHost: (() => void) | null = null;
    onNewTrackAdded: ((stream: MediaStream) => void) | null = null;
    dataChannel: RTCDataChannel | null = null;
    dtMessageHandler: ((message: any) => void) | null = null;
    dtOpenHandler: (() => void) | null = null;

    constructor(channel: SignalingChannel, profile: Profile, tracks: MediaStreamTrack[]) {
        this.connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.channel = channel;
        this.profile = profile;
        this.stream = new MediaStream();

        this.channel.addHandler(this.profile, (message) => this.messageHandler(message));

        this.channel.sendMessage({
            type: MessageType.CreateConnection,
            payload: this.profile,
        });

        this.connection.ontrack = (ev) => {
            console.log("New track received");
            this.stream.addTrack(ev.track);

            if (this.onNewTrackAdded) {
                this.onNewTrackAdded(this.stream);
            }
        };

        this.connection.onconnectionstatechange = () => {
            console.log("Connection:", this.connection.connectionState);
            if (this.connection.connectionState === "connected" && this.onConnected) {
                this.onConnected(this.stream);
            }
        };

        this.connection.onicecandidate = (ev) => {
            console.log("ICE created, sending...");
            this.channel.sendMessage({
                type: MessageType.ICE,
                payload: { profile, candidate: ev.candidate },
            });
        };

        this.connection.onnegotiationneeded = (ev) => {
            console.log("Renegotiation needed");
        };

        this.connection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.dataChannel.onmessage = (ev) => {
                if (this.dtMessageHandler) {
                    this.dtMessageHandler(JSON.parse(ev.data));
                }
            };
            this.dataChannel.onopen = () => {
                if (this.dtOpenHandler) {
                    this.dtOpenHandler();
                }
            };
        };

        for (const t of tracks) {
            this.connection.addTrack(t);
        }
    }

    public sendDTMessage(message: any) {
        if (this.dataChannel) {
            if (this.dataChannel.readyState === "open") {
                this.dataChannel.send(JSON.stringify(message));
                return { sent: true, message: "" };
            } else {
                return { sent: false, message: "No open channel to send data through" };
            }
        } else {
            return { sent: false, message: "No channel to send data through" };
        }
    }

    private async messageHandler(message: Message) {
        console.log("Message received", message);
        switch (message.type) {
            case MessageType.SDP: {
                console.log("SDP", message.payload.sdp);
                await this.connection.setRemoteDescription(message.payload.sdp);
                const answer = await this.connection.createAnswer();
                await this.connection.setLocalDescription(answer);
                this.channel.sendMessage({
                    type: MessageType.Answer,
                    payload: { profile: this.profile, answer },
                });
                break;
            }

            case MessageType.ICE: {
                await this.connection.addIceCandidate(message.payload.candidate);
                break;
            }

            case MessageType.NoHost: {
                if (this.onNoHost) {
                    this.onNoHost();
                }
                break;
            }

            default: {
                console.log("Unknown message type", message);
            }
        }
    }

    public getStream() {
        return this.stream;
    }
}