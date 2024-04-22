import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Router } from "./Router";
import { theme } from "./theme";

import { SpeedInsights } from "@vercel/speed-insights/react";
import React, { createContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import supabase from "./supabase";
import { getLocalPreference, setLocalPreference } from "./util/helpers";

export type AppContext = {
    session: Session | null;
    setSession: React.Dispatch<React.SetStateAction<Session | null>>;
    prefersMinimal: boolean;
    setPrefersMinimal: (newValue: boolean) => void;
};
export const AppContext = createContext<AppContext>({
    session: null,
    setSession: () => {},
    prefersMinimal: false,
    setPrefersMinimal: () => {},
});

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [prefersMinimal, setPrefersMinimal] = useState(false);

    const setPrefersMinimalWrapper = (newValue: boolean) => {
        setLocalPreference("prefersMinimal", String(newValue));
        setPrefersMinimal(newValue);
    };

    useEffect(() => {
        const localPreference = getLocalPreference("prefersMinimal");
        if (localPreference) setPrefersMinimal(localPreference === "true");
        else setPrefersMinimalWrapper(false);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    return (
        <AppContext.Provider
            value={{
                session,
                setSession,
                prefersMinimal,
                setPrefersMinimal: setPrefersMinimalWrapper,
            }}
        >
            <MantineProvider defaultColorScheme="auto" theme={theme}>
                <Notifications autoClose={1800} />
                <Router />
                <SpeedInsights />
            </MantineProvider>
        </AppContext.Provider>
    );
}
