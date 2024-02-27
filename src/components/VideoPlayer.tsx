import { Flex } from "antd";
import { useEffect, useRef } from "react";

type Props = {
    stream: MediaStream;
    width: number;
    height: number;
};

export const VideoPlayer = (props: Props) => {
    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (props.stream && ref.current) {
            ref.current.srcObject = props.stream;
            ref.current.onloadeddata = () => {
                ref.current?.play();
            };
        }
    }, [props.stream]);

    return (
        <Flex>
            <video
                ref={ref}
                width={props.width}
                height={props.height}
                style={{ borderRadius: "8px" }}
            />
        </Flex>
    );
};
