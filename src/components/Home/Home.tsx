import { Anchor, Container } from "@mantine/core";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";
import { Welcome } from "../Welcome/Welcome";
import { Link } from "react-router-dom";

export const HomePage = () => {
    return (
        <>
            <Welcome />
            <ColorSchemeToggle />
            <Container ta="center">
                <Anchor component={Link} to="/ruleset">
                    Go Find a Ruleset
                </Anchor>
            </Container>
        </>
    );
};
