import { Flex, Layout } from "antd";
import Search from "antd/es/input/Search";
import { Content } from "antd/es/layout/layout";
import { v5 } from "uuid";
import { Profile, UserRole } from "../types";

const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

export const CreateProfile = ({ role }: any) => {
    const handleSubmit = (name: string, ev: any, info: any) => {
        ev.preventDefault();

        const profile: Profile = {
            id: v5(name + Math.ceil(Math.random() * 1e6), NAMESPACE),
            name,
            role: role === "viewer" ? UserRole.Viewer : UserRole.Host,
        };

        localStorage.setItem(role + "Profile", JSON.stringify(profile));
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
                >
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
