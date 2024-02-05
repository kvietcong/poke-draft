import {
    useState,
    useEffect,
    Dispatch,
    SetStateAction,
    useMemo,
    useContext,
} from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    gamePlayerOverrideTable,
    gamePlayerTable,
    gameRulesetTable,
    gameSelectionTable,
    gameTable,
    pointRuleTable,
    pointRulesetTable,
} from "@/util/DatabaseTables";
import {
    Accordion,
    Button,
    Center,
    Checkbox,
    Divider,
    Grid,
    Group,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import classes from "@/App.module.css";
import { Pokemon } from "@/types";
import {
    BasicStatDisplay,
    CardOnClick,
    PokemonCard,
    PokemonPill,
    PokemonTooltip,
} from "@/components/PokeView/View";
import { Dex, toID } from "@pkmn/dex";
import { PokemonSprite, Sprites } from "@pkmn/img";
import { Loading } from "../Loading/Loading";
import { useDebouncedState, useScrollIntoView } from "@mantine/hooks";
import { AppContext } from "@/App";
import { notifications } from "@mantine/notifications";
import { RulesetView } from "../Ruleset/Ruleset";

type GameRuleset = {
    name: string;
    maxPoints: number;
    maxTeamSize: number;
};

type ValueByPokemonID = { [pokemonID: string]: number };
const getPointLabel = (
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
    player: string,
    selectionData: SelectionData,
    valueByPokemonID: ValueByPokemonID
): number => {
    const pokemons = selectionData[player] ?? [];
    return pokemons.reduce((acc, next) => {
        return acc + (valueByPokemonID[next.data.id] ?? 1);
    }, 0);
};

type SelectionData = { [player: string]: Pokemon[] };
export const SelectionAccordion = ({
    open,
    setOpen,
    isMinimal,
    selectionData,
    playerNameByID,
    valueByPokemonID,
    maxPoints,
    overrideByPlayerID,
    playerPriorityByID,
}: {
    open: string[];
    setOpen: Dispatch<SetStateAction<string[]>>;
    isMinimal: boolean;
    selectionData: SelectionData;
    playerNameByID: { [id: string]: string };
    valueByPokemonID: ValueByPokemonID;
    maxPoints: number;
    overrideByPlayerID: { [id: string]: GameRuleset };
    playerPriorityByID: { [id: string]: number };
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    return (
        <Accordion
            value={open}
            onChange={setOpen}
            multiple={true}
            variant={isMinimal ? "filled" : "separated"}
        >
            {Object.entries(playerNameByID)
                .sort(
                    (a, b) =>
                        (playerPriorityByID[b[0]] ?? 0) -
                        (playerPriorityByID[a[0]] ?? 0)
                )
                .map(([playerID, playerName]) => (
                    <Accordion.Item key={playerID} value={playerID}>
                        <Accordion.Control>
                            {playerName}:{" "}
                            {(overrideByPlayerID[playerID]?.maxPoints ??
                                maxPoints) -
                                getPointTotal(
                                    playerID,
                                    selectionData,
                                    valueByPokemonID
                                )}{" "}
                            points left
                        </Accordion.Control>
                        <Accordion.Panel>
                            {open && open.includes(playerID) ? (
                                <Group justify="center" ta="center">
                                    {selectionData[playerID]?.map((pokemon) => (
                                        <PokemonTooltip
                                            pokemon={pokemon}
                                            key={pokemon.data.id}
                                        >
                                            <PokemonDisplay pokemon={pokemon} />
                                            <Text>
                                                {getPointLabel(
                                                    pokemon,
                                                    valueByPokemonID
                                                )}
                                            </Text>
                                        </PokemonTooltip>
                                    )) || <Text>No Selections</Text>}
                                </Group>
                            ) : null}
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
        </Accordion>
    );
};

const PokemonSelector = ({
    valueByPokemonID,
    onSelect,
    search,
    setSearch,
}: {
    valueByPokemonID: { [pokemonID: string]: number };
    onSelect?: (pokemon: Pokemon) => any;
    search: string;
    setSearch: (newValue: string) => void;
}) => {
    const pokemon = useMemo(() => {
        const data = Dex.species.get(search.trim());
        const pokemon = {
            data: data,
            sprite: Sprites.getDexPokemon(data.id, {
                gen: "gen5ani",
            }) as PokemonSprite,
        };
        return pokemon;
    }, [search]);

    const PokemonInfo = (
        <>
            {onSelect && (
                <Button onClick={() => onSelect(pokemon)}>
                    Select Pokemon
                </Button>
            )}
            <Title>{getPointLabel(pokemon, valueByPokemonID)}</Title>
            <Center>
                <PokemonCard pokemon={pokemon} />
            </Center>
            <Title>Stats</Title>
            <BasicStatDisplay pokemon={pokemon} />
        </>
    );

    const SearchError = <Title>Couldn't find {search}</Title>;

    return (
        <>
            <TextInput
                label="Search for a Pokemon"
                placeholder="Pokemon Name"
                defaultValue={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />
            {search.trim() && (pokemon.data.exists ? PokemonInfo : SearchError)}
        </>
    );
};

const Game = ({ game }: { game: string }) => {
    const { session } = useContext(AppContext);

    const [trigger, setTrigger] = useState(0);

    const [gameName, setGameName] = useState<string>("");
    const [gameRuleset, setGameRuleset] = useState<GameRuleset>();
    const [overrideByPlayerID, setOverrideByPlayerID] = useState<{
        [id: string]: GameRuleset;
    }>();

    const [playerNameByID, setPlayerNameByID] = useState<{
        [id: string]: string;
    }>();
    const [playerPriorityByID, setPlayerPriorityByID] = useState<{
        [id: string]: number;
    }>();
    const [pokemonByPlayerID, setPokemonByPlayerID] = useState<{
        [id: string]: Pokemon[];
    }>();

    type PointRulesetInfo = {
        id: string;
        generation: number;
        name: string;
        valueByPokemonID: { [pokemonID: string]: number };
    };
    const [pointRuleset, setPointRuleset] = useState<PointRulesetInfo>();

    const [open, setOpen] = useState<string[]>([]);
    const [isMinimal, setIsMinimal] = useState(false);

    const { scrollIntoView: scrollToSelector, targetRef: selectionRef } =
        useScrollIntoView<HTMLHeadingElement>();
    const [search, setSearch] = useDebouncedState("", 150);
    const cardOnClick: CardOnClick = (pokemon) => {
        setSearch(pokemon.data.id);
        scrollToSelector();
    };

    const { scrollIntoView: scrollToRuleset, targetRef: rulesetRef } =
        useScrollIntoView<HTMLDivElement>();

    const fetchGame = async (game: string) => {
        let { data, error } = await supabase
            .from(gameTable)
            .select(
                `name,
                ${gameRulesetTable} (name, max_points, max_team_size),
                ${pointRulesetTable} (id, name, generation,
                    ${pointRuleTable} (pokemon_id, value))`
            )
            .eq("id", game)
            .returns<
                {
                    name: string;
                    [gameRulesetTable]: {
                        name: string;
                        max_points: number;
                        max_team_size: number;
                    };
                    [pointRulesetTable]: {
                        id: string;
                        name: string;
                        generation: number;
                        [pointRuleTable]: {
                            pokemon_id: string;
                            value: number;
                        }[];
                    };
                }[]
            >()
            .limit(1)
            .single();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setGameName(data.name);
        setGameRuleset({
            name: data[gameRulesetTable].name,
            maxPoints: data[gameRulesetTable].max_points,
            maxTeamSize: data[gameRulesetTable].max_team_size,
        });
        const valueByPokemonID = data[pointRulesetTable][
            pointRuleTable
        ].reduce<{
            [pokemonID: string]: number;
        }>((acc, next) => {
            acc[next.pokemon_id] = next.value;
            return acc;
        }, {});
        setPointRuleset({
            id: data[pointRulesetTable].id,
            name: data[pointRulesetTable].name,
            generation: data[pointRulesetTable].generation,
            valueByPokemonID,
        });
    };

    const fetchPlayers = async (game: string) => {
        let { data, error } = await supabase
            .from(gamePlayerTable)
            .select("player (id, display_name), priority")
            .eq("game", game)
            .returns<
                {
                    player: { id: string; display_name: string };
                    priority: number;
                }[]
            >();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setPlayerNameByID(
            data.reduce<{ [id: string]: string }>((acc, next) => {
                acc[next.player.id] = next.player.display_name;
                return acc;
            }, {})
        );
        setPlayerPriorityByID(
            data.reduce<{ [id: string]: number }>((acc, next) => {
                acc[next.player.id] = next.priority;
                return acc;
            }, {})
        );
    };

    const fetchOverrides = async (game: string) => {
        let { data, error } = await supabase
            .from(gamePlayerOverrideTable)
            .select("player, game_ruleset (name, max_points, max_team_size)")
            .eq("game", game)
            .returns<
                {
                    player: string;
                    game_ruleset: {
                        name: string;
                        max_points: number;
                        max_team_size: number;
                    };
                }[]
            >();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const newOverrideByPlayerID = data.reduce<{
            [id: string]: GameRuleset;
        }>((acc, next) => {
            acc[next.player] = {
                name: next.game_ruleset.name,
                maxPoints: next.game_ruleset.max_points,
                maxTeamSize: next.game_ruleset.max_team_size,
            };
            return acc;
        }, {});
        setOverrideByPlayerID(newOverrideByPlayerID);
    };

    const fetchPokemonByPlayer = async (
        game: string,
        pointRuleset: PointRulesetInfo,
        openAll?: boolean
    ) => {
        let { data, error } = await supabase
            .from(gameSelectionTable)
            .select("player, pokemon_id")
            .eq("game", game);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const newPokemonByPlayer = data.reduce<{ [id: string]: Pokemon[] }>(
            (acc, next) => {
                const player = next.player;
                const pokemonID = toID(next.pokemon_id);
                const data = Dex.forGen(
                    pointRuleset.generation
                ).species.getByID(pokemonID);
                const pokemon = {
                    data: data,
                    sprite: Sprites.getDexPokemon(pokemonID, {
                        gen: "gen5ani",
                    }) as PokemonSprite,
                };
                if (player in acc) acc[player].push(pokemon);
                else acc[player] = [pokemon];
                return acc;
            },
            {}
        );
        setPokemonByPlayerID(newPokemonByPlayer);
        if (openAll) setOpen(Object.keys(newPokemonByPlayer));
    };

    useEffect(() => {
        const select = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameSelectionTable,
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    setTrigger((last) => last + 1);
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
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for players!", payload);
                    setTrigger((last) => last + 1);
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
    }, [game]);

    useEffect(() => {
        fetchOverrides(game);
    }, [game]);

    useEffect(() => {
        if (!game) return;
        fetchGame(game);
        fetchPlayers(game);
    }, [game, trigger]);

    useEffect(() => {
        if (!game || !pointRuleset) return;
        fetchPokemonByPlayer(game, pointRuleset, true);
    }, [game, pointRuleset, trigger]);

    if (
        !gameRuleset ||
        !pointRuleset ||
        !pokemonByPlayerID ||
        !playerNameByID ||
        !overrideByPlayerID ||
        !playerPriorityByID
    )
        return <Loading />;

    const getCurrentTurnPlayerID = () => {
        if (Object.keys(playerNameByID).length < 2) return;
        const totalByID = Object.keys(playerNameByID).reduce<{
            [id: string]: number;
        }>((acc, next) => {
            acc[next] = getPointTotal(
                next,
                pokemonByPlayerID,
                pointRuleset.valueByPokemonID
            );
            return acc;
        }, {});

        const ids = Object.keys(playerNameByID);
        const filteredForLimits = ids.filter((id) => {
            const rulesetForPlayer = overrideByPlayerID[id] ?? gameRuleset;
            const hasPoints = totalByID[id] < rulesetForPlayer.maxPoints;
            const enoughRoom =
                (pokemonByPlayerID[id] ?? []).length <
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
                (playerPriorityByID[b] ?? 0) - (playerPriorityByID[a] ?? 0)
        );
        if (lowestCount % 2 == 1) filteredForRound.reverse();

        return filteredForRound?.[0];
    };
    const currentTurnPlayerID = getCurrentTurnPlayerID();

    const getIsMyTurn = (): boolean => {
        if (!session) return false;
        return currentTurnPlayerID === session.user.id;
    };

    const getIsJoinable = () => {
        const counts = Object.keys(playerNameByID).map(
            (id) => pokemonByPlayerID[id]?.length ?? 0
        );
        const lowestCount = counts.length ? Math.min(...counts) : 0;
        return (
            lowestCount === 0 && session && !(session.user.id in playerNameByID)
        );
    };

    const joinGame = async () => {
        const { error } = await supabase.from(gamePlayerTable).insert([
            {
                game,
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
            message: `Welcome to ${gameName}!`,
        });
    };

    const alreadyChosenPokemon = (pokemon: Pokemon): boolean => {
        for (const id in pokemonByPlayerID) {
            const pokemons = pokemonByPlayerID[id];
            if (pokemons.map((p) => p.data.id).includes(pokemon.data.id))
                return false;
        }
        return true;
    };

    const selectPokemon = getIsMyTurn()
        ? async (pokemon: Pokemon) => {
              if (!session)
                  return notifications.show({
                      color: "red",
                      title: "Not Logged In",
                      message: "You need to be logged in! How did you do this?",
                  });
              if (!(session.user.id in playerNameByID))
                  return notifications.show({
                      color: "red",
                      title: "Not in the Game",
                      message:
                          "You need to be in the game! How did you do this?",
                  });

              const value = pointRuleset.valueByPokemonID[pokemon.data.id];
              if (value === 0)
                  return notifications.show({
                      color: "red",
                      title: "Banned Pokemon",
                      message: `${pokemon.data.name} is a banned Pokemon!`,
                  });

              const currentPointTotal = getPointTotal(
                  session.user.id,
                  pokemonByPlayerID,
                  pointRuleset.valueByPokemonID
              );

              const rulesetForPlayer =
                  overrideByPlayerID[session.user.id] ?? gameRuleset;
              if (currentPointTotal + value > rulesetForPlayer.maxPoints)
                  return notifications.show({
                      color: "red",
                      title: "You don't have enough points",
                      message: `${pokemon.data.name} is worth too many points!`,
                  });

              const { error } = await supabase.from(gameSelectionTable).insert([
                  {
                      game,
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

    const Overrides = Object.entries(overrideByPlayerID)
        .map(([id, override]) => {
            const playerName = playerNameByID[id];
            return (
                playerName && (
                    <Text key={id}>
                        {playerName}: ({override.name}) Max Points:{" "}
                        {override.maxPoints}, Max Team Size:{" "}
                        {override.maxTeamSize}
                    </Text>
                )
            );
        })
        .filter((x) => x);

    return (
        <Center>
            <Stack justify="center" ta="center" w="80%">
                <Title className={classes.title} ta="center">
                    Game:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        {gameName}
                    </Text>
                </Title>
                {getIsJoinable() ? (
                    <Button onClick={joinGame}>Join Game</Button>
                ) : (
                    session &&
                    !(session.user.id in playerNameByID) && (
                        <Text>Game isn't accepting anymore players</Text>
                    )
                )}
                <Title order={4}>
                    Game Ruleset:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        {gameRuleset.name}
                    </Text>
                    <Text>
                        Max Points: {gameRuleset.maxPoints}, Max Team Size:{" "}
                        {gameRuleset.maxTeamSize}
                    </Text>
                </Title>
                {Overrides.length > 0 && (
                    <>
                        <Title order={4}>
                            Game Ruleset Overrides:
                            {Overrides}
                        </Title>
                    </>
                )}
                <Title order={3}>
                    Point Ruleset:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                        onClick={() => scrollToRuleset()}
                        className={classes.pointer}
                    >
                        {pointRuleset.name}
                    </Text>
                </Title>
                {currentTurnPlayerID ? (
                    <Title order={3}>
                        {playerNameByID[currentTurnPlayerID]}'s Turn To Pick
                    </Title>
                ) : Object.keys(playerNameByID).length < 2 ? (
                    <Title>Game hasn't started</Title>
                ) : (
                    <Title>Drafting is Complete</Title>
                )}
                <Grid mih="100vh">
                    <Grid.Col span={3}>
                        <Stack align="left" ta="left">
                            <Title ref={selectionRef}>Make a selection</Title>
                            <PokemonSelector
                                valueByPokemonID={pointRuleset.valueByPokemonID}
                                onSelect={selectPokemon}
                                search={search}
                                setSearch={setSearch}
                            />
                        </Stack>
                    </Grid.Col>
                    <Grid.Col ta="right" span={9}>
                        <Stack>
                            <Title>Player Selections</Title>
                            <Group justify="right">
                                <Text>Display Options:</Text>
                                <Checkbox
                                    checked={isMinimal}
                                    onChange={(e) =>
                                        setIsMinimal(e.currentTarget.checked)
                                    }
                                    label="Minimal View?"
                                />
                            </Group>
                            <SelectionAccordion
                                playerPriorityByID={playerPriorityByID}
                                open={open}
                                setOpen={setOpen}
                                selectionData={pokemonByPlayerID}
                                isMinimal={isMinimal}
                                playerNameByID={playerNameByID}
                                valueByPokemonID={pointRuleset.valueByPokemonID}
                                maxPoints={gameRuleset.maxPoints}
                                overrideByPlayerID={overrideByPlayerID}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>
                <Divider ref={rulesetRef} />
                <RulesetView
                    ruleset={pointRuleset.id}
                    cardOnClick={cardOnClick}
                    extraRulePredicates={[alreadyChosenPokemon]}
                />
            </Stack>
        </Center>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    return id && <Game game={id} />;
};
