import { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "@/supabase";
import {
    Anchor,
    Button,
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
import { changeUsername } from "@/util/database";
import { usePreferenceStore, useSessionStore } from "@/stores";
import { useProfileQuery } from "@/queries";
import { useIsThinScreen } from "@/util/helpers";

export const LoginView = () => {
    const { colorScheme } = useMantineColorScheme();
    const isThinScreen = useIsThinScreen();
    const w = isThinScreen ? "95%" : "85%";
    const getAutoColorScheme = () => {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    };

    return (
        <Stack w={w} m="auto">
            <Title className={classes.title} ta="center">
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
            <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={["google", "discord", "github", "twitch"]}
                theme={
                    colorScheme === "auto" ? getAutoColorScheme() : colorScheme
                }
                onlyThirdPartyProviders
            />
        </Stack>
    );
};

export const MyProfileView = () => {
    const { prefersMinimal, togglePrefersMinimal } = usePreferenceStore();
    const session = useSessionStore((state) => state.session);
    const profileQuery = useProfileQuery(session?.user.id);
    const [newUsername, setNewUsername] = useState("");
    const isThinScreen = useIsThinScreen();
    const w = isThinScreen ? "95%" : "85%";

    if (profileQuery.isError) throw new Error("Couldn't get profile");

    if (!session || profileQuery.isPending)
        return (
            <Anchor to="/" component={Link}>
                Go Home
            </Anchor>
        );

    const profile = profileQuery.data;
    const username = profile.name;
    const changeName = async () => {
        const newUsernameClean = newUsername.trim();
        if (!newUsernameClean || newUsernameClean.length < 2)
            return notifications.show({
                color: "red",
                title: "Invalid Username",
                message: `You can't use "${newUsernameClean}" as your username`,
            });
        const error = await changeUsername(profile.id, newUsernameClean);
        if (error)
            return notifications.show({
                color: "red",
                title: "Couldn't update username",
                message: error.message,
            });
        profileQuery.refetch();
    };

    return (
        <Stack ta="center" m="auto" w={w}>
            <Title className={classes.title} ta="center">
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
                <Button onClick={togglePrefersMinimal}>
                    Toggle Minimal Preference (Now Preferring{" "}
                    {prefersMinimal ? "Minimal" : "Full"} View)
                </Button>
                <Button onClick={() => supabase.auth.signOut()}>Log out</Button>
                <Image
                    src={
                        session.user.user_metadata.avatar_url ||
                        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
                    }
                    alt="User Avatar"
                />
            </Stack>
        </Stack>
    );
};

export const ProfilePage = () => {
    const session = useSessionStore((state) => state.session);

    return session ? <MyProfileView /> : <LoginView />;
};
