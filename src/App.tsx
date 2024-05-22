import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Router } from "./Router";
import { theme } from "./theme";

import { SpeedInsights } from "@vercel/speed-insights/react";
import supabase from "./supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSessionStore } from "./Stores";
import { useEffect } from "react";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
        },
    },
});

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
