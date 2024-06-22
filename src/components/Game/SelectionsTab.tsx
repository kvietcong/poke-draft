import { useMemo, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GameStage, Pokemon, PlayerInfo, ValueByPokemonID } from "@/types";
import { useGameID } from "@/Context";
import {
    useGameInfoQuery,
    useGamePlayersQuery,
    usePointRulesetQuery,
} from "@/queries";
import { usePreferenceStore } from "@/stores";
import { Button, Group, MultiSelect } from "@mantine/core";
import {
    AccordionSectionData,
    PokemonAccordion,
    RootPokemonFilterModal,
} from "../PokeView/View";
import { usePokeFilter } from "@/util/hooks";
import { getPointLabel, getPointTotal, smogonOnClick } from "@/util/pokemon";
import { useDisclosure } from "@mantine/hooks";
import { scrollUpOrDown } from "@/util/helpers";
import { InsertIntoGameToolBar } from "./Game";

const getPlayerIDToLabel =
    (
        playerInfoByID: { [id: string]: PlayerInfo },
        valueByPokemonID: ValueByPokemonID,
        willShowPointInfo: boolean
    ) =>
    (playerID: string) => {
        const playerInfo = playerInfoByID[playerID];
        const playerPokemon = Object.values(playerInfo.selections);
        let label = playerInfo.name;
        if (willShowPointInfo) {
            const { maxPoints, maxTeamSize } = playerInfo.rules;
            const pointsLeft =
                maxPoints - getPointTotal(playerPokemon, valueByPokemonID);
            const teamSize = playerPokemon.length;
            label += ` - ${pointsLeft}/${maxPoints} Points Left - ${teamSize}/${maxTeamSize} Pokemon Chosen`;
        }
        return label;
    };

export const SelectionsTab = () => {
    const gameID = useGameID();
    const { tab } = useParams();

    const { prefersMinimal, togglePrefersMinimal } = usePreferenceStore();

    const gameInfo = useGameInfoQuery(gameID).data!;
    const { playerInfoByID } = useGamePlayersQuery(gameID).data!;
    const { dex, pointRulesetInfo, valueByPokemonID } = usePointRulesetQuery(
        gameInfo.pointRuleset
    ).data!;

    const [open, setOpen] = useState<string[]>([]);
    const [shownPlayers, setShownPlayers] = useState<string[]>([]);
    const [isFilterModal, filterModalHandlers] = useDisclosure(false);

    const showAllPlayers = useCallback(
        () => setShownPlayers(Object.keys(playerInfoByID)),
        [playerInfoByID]
    );

    useEffect(() => {
        showAllPlayers();
        setOpen(
            Object.keys(playerInfoByID).filter(
                (id) => Object.keys(playerInfoByID[id].selections).length > 0
            )
        );
    }, [playerInfoByID]);

    const pokeFilter = usePokeFilter(dex);
    const playerSelectionData = useMemo(() => {
        const data = Object.entries(playerInfoByID)
            .sort(
                (a, b) =>
                    b[1].priority - a[1].priority ||
                    a[1].id.localeCompare(b[1].id)
            )
            .map(([playerID, playerInfo]) => {
                const sectionInfo = [
                    playerID,
                    Object.values(playerInfo.selections),
                ];
                return sectionInfo as AccordionSectionData;
            });
        const doesPokemonMatch = (pokemon: Pokemon) =>
            pokeFilter.predicates.every((predicate) => predicate(pokemon));
        const result = data.reduce<AccordionSectionData[]>(
            (acc, [playerID, pokemon]) => {
                if (!shownPlayers.includes(playerID)) return acc;
                const filteredPokemon = pokemon.filter(doesPokemonMatch);
                acc.push([playerID, filteredPokemon]);
                return acc;
            },
            []
        );
        return result;
    }, [playerInfoByID, pokeFilter, shownPlayers]);

    return (
        <>
            <RootPokemonFilterModal
                pokeFilter={pokeFilter}
                dex={dex}
                showFilterModal={isFilterModal}
                filterModalHandlers={filterModalHandlers}
            >
                <Group justify="center" align="end">
                    <MultiSelect
                        searchable
                        data={Object.entries(playerInfoByID).map(
                            ([id, info]) => ({
                                value: id,
                                label: info.name,
                            })
                        )}
                        value={shownPlayers}
                        onChange={setShownPlayers}
                        label="Players to Show"
                        w="75%"
                    />
                    {Object.keys(playerInfoByID).length >
                    shownPlayers.length ? (
                        <Button w="20%" onClick={showAllPlayers}>
                            Show All
                        </Button>
                    ) : (
                        <Button w="20%" onClick={() => setShownPlayers([])}>
                            Show None
                        </Button>
                    )}
                </Group>
            </RootPokemonFilterModal>
            <PokemonAccordion
                open={open}
                setOpen={setOpen}
                data={playerSelectionData}
                isMinimal={prefersMinimal}
                allowMultiple={true}
                defaultValue={playerSelectionData.map((x) => x[0])}
                sectionLabelTransformer={getPlayerIDToLabel(
                    playerInfoByID,
                    valueByPokemonID,
                    gameInfo.gameStage <= GameStage.Drafting
                )}
                cardLabeler={(pokemon) =>
                    getPointLabel(pokemon, valueByPokemonID)
                }
                cardOnClick={(pokemon) =>
                    smogonOnClick(pokemon, pointRulesetInfo.generation)
                }
                getIsLabelDisabled={() =>
                    gameInfo.gameStage <= GameStage.Joining
                }
            />
            {tab === "selections" && gameInfo.gameStage > GameStage.Joining && (
                <InsertIntoGameToolBar>
                    <Button onClick={filterModalHandlers.open}>Filters</Button>
                    <Button onClick={scrollUpOrDown}>Scroll Up/Down</Button>
                    <Button onClick={togglePrefersMinimal}>
                        Toggle Pokemon View Mode (
                        {prefersMinimal ? "Minimal" : "Full"})
                    </Button>
                </InsertIntoGameToolBar>
            )}
        </>
    );
};
