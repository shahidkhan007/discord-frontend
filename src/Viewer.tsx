import { useRef, useState } from "react";
import { v5 } from "uuid";
import { SignalingChannel, WebRTCViewer } from "./WebRTC";
import { Profile, UserRole } from "./types";

const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

export const Viewer = () => {
    const _webrtc = useRef<WebRTCViewer | null>(null);
    const audioEl = useRef<HTMLAudioElement | null>(null);
    const [name, setName] = useState("");
    const [noHost, setNoHost] = useState(false);
    const stream = useRef<MediaStream | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    const connect = async () => {
        const profile = JSON.parse(localStorage.getItem("viewerProfile")!) as Profile;

        stream.current = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

        const sigChan = new SignalingChannel(profile);
        sigChan.initiate();

        const webrtc = new WebRTCViewer(sigChan, profile, stream.current!.getAudioTracks());
        _webrtc.current = webrtc;

        _webrtc.current.onConnected = async (stream) => {
            setNoHost(false);
            if (audioEl.current) {
                audioEl.current.srcObject = stream;
                await audioEl.current.play();
            }
        };

        _webrtc.current.onNewTrackAdded = async (stream) => {
            if (audioEl.current) {
                audioEl.current.srcObject = stream;
                if (audioEl.current.paused) {
                    await audioEl.current.play();
                }
            }
        };

        _webrtc.current.dtMessageHandler = (message) => {
            console.log(message);
            setMessages((msgs) => [...msgs, message]);
        };

        _webrtc.current.onNoHost = () => {
            setNoHost(true);
        };
    };

    return window.localStorage.getItem("viewerProfile") ? (
        <div>
            <h1>Viewer</h1>
            <button onClick={connect}>Connect</button>
            <audio ref={audioEl} controls />
            {noHost && <p>No host found, please try again later</p>}
        </div>
    ) : (
        <form
            onSubmit={(ev) => {
                ev.preventDefault();

                window.localStorage.setItem(
                    "viewerProfile",
                    JSON.stringify({
                        name,
                        id: v5(name + Math.ceil(Math.random() * 1e6), NAMESPACE),
                        role: UserRole.Viewer,
                    })
                );

                window.location.reload();
            }}
        >
            <input
                type="text"
                value={name}
                onChange={(ev) => {
                    setName(ev.target.value);
                }}
            />
            <button type="submit">Set name</button>
        </form>
    );
};
