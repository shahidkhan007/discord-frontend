import { ConfigProvider, Flex, Spin, Typography, theme } from "antd";
import { createContext, useCallback, useEffect, useState } from "react";
import { v5 } from "uuid";
import { Host } from "./Host";
import { Viewer } from "./Viewer";
import { CreateProfile, NAMESPACE } from "./components/CreateProfile";
import { AppCtxType, Profile } from "./types";

export const BASE_URL = process.env.NODE_ENV === "development" ? "http://127.0.0.1:4241" : "";
export const AppCtx = createContext({} as AppCtxType);

function App() {
    const [dp, setDP] = useState("");
    const [role, setRole] = useState<"undecided" | "host" | "viewer">("undecided");
    const [profile, setProfile] = useState<Profile | null>(null);

    async function checkForHost(): Promise<Profile | null> {
        try {
            const response = await fetch(BASE_URL + "/api/host");
            const body = await response.json();

            return body.profile;
        } catch (err) {
            return null;
        }
    }

    const getVersion = async () => {
        const res = await fetch(BASE_URL + "/api/version");
        const json = await res.json();
        if (json.version) {
            localStorage.setItem("version", json.version.toString());
        }
        return json.version ?? null;
    };

    const decideRole = useCallback(async () => {
        const host = await checkForHost();
        const version = await getVersion();

        if (version && version !== parseInt(localStorage.getItem("version") ?? "0")) {
            localStorage.clear();
            return window.location.reload();
        }

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
            localStorage.setItem(
                profileKey,
                JSON.stringify({
                    ...JSON.parse(localProfile),
                    id: v5(Math.ceil(Math.random() * 1e9).toString(), NAMESPACE),
                })
            );
            setProfile(JSON.parse(localProfile));
            setDP(localStorage.getItem(`dp-${JSON.parse(localProfile).id}`) ?? "");
        }
    }, []);

    useEffect(() => {
        decideRole();
    }, [decideRole]);

    return (
        <AppCtx.Provider value={{ profile, dp }}>
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
