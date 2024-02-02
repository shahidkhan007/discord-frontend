import { Button, Flex } from "antd";
import { useEffect } from "react";

export const ChooseRole = () => {
    useEffect(() => {}, []);

    return (
        <Flex justify="center" align="center">
            <Button type="primary">Host</Button>
            <Button type="primary">Join</Button>
        </Flex>
    );
};
