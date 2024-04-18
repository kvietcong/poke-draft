import { AppContext } from "@/App";
import { useContext, useEffect, useState } from "react";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "@/supabase";
import {
    Anchor,
    Button,
    Container,
    Grid,
    Image,
    Stack,
    Text,
    TextInput,
    Title,
    useMantineColorScheme,
} from "@mantine/core";
import classes from "@/App.module.css";
import { Link } from "react-router-dom";
import { ColorSchemeToggle } from "@/components/ColorSchemeToggle/ColorSchemeToggle";
import { notifications } from "@mantine/notifications";
import { changeUsername, fetchUsername } from "@/util/database";

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
    const { session, prefersMinimal, setPrefersMinimal } =
        useContext(AppContext);
    if (!session)
        return (
            <Anchor to="/" component={Link}>
                Go Home
            </Anchor>
        );

    const [username, setUsername] = useState("There!");

    const [newUsername, setNewUsername] = useState("");
    const changeName = async () => {
        const newUsernameClean = newUsername.trim();
        if (!newUsernameClean || newUsernameClean.length < 2)
            return notifications.show({
                color: "red",
                title: "Invalid Username",
                message: `You can't use "${newUsernameClean}" as your username`,
            });
        const error = await changeUsername(supabase, session, newUsernameClean);
        if (error)
            return notifications.show({
                color: "red",
                title: "Couldn't update username",
                message: error.message,
            });
        setUsername(newUsernameClean);
    };

    useEffect(() => {
        (async () => {
            const username = await fetchUsername(supabase, session);
            setUsername(username);
        })();
    }, [session]);

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
                    {username}!
                </Text>
            </Title>
            <Container ta="center" w="50%">
                <Grid>
                    <Grid.Col span={9}>
                        <TextInput
                            placeholder="Choose your new name!"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            w="100%"
                        />
                    </Grid.Col>
                    <Grid.Col span={3}>
                        <Button w="100%" onClick={changeName}>
                            Change Name
                        </Button>
                    </Grid.Col>
                </Grid>
                <Stack>
                    <ColorSchemeToggle />
                    <Button onClick={() => setPrefersMinimal(!prefersMinimal)}>
                        Toggle Minimal Preference (Now Preferring{" "}
                        {prefersMinimal ? "Minimal" : "Full"} View)
                    </Button>
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
