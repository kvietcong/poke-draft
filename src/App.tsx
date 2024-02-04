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

type AppContext = {
    session: Session | null;
    setSession: React.Dispatch<React.SetStateAction<Session | null>>;
};
export const AppContext = createContext<AppContext>({
    session: null,
    setSession: () => {},
});

export default function App() {
    const [session, setSession] = useState<Session | null>(null);

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
        <AppContext.Provider value={{ session, setSession }}>
            <MantineProvider defaultColorScheme="auto" theme={theme}>
                <Notifications autoClose={1800} />
                <Router />
                <SpeedInsights />
            </MantineProvider>
        </AppContext.Provider>
    );
}
