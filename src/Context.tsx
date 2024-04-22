import { ReactNode, createContext, useMemo, useState } from "react";
import { GameInfo, PlayerInfo, PointRulesetInfo, Trade } from "./types";
import { Dex, ModdedDex } from "@pkmn/dex";

export type GamePlayersContext = {
    playerInfoByID?: { [id: string]: PlayerInfo };
    allPlayerInfo?: PlayerInfo[];
    setAllPlayerInfo: React.Dispatch<
        React.SetStateAction<PlayerInfo[] | undefined>
    >;
};
export const GamePlayersContext = createContext<GamePlayersContext>({
    setAllPlayerInfo: () => {},
});
export const GamePlayersProvider = ({ children }: { children: ReactNode }) => {
    const [allPlayerInfo, setAllPlayerInfo] = useState<PlayerInfo[]>();
    const playerInfoByID = useMemo(() => {
        if (!allPlayerInfo) return;
        return allPlayerInfo.reduce<{ [id: string]: PlayerInfo }>(
            (acc, next) => {
                acc[next.id] = next;
                return acc;
            },
            {}
        );
    }, [allPlayerInfo]);

    return (
        <GamePlayersContext.Provider
            value={{ allPlayerInfo, setAllPlayerInfo, playerInfoByID }}
        >
            {children}
        </GamePlayersContext.Provider>
    );
};

export type PointRulesetContext = {
    dex?: ModdedDex;
    pointRulesetInfo?: PointRulesetInfo;
    valueByPokemonID?: { [id: string]: number };
    pokemonIDsByValue?: { [value: string]: string[] };
    setPointRulesetInfo: React.Dispatch<
        React.SetStateAction<PointRulesetInfo | undefined>
    >;
};
export const PointRulesetContext = createContext<PointRulesetContext>({
    setPointRulesetInfo: () => {},
});
export const PointRulesetProvider = ({ children }: { children: ReactNode }) => {
    const [pointRulesetInfo, setPointRulesetInfo] =
        useState<PointRulesetInfo>();

    const dex = useMemo(() => {
        if (!pointRulesetInfo) return;
        return Dex.forGen(pointRulesetInfo.generation);
    }, [pointRulesetInfo]);

    const valueByPokemonID = useMemo(() => {
        if (!pointRulesetInfo) return;
        return pointRulesetInfo.pointRules.reduce<{ [id: string]: number }>(
            (acc, { pokemonID, value }) => {
                acc[pokemonID] = value;
                return acc;
            },
            {}
        );
    }, [pointRulesetInfo]);
    const pokemonIDsByValue = useMemo(() => {
        if (!pointRulesetInfo) return;
        return pointRulesetInfo.pointRules.reduce<{
            [value: string]: string[];
        }>((acc, { pokemonID, value }) => {
            const valueStr = value.toString();
            if (valueStr in acc) acc[valueStr].push(pokemonID);
            else acc[valueStr] = [pokemonID];
            return acc;
        }, {});
    }, [pointRulesetInfo]);

    return (
        <PointRulesetContext.Provider
            value={{
                pointRulesetInfo,
                setPointRulesetInfo,
                dex,
                valueByPokemonID,
                pokemonIDsByValue,
            }}
        >
            {children}
        </PointRulesetContext.Provider>
    );
};

export type GameTradesContext = {
    gameTrades?: Trade[];
    setGameTrades: React.Dispatch<React.SetStateAction<Trade[] | undefined>>;
};
export const GameTradesContext = createContext<GameTradesContext>({
    setGameTrades: () => {},
});
export const GameTradesProvider = ({ children }: { children: ReactNode }) => {
    const [gameTrades, setGameTrades] = useState<Trade[]>();

    return (
        <GameTradesContext.Provider value={{ gameTrades, setGameTrades }}>
            {children}
        </GameTradesContext.Provider>
    );
};

export type GameInfoContext = {
    gameInfo?: GameInfo;
    setGameInfo: React.Dispatch<React.SetStateAction<GameInfo | undefined>>;
};
export const GameInfoContext = createContext<GameInfoContext>({
    setGameInfo: () => {},
});
export const GameInfoProvider = ({ children }: { children: ReactNode }) => {
    const [gameInfo, setGameInfo] = useState<GameInfo>();

    return (
        <GameInfoContext.Provider value={{ gameInfo, setGameInfo }}>
            {children}
        </GameInfoContext.Provider>
    );
};

export const WholeGameProvider = ({ children }: { children: ReactNode }) => {
    return (
        <PointRulesetProvider>
            <GameInfoProvider>
                <GamePlayersProvider>
                    <GameTradesProvider>{children}</GameTradesProvider>
                </GamePlayersProvider>
            </GameInfoProvider>
        </PointRulesetProvider>
    );
};
