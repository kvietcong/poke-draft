import { Container, Group, Text, Anchor } from "@mantine/core";
import classes from "./Header.module.css";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import supabase from "@/supabase";
import { profileTable } from "@/util/database";
import { useSessionStore } from "@/stores";

export const Header = () => {
    const session = useSessionStore((state) => state.session);
    const { pathname } = useLocation();
    const [links, setLinks] = useState<{ link: string; label: string }[]>([]);
    const [displayName, setDisplayName] = useState<string | null>(null);

    useEffect(() => {
        const newLinks = [
            { link: "/", label: "Home" },
            { link: "/ruleset", label: "Point Rule Sets" },
            { link: "/game", label: "Games" },
            {
                link: "/account",
                label: session
                    ? `${displayName ?? session.user.user_metadata.name ?? "Me"}`
                    : "Sign In",
            },
        ];
        setLinks(newLinks);
    }, [session, displayName]);

    useEffect(() => {
        if (!session) return;
        const fetchName = async () => {
            const { data, error } = await supabase
                .from(profileTable)
                .select("display_name")
                .eq("id", session.user.id)
                .single();
            if (error) return console.error(error);
            if (!data) return console.log("No data received!");
            setDisplayName(data.display_name);
        };
        fetchName();
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
