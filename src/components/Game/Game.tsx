import { useState, useEffect, useMemo, useContext } from "react";
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
import { GameStage, Pokemon, ValueByPokemonID } from "@/types";
import {
    AccordionSectionData,
    CardOnClick,
    PokemonAccordion,
    PokemonFilterModal,
} from "@/components/PokeView/View";
import { Loading } from "../Loading/Loading";
import { useDisclosure } from "@mantine/hooks";
import { AppContext } from "@/App";
import { notifications } from "@mantine/notifications";
import { RulesetView } from "../Ruleset/Ruleset";
import { smogonOnClick } from "@/util/Pokemon";
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
import { Dex } from "@pkmn/dex";
import { PokemonSearcher } from "./PokemonSearch";
import {
    useCurrentDrafterQuery,
    useGameInfoQuery,
    useGamePlayersQuery,
    useGameTradesQuery,
    usePointRulesetQuery,
} from "@/Queries";

export const getPointLabel = (
    pokemon: Pokemon,
    valueByPokemonID: ValueByPokemonID
): string => {
    let pointLabel = "1 Point";
    if (pokemon.data.id in valueByPokemonID) {
        const value = valueByPokemonID[pokemon.data.id];
        pointLabel = value === 0 ? "Banned" : `${value} Points`;
    }
    return pointLabel;
};

const getPointTotal = (
    pokemon: Pokemon[],
    valueByPokemonID: ValueByPokemonID
): number => {
    return pokemon.reduce((acc, next) => {
        return acc + (valueByPokemonID[next.data.id] ?? 1);
    }, 0);
};

const joinGame = async (gameID: string, userID: string) => {
    const { error } = await supabase.from(gamePlayerTable).insert([
        {
            game: gameID,
            player: userID,
        },
    ]);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't join game",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Game Joined",
        message: "Joined successfully",
    });
};

const beginDrafting = async (gameID: string) => {
    const { error } = await supabase
        .from(gameTable)
        .update([
            {
                game_stage: GameStage.Drafting,
            },
        ])
        .eq("id", gameID);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't begin drafting",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Drafting begins",
        message: "Drafting has commenced",
    });
};

const concludeDrafting = async (gameID: string) => {
    const { error } = await supabase
        .from(gameTable)
        .update([
            {
                game_stage: GameStage.Battling,
            },
        ])
        .eq("id", gameID);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't conclude drafting",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Drafting concluded",
        message: "Battling has commenced",
    });
};

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
    const { session, prefersMinimal, setPrefersMinimal } =
        useContext(AppContext);
    const gameID = useGameID();
    const currentDrafter = useCurrentDrafterQuery(gameID).data!;
    const gameInfo = useGameInfoQuery(gameID).data!;
    const { playerInfoByID, allPlayerInfo } = useGamePlayersQuery(gameID).data!;
    const { dex, pointRulesetInfo, valueByPokemonID } = usePointRulesetQuery(
        gameInfo.pointRuleset
    ).data!;

    const pokemonByPlayerID = useMemo(() => {
        if (!allPlayerInfo || !dex) return;
        return allPlayerInfo.reduce<{ [playerID: string]: Pokemon[] }>(
            (acc, next) => {
                acc[next.id] = Object.values(next.selections);
                return acc;
            },
            {}
        );
    }, [allPlayerInfo, dex]);

    const [isRulesetOpened, { open: showRuleset, close: hideRuleset }] =
        useDisclosure(false);
    const [isTradingOpened, { open: showTrading, close: hideTrading }] =
        useDisclosure(false);

    const [open, setOpen] = useState<string[]>([]);

    const [search, setSearch] = useState("");
    const rulesetCardOnClick: CardOnClick = (pokemon) => {
        setSearch(pokemon.data.id);
        hideRuleset();
        window.document
            .getElementById("make-selection")
            ?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (playerInfoByID)
            setOpen(
                Object.keys(playerInfoByID).filter(
                    (id) =>
                        Object.keys(playerInfoByID[id].selections).length > 0
                )
            );
    }, [playerInfoByID]);

    const [showFilterModal, filterModalHandlers] = useDisclosure(false);
    const [shown, setShown] = useState<string[]>([]);
    const pokeFilter = usePokeFilter(dex ?? Dex);

    const showAll = () => setShown(Object.keys(playerInfoByID ?? {}));
    useEffect(() => {
        showAll();
    }, [playerInfoByID]);

    if (
        !pointRulesetInfo ||
        !playerInfoByID ||
        !pokemonByPlayerID ||
        !valueByPokemonID ||
        !dex ||
        false
    )
        return <Loading />;

    const isJoining = gameInfo.gameStage === GameStage.Joining;
    const isDrafting = gameInfo.gameStage === GameStage.Drafting;
    const isBattling = gameInfo.gameStage === GameStage.Battling;
    const isDraftOngoing = isDrafting && currentDrafter;
    const isReadyToBattle = isDrafting && !currentDrafter;

    const selectPokemon =
        session && session.user.id === currentDrafter
            ? async (pokemon: Pokemon) => {
                  const value = valueByPokemonID[pokemon.data.id];
                  if (value === 0)
                      return notifications.show({
                          color: "red",
                          title: "Banned Pokemon",
                          message: `${pokemon.data.name} is a banned Pokemon!`,
                      });

                  const currentPointTotal = getPointTotal(
                      Object.values(playerInfoByID[session.user.id].selections),
                      valueByPokemonID
                  );

                  const rulesetForPlayer =
                      playerInfoByID[session.user.id].rules;
                  if (currentPointTotal + value > rulesetForPlayer.maxPoints)
                      return notifications.show({
                          color: "red",
                          title: "You don't have enough points",
                          message: `${pokemon.data.name} is worth too many points!`,
                      });

                  const { error } = await supabase
                      .from(gameSelectionTable)
                      .insert([
                          {
                              game: gameInfo.id,
                              pokemon_id: pokemon.data.id,
                              player: session.user.id,
                          },
                      ]);
                  if (error)
                      return notifications.show({
                          color: "red",
                          title: "Couldn't Select Pokemon",
                          message: `${error.message}`,
                      });
                  notifications.show({
                      title: "Added your selection",
                      message: `You have added ${pokemon.data.name} to your team`,
                  });
              }
            : undefined;

    const RulesetModal = (
        <Modal
            opened={isRulesetOpened}
            onClose={hideRuleset}
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
            opened={isTradingOpened}
            onClose={hideTrading}
            title="Trading"
            radius="md"
            size="85%"
            keepMounted={true}
            centered
        >
            <Stack>
                <Title>Game Trades</Title>
                <GameTradesAccordion />
                {session && (
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
            onSelect={selectPokemon}
            search={search}
            setSearch={setSearch}
        >
            <Button onClick={showRuleset}>Browse Pokemon</Button>
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
                if (!shown.includes(playerID)) return acc;
                const filteredPokemon = pokemon.filter(doesPokemonMatch);
                acc.push([playerID, filteredPokemon]);
                return acc;
            },
            []
        );
        return result;
    }, [playerInfoByID, pokeFilter, shown]);

    const PlayerSelections = (
        <Stack align="center" ta="center">
            <Title>Player Selections</Title>
            {!isJoining && (
                <Button onClick={() => setPrefersMinimal(!prefersMinimal)}>
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
                sectionLabelTransformer={(playerID) => {
                    const playerInfo = playerInfoByID[playerID];
                    const playerPokemon = Object.values(playerInfo.selections);
                    let label = playerInfo.name;
                    if (isDraftOngoing) {
                        const { maxPoints, maxTeamSize } = playerInfo.rules;
                        const pointsLeft =
                            maxPoints -
                            getPointTotal(playerPokemon, valueByPokemonID);
                        const teamSize = playerPokemon.length;
                        label += ` - ${pointsLeft}/${maxPoints} Points Left - ${teamSize}/${maxTeamSize} Pokemon Chosen`;
                    }
                    return label;
                }}
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

    return (
        <>
            {RulesetModal}
            {isBattling && TradingModal}
            <PokemonFilterModal
                pokeFilter={pokeFilter}
                dex={dex}
                showFilterModal={showFilterModal}
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
                        value={shown}
                        onChange={setShown}
                        label="Players to Show"
                        w="75%"
                    />
                    {Object.keys(playerInfoByID).length > shown.length ? (
                        <Button w="20%" onClick={showAll}>
                            Show All
                        </Button>
                    ) : (
                        <Button w="20%" onClick={() => setShown([])}>
                            Show None
                        </Button>
                    )}
                </Group>
            </PokemonFilterModal>
            <Group right="1rem" bottom="1rem" pos="fixed" style={{ zIndex: 1 }}>
                <Button onClick={showRuleset}>See Pokemon</Button>
                <Button onClick={filterModalHandlers.open}>Filters</Button>
                {isBattling && <Button onClick={showTrading}>Trade</Button>}
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
                            onClick={showRuleset}
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
    const playerInfoByID = gamePlayersQuery.data?.allPlayerInfo;
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
                    const playerName =
                        playerInfoByID[(payload.new as any).participant].name;
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
        !pointRulesetQuery.data ||
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
