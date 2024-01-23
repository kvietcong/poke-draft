import { Container, Group, Anchor, Text } from "@mantine/core";
import classes from "./Footer.module.css";
import { Link } from "react-router-dom";

const links = [
    { link: "/", label: "Repo" },
    { link: "/", label: "Privacy" },
    { link: "/", label: "About" },
];

export const Footer = () => {
    const items = links.map((link) => (
        <Anchor
            c="dimmed"
            key={link.label}
            to={link.link}
            size="sm"
            component={Link}
        >
            {link.label}
        </Anchor>
    ));

    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Anchor component={Link} to="/" className={classes.link}>
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        PokeDraft
                    </Text>
                </Anchor>
                <Group className={classes.links}>{items}</Group>
            </Container>
        </div>
    );
};
