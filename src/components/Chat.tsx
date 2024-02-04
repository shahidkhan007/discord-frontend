import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Divider, Flex, Input, List, Typography } from "antd";
import Layout, { Content, Footer } from "antd/es/layout/layout";
import { useContext, useEffect, useState } from "react";
import { AppCtx } from "../App";
import { getNameChars } from "../Host";
import { ChatMessage, TextMessage } from "../types";

type Props = {
    messages: ChatMessage[];
    sendMessage: (messages: string) => void;
    ignoreBottom?: boolean;
};

export const Chat = ({ messages, sendMessage, ignoreBottom }: Props) => {
    const { profile, dp } = useContext(AppCtx);
    const [messageBody, setMessageBody] = useState("");

    useEffect(() => {
        const messageItems = document.querySelectorAll("#chat-message-item");
        if (messageItems.length > 0) {
            const arr = Array.from(messageItems.values());
            arr[arr.length - 1].scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return (
        <Layout>
            <Content>
                <Flex align="center" justify="center" gap="middle" style={{ margin: "24px 0px" }}>
                    <Avatar
                        size={48}
                        src={dp}
                        icon={<UserOutlined />}
                        shape="circle"
                        // style={{ marginTop: "26" }}
                    >
                        {getNameChars(profile?.name ?? "")}
                    </Avatar>
                    <Typography.Title style={{ margin: 0 }} level={4}>
                        {profile?.name}
                    </Typography.Title>
                </Flex>
                <Divider />

                <List
                    style={{
                        // height: "",
                        height: `calc(100vh - 28px - 10px - 27px - 48px - 40px - 48px - ${
                            ignoreBottom ? 0 : 88
                        }px)`,
                        // display: "flex",
                        overflowY: "auto",
                    }}
                    size="small"
                    dataSource={messages}
                    renderItem={(message: TextMessage) => (
                        <List.Item
                            id="chat-message-item"
                            style={{
                                padding: "0px 16px 4px 16px",
                                alignItems: "center",
                                justifyContent: "flex-start",
                            }}
                        >
                            <List.Item.Meta
                                style={{ flex: 0 }}
                                avatar={
                                    <Avatar
                                        style={{
                                            backgroundColor: message.sender.color ?? "#7289da",
                                        }}
                                    >
                                        {getNameChars(message.sender.name)}
                                    </Avatar>
                                }
                            />
                            <Typography.Paragraph
                                strong
                                code
                                style={{ margin: 0, color: message.sender.color ?? "#7289da" }}
                            >
                                {message.data.body}
                            </Typography.Paragraph>
                        </List.Item>
                    )}
                    split={false}
                />
            </Content>
            <Footer>
                <Input.Search
                    autoFocus
                    value={messageBody}
                    onSearch={(value, _, __) => {
                        if (value.length === 0) {
                            return;
                        }
                        setMessageBody("");
                        sendMessage(value);
                    }}
                    onChange={(ev) => setMessageBody(ev.target.value)}
                    placeholder="Type something..."
                    size="large"
                    enterButton={<Button type="primary" icon={<SendOutlined />} />}
                />
            </Footer>
        </Layout>
    );
};
