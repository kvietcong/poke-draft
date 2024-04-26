import { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    Button,
    Center,
    Modal,
    Grid,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import classes from "@/App.module.css";
import { Pokemon, ValueByPokemonID } from "@/types";
import {
    AccordionSectionData,
    BasicStatDisplay,
    CardOnClick,
    PokemonAccordion,
    PokemonCard,
} from "@/components/PokeView/View";
import { Loading } from "../Loading/Loading";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { AppContext } from "@/App";
import { notifications } from "@mantine/notifications";
import { RulesetView } from "../Ruleset/Ruleset";
import { searchPokemon, smogonOnClick } from "@/util/Pokemon";
import {
    fetchGameInfo,
    fetchAllPlayerInfo,
    fetchPointRulesetInfoFromGameID,
    gamePlayerTable,
    gameSelectionTable,
    fetchGameTrades,
    tradeConfirmationTable,
    tradeTable,
} from "@/util/database";
import { GameTradesAccordion, TradeCreator } from "./Trade";
import {
    GameInfoContext,
    GamePlayersContext,
    GameTradesContext,
    PointRulesetContext,
    WholeGameProvider,
} from "@/Context";

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

const PokemonSelector = ({
    onSelect,
    search,
    setSearch,
}: {
    onSelect?: (pokemon: Pokemon) => any;
    search: string;
    setSearch: (newValue: string) => void;
}) => {
    const { dex, pointRulesetInfo, valueByPokemonID } =
        useContext(PointRulesetContext);

    if (!dex || !pointRulesetInfo || !valueByPokemonID) return;

    const pokemon = useMemo(() => {
        return searchPokemon(search.trim(), dex);
    }, [search]);

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (inputRef.current) inputRef.current.value = search;
    }, [search]);

    const PokemonInfo = (
        <>
            {onSelect && (
                <Button onClick={() => onSelect(pokemon)}>
                    Select Pokemon
                </Button>
            )}
            <Title order={3}>{getPointLabel(pokemon, valueByPokemonID)}</Title>
            <Center>
                <PokemonCard
                    pokemon={pokemon}
                    onClick={() =>
                        smogonOnClick(pokemon, pointRulesetInfo.generation)
                    }
                />
            </Center>
            <Title>Stats</Title>
            <BasicStatDisplay pokemon={pokemon} />
        </>
    );

    let error_msg = null;
    if (!pokemon.data.exists) error_msg = `Couldn't find ${search}`;
    else if (pokemon.data.gen > pointRulesetInfo.generation)
        error_msg = `${pokemon.data.name} isn't in generation ${pointRulesetInfo.generation}`;

    const SearchError = error_msg && <Title order={2}>{error_msg}</Title>;

    return (
        <>
            <TextInput
                ref={inputRef}
                label="Search for a Pokemon"
                placeholder="Pokemon Name"
                defaultValue={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />
            {search.trim() && (SearchError || PokemonInfo)}
        </>
    );
};

const Game = () => {
    const { session, prefersMinimal } = useContext(AppContext);
    const { gameInfo } = useContext(GameInfoContext);
    const { playerInfoByID, allPlayerInfo } = useContext(GamePlayersContext);
    const { dex, pointRulesetInfo, valueByPokemonID } =
        useContext(PointRulesetContext);

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

    const [search, setSearch] = useDebouncedState("", 150);
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

    if (
        !gameInfo ||
        !pointRulesetInfo ||
        !playerInfoByID ||
        !pokemonByPlayerID ||
        !valueByPokemonID ||
        false
    )
        return <Loading />;

    const getCurrentTurnPlayerID = () => {
        const ids = Object.keys(playerInfoByID);
        if (ids.length < 2) return;
        const totalByID = Object.values(playerInfoByID).reduce<{
            [id: string]: number;
        }>((acc, next) => {
            acc[next.id] = getPointTotal(
                Object.values(next.selections),
                valueByPokemonID
            );
            return acc;
        }, {});

        const filteredForLimits = ids.filter((id) => {
            const rulesetForPlayer = playerInfoByID[id].rules;
            const hasPoints = totalByID[id] < rulesetForPlayer.maxPoints;
            const enoughRoom =
                (pokemonByPlayerID[id]?.length ?? 0) <
                rulesetForPlayer.maxTeamSize;
            return hasPoints && enoughRoom;
        });

        const lowestCount = Math.min(
            ...filteredForLimits.map((id) => pokemonByPlayerID[id]?.length ?? 0)
        );
        const filteredForRound = filteredForLimits.filter((id) => {
            const hasNotPickedThisRound =
                (pokemonByPlayerID[id]?.length ?? 0) == lowestCount;
            return hasNotPickedThisRound;
        });

        filteredForRound.sort(
            (a, b) =>
                (playerInfoByID[b].priority ?? 0) -
                (playerInfoByID[a].priority ?? 0)
        );
        if (lowestCount % 2 == 1) filteredForRound.reverse();

        return filteredForRound?.[0];
    };
    const currentTurnPlayerID = getCurrentTurnPlayerID();
    const doesGameHavePlayers = Object.keys(playerInfoByID).length > 1;
    const isDraftingFinished = !currentTurnPlayerID && doesGameHavePlayers;

    const getIsMyTurn = (): boolean => {
        if (!session) return false;
        return currentTurnPlayerID === session.user.id;
    };

    const getIsJoinable = () => {
        const counts = Object.keys(playerInfoByID).map(
            (id) => pokemonByPlayerID[id]?.length ?? 0
        );
        const lowestCount = counts.length ? Math.min(...counts) : 0;
        return (
            lowestCount === 0 && session && !(session.user.id in playerInfoByID)
        );
    };

    const joinGame = async () => {
        const { error } = await supabase.from(gamePlayerTable).insert([
            {
                game: gameInfo.id,
                player: session?.user.id,
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
            message: `Welcome to ${gameInfo.name}!`,
        });
    };

    const selectPokemon = getIsMyTurn()
        ? async (pokemon: Pokemon) => {
              if (!session)
                  return notifications.show({
                      color: "red",
                      title: "Not Logged In",
                      message: "You need to be logged in! How did you do this?",
                  });
              if (!(session.user.id in playerInfoByID))
                  return notifications.show({
                      color: "red",
                      title: "Not in the Game",
                      message:
                          "You need to be in the game! How did you do this?",
                  });

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

              const rulesetForPlayer = playerInfoByID[session.user.id].rules;
              if (currentPointTotal + value > rulesetForPlayer.maxPoints)
                  return notifications.show({
                      color: "red",
                      title: "You don't have enough points",
                      message: `${pokemon.data.name} is worth too many points!`,
                  });

              const { error } = await supabase.from(gameSelectionTable).insert([
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

    const alreadyChosenPokemon = (pokemon: Pokemon): boolean => {
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
                cardOnClick={rulesetCardOnClick}
                extraRulePredicates={[alreadyChosenPokemon]}
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

    const DraftStateTitle = (
        <Title order={2}>
            {currentTurnPlayerID
                ? `${playerInfoByID[currentTurnPlayerID].name}'s Turn To Pick`
                : isDraftingFinished
                  ? "Drafting is Complete"
                  : "Game hasn't started"}
        </Title>
    );

    const PokemonSelectorCol = (
        <Stack align="left" ta="left">
            <Title id="make-selection">Make a selection</Title>
            <Button onClick={showRuleset}>See Point Ruleset</Button>
            <PokemonSelector
                onSelect={selectPokemon}
                search={search}
                setSearch={setSearch}
            />
        </Stack>
    );

    const accordionData = useMemo(() => {
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
        return data;
    }, [playerInfoByID]);
    const PlayerSelectionsCol = (
        <Stack align="end">
            <Title>Player Selections</Title>
            <Button w="30%" onClick={showTrading}>
                Trade
            </Button>
            <PokemonAccordion
                open={open}
                setOpen={setOpen}
                data={accordionData}
                isMinimal={prefersMinimal}
                allowMultiple={true}
                defaultValue={accordionData.map((x) => x[0])}
                sectionLabelTransformer={(playerID) => {
                    const playerInfo = playerInfoByID[playerID];
                    const playerPokemon = Object.values(playerInfo.selections);
                    return `${playerInfo.name} - ${playerInfo.rules.maxPoints - getPointTotal(playerPokemon, valueByPokemonID)}/${playerInfo.rules.maxPoints} Points Left - ${playerPokemon.length}/${playerInfo.rules.maxTeamSize} Pokemon Chosen`;
                }}
                cardLabeler={(pokemon) =>
                    getPointLabel(pokemon, valueByPokemonID)
                }
                cardOnClick={(pokemon) =>
                    smogonOnClick(pokemon, pointRulesetInfo.generation)
                }
            />
        </Stack>
    );

    return (
        <>
            {RulesetModal}
            {TradingModal}
            {GameTitle}
            <Button
                left="1rem"
                bottom="1rem"
                pos="fixed"
                onClick={showRuleset}
                style={{ zIndex: 1 }}
            >
                See Point Ruleset
            </Button>
            <Button
                right="1rem"
                bottom="1rem"
                pos="fixed"
                onClick={showTrading}
                style={{ zIndex: 1 }}
            >
                Trade
            </Button>
            <Center>
                <Stack justify="center" ta="center" w="80%">
                    {getIsJoinable() ? (
                        <Button onClick={joinGame}>Join Game</Button>
                    ) : (
                        session &&
                        !(session.user.id in playerInfoByID) && (
                            <Text>Game isn't accepting anymore players</Text>
                        )
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
                    {DraftStateTitle}
                    <Grid mih="100vh">
                        <Grid.Col span={3}>{PokemonSelectorCol}</Grid.Col>
                        <Grid.Col ta="right" span={9}>
                            {PlayerSelectionsCol}
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Center>
        </>
    );
};

export const GamePage = () => {
    return (
        <WholeGameProvider>
            <_GamePage />
        </WholeGameProvider>
    );
};

export const _GamePage = () => {
    const { id } = useParams();
    if (!id) return <>No ID provided</>;

    const { gameInfo, setGameInfo } = useContext(GameInfoContext);
    const { gameTrades, setGameTrades } = useContext(GameTradesContext);
    const { playerInfoByID, allPlayerInfo, setAllPlayerInfo } =
        useContext(GamePlayersContext);
    const { pointRulesetInfo, setPointRulesetInfo } =
        useContext(PointRulesetContext);

    const refreshGameInfo = async () => {
        const gameInfo = await fetchGameInfo(supabase, id);
        if (!gameInfo) return;
        setGameInfo(gameInfo);
    };

    const refreshAllPlayerInfo = async () => {
        const allPlayerInfo = await fetchAllPlayerInfo(supabase, id);
        if (!allPlayerInfo) return;
        setAllPlayerInfo(allPlayerInfo);
    };

    const refreshPointRulesetInfo = async () => {
        const pointRulesetInfo = await fetchPointRulesetInfoFromGameID(
            supabase,
            id
        );
        if (!pointRulesetInfo) return;
        setPointRulesetInfo(pointRulesetInfo);
    };

    const refreshGameTrades = async () => {
        const gameTrades = await fetchGameTrades(supabase, id);
        if (!gameTrades) return;
        setGameTrades(gameTrades);
    };

    useEffect(() => {
        refreshGameInfo();
        refreshGameTrades();
        refreshAllPlayerInfo();
        refreshPointRulesetInfo();

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
                    refreshAllPlayerInfo();
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
                    refreshAllPlayerInfo();
                    notifications.show({
                        title: "Update",
                        message: "A player update was triggered",
                    });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(select);
            supabase.removeChannel(join);
        };
    }, [id]);

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
                    refreshGameTrades();
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
                    refreshGameTrades();
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

    if (!(gameInfo && allPlayerInfo && pointRulesetInfo && gameTrades))
        return <Loading />;

    return <Game />;
};
