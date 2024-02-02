import { AudioMutedOutlined, MutedOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Flex, Layout, List, Tag, Typography } from "antd";
import Sider from "antd/es/layout/Sider";
import { Content, Footer } from "antd/es/layout/layout";
import { CSSProperties, useContext, useRef, useState } from "react";
import { AppCtx } from "./App";
import { SignalingChannel, WebRTCHost } from "./WebRTC";
import { Chat } from "./components/Chat";
import { Connect } from "./components/Connect";
import { Profile } from "./types";

const siderStyles: CSSProperties = {
    // backgroundColor: "#424549",
    // borderTopRightRadius: "16px",
    borderBottomRightRadius: "16px",
};

const getNameChars = (name: string) => {
    return name
        .split(" ")
        .map((part) => part[0].toUpperCase())
        .join("")
        .slice(0, 2);
};

export const Host = () => {
    const { profile } = useContext(AppCtx);
    const stream = useRef<MediaStream | null>(null);
    const scrStream = useRef<MediaStream | null>(null);
    const [mediaOpts, setMediaOpts] = useState<any>({
        screen: false,
        voice: false,
        allRemoteMuted: false,
        localMuted: false,
        scrTracks: [],
        voiceTracks: [],
    });
    const [viewers, setViewers] = useState<{
        [key: string]: Profile & {
            status: string;
            el: HTMLAudioElement;
            webrtc: WebRTCHost | null;
        };
    }>({});
    // const [webrtc, setWebrtc] = useState<WebRTCHost | null>(null);
    const [state, setState] = useState<any>({
        connectionState: "new",
        existingHost: null,
    });
    const channel = useRef<SignalingChannel | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    const createConnection = async (viewer: Profile) => {
        console.log("Create connection request", viewer);

        const el = document.createElement("audio");
        el.id = viewer.id;
        document.body.appendChild(el);

        const webrtc = new WebRTCHost(
            profile!,
            channel.current!,
            stream.current?.getAudioTracks() ?? []
        );
        webrtc.setViewerProfile(viewer);

        setViewers((vs) => {
            return { ...vs, [viewer.id]: { ...viewer, status: "new", el, webrtc } };
        });

        webrtc.onConnectionStateChange = async (viewer, state) => {
            console.log("Connection state changed");

            setViewers((vs) => {
                if (!vs[viewer.id]) {
                    return vs;
                }

                if (state === "connected") {
                    vs[viewer.id].el.srcObject = webrtc.getStream();
                    vs[viewer.id].el.onloadeddata = () => {
                        vs[viewer.id].el.play();
                    };

                    vs[viewer.id].webrtc?.createDataChannel((message) => {
                        console.log(message);
                        setMessages((msgs) => [...msgs, message]);
                        broadcastDTMessage(message, viewer.id);
                    });
                }

                return {
                    ...vs,
                    [viewer.id]: { ...vs[viewer.id], status: state },
                };
            });

            if (state === "disconnected") {
                setViewers((vs) =>
                    Object.fromEntries(Object.entries(vs).filter((entry) => entry[0] !== viewer.id))
                );
            }
        };

        webrtc.onTrackAdded = (track) => {
            for (const v of Object.values(viewers)) {
                if (v.id === viewer.id) {
                    continue;
                }
                v.webrtc?.addTrack(track);
            }
        };

        await webrtc.initiate();
    };

    const connect = async () => {
        setState({ ...state, connectionState: "connecting" });

        channel.current = new SignalingChannel(profile);

        channel.current.createConnhandler = createConnection;

        channel.current.onHostAlreadyExists = (hostProfile) => {
            setState({
                ...state,
                existingHost: hostProfile,
                connectionState: "host-already-exists",
            });
        };

        channel.current.onUserCreated = () => {
            setState({ ...state, connectionState: "connected" });
        };

        channel.current.initiate();

        try {
            stream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });
            setMediaOpts({
                ...mediaOpts,
                voice: true,
                voiceTracks: stream.current.getAudioTracks().map((t) => t.id),
            });
        } catch (err) {
            console.log(err);
        }
    };

    const toggleLocalStream = () => {
        if (stream.current) {
            for (const track of stream.current.getAudioTracks()) {
                track.enabled = !track.enabled;
            }
        }
        setMediaOpts({ ...mediaOpts, localMuted: !mediaOpts.localMuted });
    };

    const toggleRemoteStream = (el: HTMLAudioElement) => {
        if (el) {
            el.volume = el.volume === 0 ? 1 : 0;
        }
    };

    const toggleAllRemoteStreams = () => {
        for (const viewer of Object.values(viewers)) {
            toggleRemoteStream(viewer.el);
        }
        setMediaOpts({ ...mediaOpts, allRemoteMuted: !mediaOpts.allRemoteMuted });
    };

    const shareScreen = async () => {
        try {
            scrStream.current = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true,
            });

            console.log("Tab tracks:", scrStream.current.getAudioTracks());

            for (const track of scrStream.current.getAudioTracks()) {
                track.contentHint = "music";
                for (const v of Object.values(viewers)) {
                    v.webrtc?.addTrack(track);
                }
            }

            setMediaOpts({
                ...mediaOpts,
                screen: true,
                scrTracks: scrStream.current.getAudioTracks().map((t) => t.id),
            });
        } catch (err) {
            console.log(err);
        }
    };

    const stopScrSharing = () => {
        if (scrStream.current) {
            scrStream.current.getTracks().forEach((track) => {
                track.stop();
                stream.current?.removeTrack(track);
            });
            setMediaOpts({ ...mediaOpts, screen: false, scrTracks: [] });
            scrStream.current = null;
        }
    };

    const broadcastDTMessage = (message: any, filterId: string | null) => {
        for (const v of Object.values(viewers)) {
            if (v.id === filterId) {
                continue;
            }
            v.webrtc?.sendDTMessage(message);
        }
    };

    return (
        <Layout style={{ height: "100vh" }} hasSider={true}>
            <Sider style={siderStyles} width="30%">
                <Typography.Title style={{ color: "#fff", textAlign: "center" }} level={5}>
                    Viewers
                </Typography.Title>
                <Divider />

                <Viewers viewers={viewers} />

                <Divider />

                <Flex align="end" justify="center" gap="middle">
                    <Button
                        icon={<AudioMutedOutlined />}
                        size="large"
                        danger={mediaOpts.localMuted}
                        onClick={toggleLocalStream}
                    />
                    <Button
                        icon={<MutedOutlined />}
                        size="large"
                        danger={mediaOpts.allRemoteMuted}
                        onClick={toggleAllRemoteStreams}
                    />
                </Flex>
            </Sider>
            <Layout>
                <Content>
                    {state.connectionState === "connected" ? (
                        <Chat
                            messages={messages}
                            sendMessage={(message: any) => {
                                setMessages([...messages, message]);
                                broadcastDTMessage(message, null);
                            }}
                        />
                    ) : (
                        <Connect state={state.connectionState} onClick={connect} />
                    )}
                </Content>
                <Footer>
                    <Divider />
                    <Flex justify="center" align="center">
                        <Button
                            type="primary"
                            size="large"
                            danger={mediaOpts.screen}
                            onClick={mediaOpts.screen ? stopScrSharing : shareScreen}
                        >
                            {mediaOpts.screen ? "Stop screen sharing" : "Share screen"}
                        </Button>
                    </Flex>
                </Footer>
            </Layout>
        </Layout>
    );
};

const statusColors: any = {
    new: "default",
    connecting: "processing",
    failed: "error",
    connected: "success",
    disconnected: "volcano",
};

const Viewers = (props: any) => {
    return (
        <List
            style={{ height: "calc(100% - 96px - 24px - 40px - 28px - 12px)" }}
            dataSource={Object.values(props.viewers) as any[]}
            size="small"
            renderItem={(viewer, index) => (
                <List.Item key={viewer.id}>
                    <List.Item.Meta
                        style={{ alignItems: "center" }}
                        avatar={<Avatar size="large">{getNameChars(viewer.name)}</Avatar>}
                        title={<Typography.Text>{viewer.name}</Typography.Text>}
                    />
                    <Tag color={(statusColors[viewer.status] as any) ?? "default"}>
                        {viewer.status}
                    </Tag>
                </List.Item>
            )}
        />
    );
};
