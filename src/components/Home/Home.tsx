import { Anchor, Stack, Text } from "@mantine/core";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";
import { Welcome } from "../Welcome/Welcome";
import { Link } from "react-router-dom";
import { useIsThinScreen } from "@/util/helpers";

export const HomePage = () => {
    const isThinScreen = useIsThinScreen();

    return (
        <Stack align="center" w={isThinScreen ? "95%" : "80%"} m="auto">
            <Welcome />
            <ColorSchemeToggle />
            <Anchor component={Link} to="/ruleset">
                Go Find a Ruleset
            </Anchor>
            <Text>
                This is a website that let's you draft Pokemon with your friends
                live! Very much in beta. There will be the ability to create
                games and rulesets soon.
            </Text>
        </Stack>
    );
};
