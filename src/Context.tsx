import { createContext, useContext } from "react";

export const GameIDContext = createContext<string | null>(null);
export const useGameID = () => {
    const gameID = useContext(GameIDContext);
    if (!gameID) throw new Error("No Game ID context wrapping this component!");
    return gameID;
};

export const PointRulesetIDContext = createContext<string | null>(null);
export const usePointRulesetID = () => {
    const pointRulesetID = useContext(PointRulesetIDContext);
    if (!pointRulesetID)
        throw new Error("No Game ID context wrapping this component!");
    return pointRulesetID;
};
