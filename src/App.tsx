import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Router } from "./Router";

import { SpeedInsights } from "@vercel/speed-insights/react";
import supabase from "./supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "./stores";
import { useEffect } from "react";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
        },
    },
});

const theme = createTheme({
    fontFamily: "\"Pixelify Sans\", sans-serif",
})

export default function App() {
    const setSession = useSessionStore((state) => state.setSession);

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
        <QueryClientProvider client={queryClient}>
            <MantineProvider defaultColorScheme="auto" theme={theme}>
                <Notifications autoClose={1800} />
                <Router />
                <SpeedInsights />
            </MantineProvider>
        </QueryClientProvider>
    );
}
