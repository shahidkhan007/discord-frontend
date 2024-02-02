import { ConfigProvider, Flex, Spin, Typography, theme } from "antd";
import { createContext, useCallback, useEffect, useState } from "react";
import { Host } from "./Host";
import { Viewer } from "./Viewer";
import { CreateProfile } from "./components/CreateProfile";
import { AppCtxType, Profile } from "./types";

const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
export const BASE_URL = process.env.NODE_ENV === "development" ? "http://127.0.0.1:4241" : "/";
export const AppCtx = createContext({} as AppCtxType);

function App() {
    const [role, setRole] = useState<"undecided" | "host" | "viewer">("undecided");
    const [profile, setProfile] = useState<Profile | null>(null);

    const [name, setName] = useState("");

    async function checkForHost(): Promise<Profile | null> {
        try {
            const response = await fetch(BASE_URL + "/api/host");
            const body = await response.json();

            return body.profile;
        } catch (err) {
            return null;
        }
    }

    const decideRole = useCallback(async () => {
        const host = await checkForHost();

        let profileKey;

        if (host) {
            setRole("viewer");
            profileKey = "viewerProfile";
        } else {
            setRole("host");
            profileKey = "hostProfile";
        }

        const localProfile = localStorage.getItem(profileKey);
        console.log("Decided role", host ? "viewer" : "host", localProfile);
        if (localProfile) {
            setProfile(JSON.parse(localProfile));
        }
    }, []);

    useEffect(() => {
        decideRole();
    }, [decideRole]);

    return (
        <AppCtx.Provider value={{ profile }}>
            <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                {role === "host" ? (
                    profile ? (
                        <Host />
                    ) : (
                        <CreateProfile role="host" />
                    )
                ) : role === "viewer" ? (
                    profile ? (
                        <Viewer />
                    ) : (
                        <CreateProfile role="viewer" />
                    )
                ) : (
                    <Flex style={{ height: "100vh" }} justify="center" align="center" vertical>
                        <Spin size="large" />
                        <Typography.Title level={5}>
                            Please wait while we set stuff up :)
                        </Typography.Title>
                    </Flex>
                )}
            </ConfigProvider>
        </AppCtx.Provider>
    );
}

export default App;
