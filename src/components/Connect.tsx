import { Button, Flex, Typography } from "antd";

type Props = {
    state: string;
    onClick: () => void;
};

export const Connect = (props: Props) => {
    return (
        <Flex justify="center" align="center" style={{ height: "100%" }}>
            {props.state === "host-already-exists" ? (
                <Typography.Text>A host already exists :(</Typography.Text>
            ) : (
                <Button
                    type="primary"
                    size="large"
                    loading={props.state === "connecting"}
                    onClick={props.onClick}
                >
                    Connect
                </Button>
            )}
        </Flex>
    );
};
