import { AudioMutedOutlined, RedoOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Flex, Layout, List, Slider, Tag, Typography } from "antd";
import Sider from "antd/es/layout/Sider";
import { Content, Footer, Header } from "antd/es/layout/layout";
import { useContext, useRef, useState } from "react";
import { AppCtx } from "./App";
import { getNameChars } from "./Host";
import { SignalingChannel, WebRTCViewer } from "./WebRTC";
import { Chat } from "./components/Chat";
import { Connect } from "./components/Connect";
import { ChatMessageType, Profile, TextMessage } from "./types";

export const Viewer = () => {
    const { profile, joinElRef, leaveElRef, isWindowActive, setIsWindowActive, setNMessages } =
        useContext(AppCtx);
    const [status, setStatus] = useState({
        connectionStatus: "new",
        audio: true,
        voice: true,
        noHost: false,
    });
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const webrtc = useRef<WebRTCViewer | null>(null);
    const channel = useRef<SignalingChannel | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const [audioEls, setAudioEls] = useState<{
        [key: string]: { el: HTMLAudioElement; label: string; volume: number };
    }>({});
    const [messages, setMessages] = useState<TextMessage[]>([]);
    const [viewers, setViewers] = useState<Profile[]>([]);

    const connect = async () => {
        setStatus((s) => ({ ...s, connectionStatus: "connecting" }));
        channel.current = new SignalingChannel(profile);
        channel.current.initiate();

        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream.current;
            }
        } catch (err) {
            console.log(err);
            setStatus((s) => ({ ...s, connectionStatus: "new" }));
            return;
        }

        webrtc.current = new WebRTCViewer(
            channel.current!,
            profile!,
            localStream.current.getTracks()
        );

        webrtc.current.onNoHost = () => {
            setStatus((s) => ({ ...s, noHost: true }));
        };

        webrtc.current.dtMessageHandler = (message) => {
            switch (message.type) {
                case ChatMessageType.UserConnected: {
                    joinElRef.current?.play();
                    setViewers(message.data.viewers);
                    break;
                }

                case ChatMessageType.UserDisconnected: {
                    leaveElRef.current?.play();
                    setViewers(viewers.filter((v) => v.id === message.sender.id));
                    break;
                }

                case ChatMessageType.Text: {
                    setIsWindowActive((active) => {
                        if (!active) {
                            setNMessages((n) => n + 1);
                        }
                        return active;
                    });

                    setMessages((msgs) => [...msgs, message]);
                    break;
                }
            }
        };

        webrtc.current.onStreamChange = (streams: Map<string, MediaStream>) => {
            console.log("New streams:", streams)
            // remove existing streams
            for (const stream of Object.values(audioEls)) {
                stream.el.remove();
            }

            // replace with new streams
            const newEls: any = {};
            for (const [id, stream] of streams.entries()) {
                const el = document.createElement("video");
                el.srcObject = stream;
                el.controls = true;
                el.onloadeddata = () => {
                    el.play();
                };
                document.body.appendChild(el);

                newEls[id] = {
                    id,
                    label: stream.getTracks()[0]?.label ?? "None",
                    el,
                    volume: 100,
                };
            }

            setAudioEls(newEls);
        };

        webrtc.current.onConnected = () => {
            joinElRef.current?.play();
            setStatus((s) => ({ ...s, connectionStatus: "connected" }));
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
            for (const track of localStream.current.getAudioTracks()) {
                track.enabled = !track.enabled;
            }
        }
        setStatus((s) => ({ ...s, voice: !s.voice }));
    };

    const changeVolume = (id: string, vol: number) => {
        audioEls[id].el.volume = vol / 100;
        setAudioEls({ ...audioEls, [id]: { ...audioEls[id], volume: vol } });
    };

    return (
        <Layout style={{ height: "100vh" }}>
            <Sider width="30%">
                <Layout style={{ height: "100%", backgroundColor: "inherit" }}>
                    <Header></Header>
                    <Content>
                        <Divider />
                        <List
                            dataSource={viewers}
                            size="small"
                            renderItem={(viewer, index) => (
                                <List.Item key={viewer?.id}>
                                    <List.Item.Meta
                                        style={{ alignItems: "center" }}
                                        avatar={
                                            <Avatar size="large">
                                                {getNameChars(viewer?.name ?? "")}
                                            </Avatar>
                                        }
                                        title={<Typography.Text>{viewer?.name}</Typography.Text>}
                                    />
                                    <Tag>{viewer.role}</Tag>
                                </List.Item>
                            )}
                        />
                    </Content>
                    <Footer style={{ backgroundColor: "inherit" }}>
                        <Flex vertical>
                            <Flex gap="middle" justify="center">
                                <Button
                                    size="large"
                                    danger={!status.voice}
                                    onClick={toggleLocal}
                                    icon={<AudioMutedOutlined />}
                                />
                                {/* <Button
                                size="large"
                                danger={!status.audio}
                                onClick={toggleRemote}
                                icon={<MutedOutlined />}
                            /> */}
                                <Button
                                    onClick={() => {
                                        localStorage.removeItem("viewerProfile");
                                        window.location.reload();
                                    }}
                                    icon={<RedoOutlined />}
                                    size="large"
                                />
                            </Flex>
                            {Object.entries(audioEls).map((entry) => (
                                <div key={entry[0]}>
                                    <Typography.Text>{entry[1].label}</Typography.Text>
                                    <Slider
                                        value={audioEls[entry[0]].volume}
                                        min={0}
                                        max={100}
                                        onChange={(vol) => changeVolume(entry[0], vol)}
                                    />
                                </div>
                            ))}
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
            <Layout>
                <Content>
                    <video controls ref={localVideoRef} />
                </Content>
            </Layout>
        </Layout>
    );
};
