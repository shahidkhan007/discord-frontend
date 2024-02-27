import { Flex, Layout } from "antd";
import Search from "antd/es/input/Search";
import { Content } from "antd/es/layout/layout";
import { ChangeEvent, useRef, useState } from "react";
import { v5 } from "uuid";
import "../index.css";
import { Profile, UserRole } from "../types";

export const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
const COLORS: string[] = [
    "#7289da",
    "#9656ce",
    "#ed5555",
    "#00ff7f",
    "#fff176",
    "#e0f7fa",
    "#26a69a",
];

export const CreateProfile = ({ role }: any) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [imageURL, setImageURL] = useState("");

    const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
        const reader = new FileReader();
        reader.onload = () => {
            setImageURL(reader.result as string);
        };
        if (ev.target.files && ev.target.files.length > 0) {
            reader.readAsDataURL(ev.target.files[0]);
        }
    };

    const handleSubmit = (name: string, ev: any, info: any) => {
        ev.preventDefault();

        const profile: Profile = {
            id: v5(Math.ceil(Math.random() * 1e9).toString(), NAMESPACE),
            name,
            role: role === "viewer" ? UserRole.Viewer : UserRole.Host,
            color: COLORS[Math.ceil(Math.random() * 100) % COLORS.length],
        };

        localStorage.setItem(role + "Profile", JSON.stringify(profile));
        if (imageURL) {
            localStorage.setItem(`dp-${profile.id}`, imageURL);
        }
        window.location.reload();
    };

    return (
        <Layout style={{ height: "100vh" }}>
            <Content style={{ display: "flex" }}>
                <Flex
                    style={{ width: "50%", margin: "auto" }}
                    vertical
                    justify="center"
                    align="center"
                    gap="middle"
                >
                    {/* <Flex vertical gap="middle" align="center">
                        <Avatar size={128} shape="circle" src={imageURL} icon={<UserOutlined />} />

                        <Button
                            type="primary"
                            onClick={() => {
                                inputRef.current?.click();
                            }}
                        >
                            Upload
                        </Button>
                        <input
                            type="file"
                            ref={inputRef}
                            onChange={handleChange}
                            style={{ display: "none" }}
                            accept="image/*"
                        />
                    </Flex> */}
                    <Search
                        placeholder="Enter name"
                        enterButton="Set name"
                        size="large"
                        onSearch={handleSubmit}
                    />
                </Flex>
            </Content>
        </Layout>
    );
};
