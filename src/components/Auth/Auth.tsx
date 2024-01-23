import { AppContext } from "@/App";
import { useContext, useEffect } from "react";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "@/supabase";
import {
    Anchor,
    Button,
    Container,
    Image,
    Stack,
    Text,
    Title,
    useMantineColorScheme,
} from "@mantine/core";
import classes from "./Auth.module.css";
import { Link } from "react-router-dom";
import { ColorSchemeToggle } from "../ColorSchemeToggle/ColorSchemeToggle";

export const LoginView = () => {
    const { colorScheme } = useMantineColorScheme();
    const getAutoColorScheme = () => {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    };

    return (
        <>
            <Title className={classes.title} ta="center" mt={100}>
                Login or Sign{" "}
                <Text
                    inherit
                    variant="gradient"
                    component="span"
                    gradient={{ from: "pink", to: "yellow" }}
                >
                    Up
                </Text>
            </Title>
            <Container w="50%">
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={["google", "discord", "github", "twitch"]}
                    theme={
                        colorScheme === "auto"
                            ? getAutoColorScheme()
                            : colorScheme
                    }
                    onlyThirdPartyProviders
                />
            </Container>
        </>
    );
};

export const MyProfileView = () => {
    const { session } = useContext(AppContext);
    if (!session)
        return (
            <Anchor to="/" component={Link}>
                Go Home
            </Anchor>
        );

    return (
        <>
            <Title className={classes.title} ta="center" mt={100}>
                Hello{" "}
                <Text
                    inherit
                    variant="gradient"
                    component="span"
                    gradient={{ from: "pink", to: "yellow" }}
                >
                    {session.user.user_metadata.name || "There"}!
                </Text>
            </Title>
            <Container ta="center" w="50%">
                <Stack>
                    <ColorSchemeToggle />
                    <Button onClick={() => supabase.auth.signOut()}>
                        Log out
                    </Button>
                    <Image
                        src={
                            session.user.user_metadata.avatar_url ||
                            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
                        }
                        alt="User Avatar"
                    />
                </Stack>
            </Container>
        </>
    );
};

export const ProfilePage = () => {
    const { session } = useContext(AppContext);

    return session ? <MyProfileView /> : <LoginView />;
};
