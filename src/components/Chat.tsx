import { SendOutlined } from "@ant-design/icons";
import { Button, Divider, Input, List, Typography } from "antd";
import Layout, { Content, Footer } from "antd/es/layout/layout";
import { useContext, useState } from "react";
import { AppCtx } from "../App";

export const Chat = ({ messages, sendMessage }: any) => {
    const { profile } = useContext(AppCtx);
    const [messageBody, setMessageBody] = useState("");

    return (
        <Layout>
            <Content>
                <Typography.Title style={{ textAlign: "center" }} level={4}>
                    {profile?.name}
                </Typography.Title>
                <Divider />

                <List
                    style={{
                        height: "calc(100vh - 28px - 10px - 27px - 48px - 40px - 48px - 88px)",
                    }}
                    size="small"
                    dataSource={messages}
                    renderItem={(message) => <List.Item>{JSON.stringify(message)}</List.Item>}
                />
            </Content>
            <Footer>
                <Input.Search
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
