import { AudioMutedOutlined, MutedOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Divider, Flex, Layout, Typography } from "antd";
import Sider from "antd/es/layout/Sider";
import { Content, Footer } from "antd/es/layout/layout";
import { useContext, useRef, useState } from "react";
import { AppCtx } from "./App";
import { SignalingChannel, WebRTCViewer } from "./WebRTC";
import { Chat } from "./components/Chat";
import { Connect } from "./components/Connect";
import { ChatMessageType, TextMessage } from "./types";

export const Viewer = () => {
    const { profile } = useContext(AppCtx);
    const [status, setStatus] = useState({
        connectionStatus: "new",
        audio: true,
        voice: true,
        noHost: false,
    });
    const webrtc = useRef<WebRTCViewer | null>(null);
    const channel = useRef<SignalingChannel | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const audioEl = useRef<HTMLAudioElement | null>(null);
    const [messages, setMessages] = useState<TextMessage[]>([]);

    const connect = async () => {
        setStatus((s) => ({ ...s, connectionStatus: "connecting" }));
        channel.current = new SignalingChannel(profile);
        channel.current.initiate();

        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });
        } catch (err) {
            console.log(err);
            setStatus((s) => ({ ...s, connectionStatus: "new" }));
            return;
        }

        webrtc.current = new WebRTCViewer(
            channel.current!,
            profile!,
            localStream.current.getAudioTracks()
        );

        webrtc.current.onNoHost = () => {
            setStatus((s) => ({ ...s, noHost: true }));
        };

        webrtc.current.onConnected = (s) => {
            setStatus((s) => ({ ...s, connectionStatus: "connected", noHost: false }));
            if (audioEl.current) {
                audioEl.current.srcObject = s;
                audioEl.current.onloadeddata = () => {
                    if (audioEl.current?.paused) {
                        audioEl.current?.play();
                    }
                };
            }
        };

        webrtc.current.onNewTrackAdded = async (s) => {
            if (audioEl.current) {
                audioEl.current.srcObject = s;
                if (audioEl.current.paused) {
                    await audioEl.current.play();
                }
            }
        };

        webrtc.current.dtMessageHandler = (message) => {
            if (message.type === ChatMessageType.Text) {
                setMessages((msgs) => [...msgs, message]);
            }
        };
    };

    const sendMessage = (body: string) => {
        if (webrtc.current && profile) {
            const msg: TextMessage = {
                type: ChatMessageType.Text,
                sender: profile,
                data: { body },
            };
            webrtc.current.sendDTMessage(msg);
            setMessages((msgs) => [...msgs, msg]);
        }
    };

    const toggleLocal = () => {
        if (localStream.current) {
            for (const track of localStream.current.getTracks()) {
                track.enabled = !track.enabled;
            }
        }
        setStatus((s) => ({ ...s, voice: !s.voice }));
    };

    const toggleRemote = () => {
        if (audioEl.current) {
            audioEl.current.volume = audioEl.current.volume === 1 ? 0 : 1;
        }
        setStatus((s) => ({ ...s, audio: !s.audio }));
    };

    return (
        <Layout style={{ height: "100vh" }}>
            <Sider width="30%">
                <Layout style={{ height: "100%", backgroundColor: "inherit" }}>
                    <Content style={{ display: "flex", alignItems: "flex-end" }}>
                        <Divider style={{ marginBottom: 0 }} />
                    </Content>
                    <Footer style={{ backgroundColor: "inherit" }}>
                        <Flex gap="middle" justify="center">
                            <Button
                                size="large"
                                danger={!status.voice}
                                onClick={toggleLocal}
                                icon={<AudioMutedOutlined />}
                            />
                            <Button
                                size="large"
                                danger={!status.audio}
                                onClick={toggleRemote}
                                icon={<MutedOutlined />}
                            />
                            <Button
                                onClick={() => {
                                    localStorage.removeItem("viewerProfile");
                                    window.location.reload();
                                }}
                                icon={<RedoOutlined />}
                                size="large"
                            />
                        </Flex>
                    </Footer>
                </Layout>
            </Sider>
            <Layout>
                <Content>
                    {status.noHost ? (
                        <Typography.Title level={3}>
                            No Host found. sorry :( Refresh the page to become host yourself :)
                        </Typography.Title>
                    ) : status.connectionStatus === "connected" ? (
                        <Chat ignoreBottom messages={messages} sendMessage={sendMessage} />
                    ) : (
                        <Connect state={status.connectionStatus} onClick={connect} />
                    )}
                </Content>
            </Layout>
            <audio ref={audioEl} hidden />
        </Layout>
    );
};
