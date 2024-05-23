import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    Button,
    Center,
    Modal,
    Grid,
    Stack,
    Text,
    Title,
    Group,
    MultiSelect,
} from "@mantine/core";
import classes from "@/App.module.css";
import { GameStage, Pokemon } from "@/types";
import {
    AccordionSectionData,
    CardOnClick,
    PokemonAccordion,
    RootPokemonFilterModal,
} from "@/components/PokeView/View";
import { Loading } from "../Loading/Loading";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { getPointLabel, smogonOnClick } from "@/util/pokemon";
import {
    gamePlayerTable,
    gameSelectionTable,
    tradeConfirmationTable,
    tradeTable,
    gameTable,
} from "@/util/database";
import { GameTradesAccordion, TradeCreator } from "./Trade";
import { GameIDContext, PointRulesetIDContext, useGameID } from "@/Context";
import { usePokeFilter } from "@/util/hooks";
import { PokemonSearcher } from "./PokemonSearch";
import {
    useCurrentDrafterQuery,
    useGameInfoQuery,
    useGamePlayersQuery,
    useGameTradesQuery,
    usePointRulesetQuery,
} from "@/Queries";
import { usePreferenceStore, useSessionStore } from "@/Stores";
import {
    beginDrafting,
    concludeDrafting,
    joinGame,
    getPlayerIDToLabel,
} from "./util";
import { RulesetView } from "../Ruleset/Ruleset";

const getChosenPokemonPredicate =
    (pokemonByPlayerID: { [playerID: string]: Pokemon[] }) =>
    (pokemon: Pokemon): boolean => {
        for (const id in pokemonByPlayerID) {
            if (
                pokemonByPlayerID[id]
                    .map((p) => p.data.id)
                    .includes(pokemon.data.id)
            )
                return false;
        }
        return true;
    };

const Game = () => {
    const gameID = useGameID();

    const { prefersMinimal, togglePrefersMinimal } = usePreferenceStore();
    const session = useSessionStore((state) => state.session);

    const currentDrafter = useCurrentDrafterQuery(gameID).data!;
    const gameInfo = useGameInfoQuery(gameID).data!;
    const { playerInfoByID, allPlayerInfo } = useGamePlayersQuery(gameID).data!;
    const { dex, pointRulesetInfo, valueByPokemonID } = usePointRulesetQuery(
        gameInfo.pointRuleset
    ).data!;

    const pokemonByPlayerID = useMemo(() => {
        return allPlayerInfo.reduce<{ [playerID: string]: Pokemon[] }>(
            (acc, next) => {
                acc[next.id] = Object.values(next.selections);
                return acc;
            },
            {}
        );
    }, [allPlayerInfo]);

    const [isRulesetModal, rulesetModalHandlers] = useDisclosure(false);
    const [isTradingModal, tradingModalHandlers] = useDisclosure(false);
    const [isFilterModal, filterModalHandlers] = useDisclosure(false);

    const pokeFilter = usePokeFilter(dex);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState<string[]>([]);
    const [shownPlayers, setShownPlayers] = useState<string[]>([]);

    const rulesetCardOnClick: CardOnClick = useCallback(
        (pokemon) => {
            setSearch(pokemon.data.id);
            rulesetModalHandlers.close();
            window.document
                .getElementById("make-selection")
                ?.scrollIntoView({ behavior: "smooth" });
        },
        [setSearch, rulesetModalHandlers]
    );

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

    const isJoining = gameInfo.gameStage === GameStage.Joining;
    const isDrafting = gameInfo.gameStage === GameStage.Drafting;
    const isBattling = gameInfo.gameStage === GameStage.Battling;
    const isDraftOngoing = !!isDrafting && !!currentDrafter;
    const isReadyToBattle = !!isDrafting && !currentDrafter;

    const isCurrentDrafter = !!session && session.user.id === currentDrafter;

    const RulesetModal = (
        <Modal
            opened={isRulesetModal}
            onClose={rulesetModalHandlers.close}
            title="Point Ruleset"
            radius="md"
            size="85%"
            keepMounted={true}
            centered
        >
            <RulesetView
                cardOnClick={
                    isDraftOngoing
                        ? rulesetCardOnClick
                        : (pokemon) =>
                              smogonOnClick(
                                  pokemon,
                                  pointRulesetInfo.generation
                              )
                }
                extraRulePredicates={[
                    getChosenPokemonPredicate(pokemonByPlayerID),
                ]}
            />
        </Modal>
    );

    const TradingModal = (
        <Modal
            opened={isTradingModal}
            onClose={tradingModalHandlers.close}
            title="Trading"
            radius="md"
            size="85%"
            keepMounted={true}
            centered
        >
            <Stack>
                <Title>Game Trades</Title>
                <GameTradesAccordion />
                {session && session.user.id in playerInfoByID && (
                    <>
                        <Title>Make a Trade</Title>
                        <TradeCreator />
                    </>
                )}
            </Stack>
        </Modal>
    );

    const GameTitle = (
        <Title className={classes.title} ta="center">
            Game:{" "}
            <Text
                inherit
                variant="gradient"
                component="span"
                gradient={{ from: "pink", to: "yellow" }}
            >
                {gameInfo.name}
            </Text>
        </Title>
    );

    const PokemonSelector = isDraftOngoing && (
        <PokemonSearcher
            search={search}
            setSearch={setSearch}
            canSelect={isCurrentDrafter}
        >
            <Button onClick={rulesetModalHandlers.open}>Browse Pokemon</Button>
        </PokemonSearcher>
    );

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

    const PlayerSelections = (
        <Stack align="center" ta="center">
            <Title>Player Selections</Title>
            {!isJoining && (
                <Button onClick={togglePrefersMinimal}>
                    Toggle Pokemon View Mode (
                    {prefersMinimal ? "Minimal" : "Full"})
                </Button>
            )}
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
                    isDraftOngoing
                )}
                cardLabeler={(pokemon) =>
                    getPointLabel(pokemon, valueByPokemonID)
                }
                cardOnClick={(pokemon) =>
                    smogonOnClick(pokemon, pointRulesetInfo.generation)
                }
                getIsLabelDisabled={() => isJoining}
            />
        </Stack>
    );

    const PokemonFilterModal = (
        <RootPokemonFilterModal
            pokeFilter={pokeFilter}
            dex={dex}
            showFilterModal={isFilterModal}
            filterModalHandlers={filterModalHandlers}
        >
            <Group justify="center" align="end">
                <MultiSelect
                    searchable
                    data={Object.entries(playerInfoByID).map(([id, info]) => ({
                        value: id,
                        label: info.name,
                    }))}
                    value={shownPlayers}
                    onChange={setShownPlayers}
                    label="Players to Show"
                    w="75%"
                />
                {Object.keys(playerInfoByID).length > shownPlayers.length ? (
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
    );

    return (
        <>
            {RulesetModal}
            {isBattling && TradingModal}
            {PokemonFilterModal}
            <Group right="1rem" bottom="1rem" pos="fixed" style={{ zIndex: 1 }}>
                <Button onClick={rulesetModalHandlers.open}>See Pokemon</Button>
                <Button onClick={filterModalHandlers.open}>Filters</Button>
                {isBattling && (
                    <Button onClick={tradingModalHandlers.open}>Trade</Button>
                )}
            </Group>
            {GameTitle}
            <Center>
                <Stack justify="center" ta="center" w="80%">
                    {isJoining &&
                        session &&
                        !(session.user.id in playerInfoByID) && (
                            <Button
                                onClick={() =>
                                    joinGame(gameInfo.id, session.user.id)
                                }
                            >
                                Join Game
                            </Button>
                        )}
                    <Title order={3}>
                        Point Ruleset:{" "}
                        <Text
                            inherit
                            variant="gradient"
                            component="span"
                            gradient={{ from: "pink", to: "yellow" }}
                            onClick={rulesetModalHandlers.open}
                            className={classes.pointer}
                        >
                            {pointRulesetInfo.name}
                        </Text>
                    </Title>
                    <Text>
                        Current Game Stage:{" "}
                        <strong>{GameStage[gameInfo.gameStage]}</strong>
                    </Text>
                    {isJoining &&
                        gameInfo.owner === session?.user.id &&
                        Object.keys(playerInfoByID).length > 1 && (
                            <Button onClick={() => beginDrafting(gameInfo.id)}>
                                Begin Drafting
                            </Button>
                        )}
                    {isDrafting && currentDrafter && (
                        <Text>
                            <strong>
                                {playerInfoByID[currentDrafter].name}'s
                            </strong>{" "}
                            Turn to Select
                        </Text>
                    )}
                    {isReadyToBattle && gameInfo.owner === session?.user.id && (
                        <Button onClick={() => concludeDrafting(gameInfo.id)}>
                            Conclude Drafting
                        </Button>
                    )}
                    {PokemonSelector ? (
                        <Grid mih="100vh">
                            <Grid.Col span={3}>{PokemonSelector}</Grid.Col>
                            <Grid.Col ta="right" span={9}>
                                {PlayerSelections}
                            </Grid.Col>
                        </Grid>
                    ) : (
                        PlayerSelections
                    )}
                </Stack>
            </Center>
        </>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    if (!id) throw new Error("No Game ID Given!");

    const gameInfoQuery = useGameInfoQuery(id);
    const currentDrafterQuery = useCurrentDrafterQuery(id);
    const gameTradesQuery = useGameTradesQuery(id);
    const gamePlayersQuery = useGamePlayersQuery(id);
    const pointRulesetQuery = usePointRulesetQuery(
        gameInfoQuery.data?.pointRuleset
    );

    useEffect(() => {
        const update = supabase
            .channel("game-update")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameTable,
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for game!", payload);
                    gameInfoQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A game update was triggered",
                    });
                }
            )
            .subscribe();
        const select = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameSelectionTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    gamePlayersQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A team update was triggered",
                    });
                }
            )
            .subscribe();
        const join = supabase
            .channel("game-joining")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gamePlayerTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for players!", payload);
                    gamePlayersQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A player update was triggered",
                    });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(select);
            supabase.removeChannel(update);
            supabase.removeChannel(join);
        };
    }, [id]);

    const gameTrades = gameTradesQuery.data;
    const playerInfoByID = gamePlayersQuery.data?.playerInfoByID;
    useEffect(() => {
        if (!gameTrades || !playerInfoByID) return;

        const trades = supabase
            .channel("new-game-trade-confirmations")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: tradeConfirmationTable,
                    filter: `trade=in.(${gameTrades.map((t) => t.id).join(",")})`,
                },
                (payload) => {
                    console.log("New Trade Confirmation Received!", payload);
                    gameTradesQuery.refetch();
                    const playerID = (payload.new as any).participant as string;
                    const playerName = playerInfoByID[playerID].name;
                    notifications.show({
                        title: "Trade Update",
                        message: `${playerName} confirmed trade ${(payload.new as any).trade}`,
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: tradeTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Trade Update Received!", payload);
                    gameTradesQuery.refetch();
                    const action =
                        payload.eventType === "INSERT"
                            ? "created"
                            : "executed/rejcted";
                    notifications.show({
                        title: "Trade Update",
                        message: `Someone ${action} a trade!`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(trades);
        };
    }, [gameTrades, playerInfoByID]);

    if (
        pointRulesetQuery.isPending ||
        gamePlayersQuery.isPending ||
        gameInfoQuery.isPending ||
        currentDrafterQuery.isLoading ||
        gameTradesQuery.isLoading
    )
        return <Loading />;

    if (
        gameInfoQuery.isError ||
        currentDrafterQuery.isError ||
        gameTradesQuery.isError ||
        gamePlayersQuery.isError ||
        pointRulesetQuery.isError
    )
        throw new Error("Failed to fetch data");

    return (
        <GameIDContext.Provider value={id}>
            <PointRulesetIDContext.Provider
                value={gameInfoQuery.data.pointRuleset}
            >
                <Game />
            </PointRulesetIDContext.Provider>
        </GameIDContext.Provider>
    );
};
