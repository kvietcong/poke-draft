import { create } from "zustand";
import { getLocalPreference, setLocalPreference } from "./util/helpers";
import { Session } from "@supabase/supabase-js";

export type SessionStore = { session: Session | null; setSession: (s: Session | null) => void };
export const useSessionStore = create<SessionStore>((set) => {
    return {
        session: null,
        setSession: (session: Session | null) => { set({ session }); },
    };
})

export type PreferenceStore = { prefersMinimal: boolean; setPrefersMinimal: (b: boolean) => void };
export const usePreferenceStore = create<PreferenceStore>((set) => {
    return {
        prefersMinimal: getLocalPreference("prefersMinimal") === "true",
        setPrefersMinimal: (prefersMinimal: boolean) => {
            setLocalPreference("prefersMinimal", String(prefersMinimal));
            set(state => ({ ...state, prefersMinimal }))
        },
    }
})
