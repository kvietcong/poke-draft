import { AppContext } from "@/App";
import { Container, Group, Text, Anchor } from "@mantine/core";
import classes from "./Header.module.css";
import { Link, useLocation } from "react-router-dom";
import { useContext, useEffect, useState } from "react";

export const Header = () => {
    const { session } = useContext(AppContext);
    const { pathname } = useLocation();
    const [links, setLinks] = useState<{ link: string; label: string }[]>([]);

    useEffect(() => {
        const newLinks = [
            { link: "/", label: "Home" },
            { link: "/ruleset", label: "Rule Sets" },
            { link: "/game", label: "Games" },
            {
                link: "/account",
                label: session
                    ? `${session.user.user_metadata.name}` || "Me"
                    : "Sign In",
            },
        ];
        setLinks(newLinks);
    }, [session]);

    const items = links.map((link) => (
        <Anchor
            key={link.label}
            to={link.link}
            className={classes.link}
            data-active={
                (pathname.length > 1 && pathname.endsWith("/")
                    ? pathname.slice(0, -1)
                    : pathname) === link.link || undefined
            }
            component={Link}
        >
            {link.label}
        </Anchor>
    ));

    return (
        <header className={classes.header}>
            <Container size="md" className={classes.inner}>
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
                <Group gap={5}>{items}</Group>
            </Container>
        </header>
    );
};
