import {
    useState,
    useEffect,
    Dispatch,
    SetStateAction,
    useMemo,
    useContext,
} from "react";
import { Link, useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    gamePlayerTable,
    gameRulesetTable,
    gameSelectionTable,
    gameTable,
    pointRuleTable,
    pointRulesetTable,
} from "@/util/DatabaseTables";
import {
    Accordion,
    Anchor,
    Button,
    Center,
    Checkbox,
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
    PokemonCard,
    PokemonPill,
    PokemonTooltip,
} from "@/components/PokeView/View";
import { Dex, toID } from "@pkmn/dex";
import { PokemonSprite, Sprites } from "@pkmn/img";
import { Loading } from "../Loading/Loading";
import { useDebouncedState } from "@mantine/hooks";
import { AppContext } from "@/App";
import { notifications } from "@mantine/notifications";

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
    generation,
    selectionData,
    playerNameByID,
    valueByPokemonID,
}: {
    open: string[];
    setOpen: Dispatch<SetStateAction<string[]>>;
    isMinimal: boolean;
    generation?: number;
    selectionData: SelectionData;
    playerNameByID: { [id: string]: string };
    valueByPokemonID: ValueByPokemonID;
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    return (
        <Accordion
            value={open}
            onChange={setOpen}
            multiple={true}
            variant={isMinimal ? "filled" : "separated"}
        >
            {Object.entries(playerNameByID).map(([playerID, playerName]) => (
                <Accordion.Item key={playerID} value={playerID}>
                    <Accordion.Control>
                        {playerName}:{" "}
                        {getPointTotal(
                            playerID,
                            selectionData,
                            valueByPokemonID
                        )}{" "}
                        points used
                    </Accordion.Control>
                    <Accordion.Panel>
                        {open && open.includes(playerID) ? (
                            <Group justify="center" ta="center">
                                {selectionData[playerID]?.map((pokemon) => (
                                    <PokemonTooltip
                                        pokemon={pokemon}
                                        key={pokemon.data.id}
                                    >
                                        <PokemonDisplay
                                            pokemon={pokemon}
                                            generation={generation ?? 9}
                                        />
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
    generation,
    valueByPokemonID,
    onSelect,
}: {
    generation: number;
    valueByPokemonID: { [pokemonID: string]: number };
    onSelect?: (pokemon: Pokemon) => any;
}) => {
    const [search, setSearch] = useDebouncedState("", 150);
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
                <PokemonCard pokemon={pokemon} generation={generation} />
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
    const [gameRuleset, setGameRuleset] = useState<{
        name: string;
        rules: any;
    }>();

    const [playerNameByID, setPlayerNameByID] = useState<{
        [id: string]: string;
    }>();
    const [pokemonByPlayerID, setPokemonByPlayerID] = useState<{
        [id: string]: Pokemon[];
    }>();

    type RulesetInfo = {
        id: string;
        generation: number;
        name: string;
        valueByPokemonID: { [pokemonID: string]: number };
    };
    const [pointRuleset, setPointRuleset] = useState<RulesetInfo>();

    const [open, setOpen] = useState<string[]>([]);
    const [isMinimal, setIsMinimal] = useState(false);

    const fetchGame = async (game: string) => {
        let { data, error } = await supabase
            .from(gameTable)
            .select(
                `name,
                ${gameRulesetTable} (name, rules),
                ${pointRulesetTable} (id, name, generation,
                    ${pointRuleTable} (pokemon_id, value))`
            )
            .eq("id", game)
            .returns<
                {
                    name: string;
                    [gameRulesetTable]: { name: string; rules: {} };
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
        setGameRuleset(data[gameRulesetTable]);
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
            .select("player (id, display_name)")
            .eq("game", game)
            .returns<{ player: { id: string; display_name: string } }[]>();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setPlayerNameByID(
            data.reduce<{ [id: string]: string }>((acc, next) => {
                acc[next.player.id] = next.player.display_name;
                return acc;
            }, {})
        );
    };

    const fetchPokemonByPlayer = async (
        game: string,
        pointRuleset: RulesetInfo,
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
        if (!game) return;
        fetchGame(game);
        fetchPlayers(game);
    }, [game, trigger]);

    useEffect(() => {
        if (!game || !pointRuleset) return;
        fetchPokemonByPlayer(game, pointRuleset, true);
    }, [game, pointRuleset, trigger]);

    if (!gameRuleset || !pointRuleset || !pokemonByPlayerID || !playerNameByID)
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
        const lowestCount = Math.min(
            ...Object.keys(playerNameByID).map(
                (id) => pokemonByPlayerID[id]?.length ?? 0
            )
        );
        const ids = Object.keys(playerNameByID);
        const filtered = ids.filter((id) => {
            const hasNotPickedThisRound =
                (pokemonByPlayerID[id]?.length ?? 0) == lowestCount;
            const hasPoints =
                totalByID[id] < (gameRuleset.rules.maxPoints as number);
            const enoughRoom =
                (pokemonByPlayerID[id] ?? []).length <
                (gameRuleset.rules.maxTeamSize as number);
            return hasPoints && hasNotPickedThisRound && enoughRoom;
        });
        filtered.sort((a, b) => {
            // TODO: HAVE PRIORITY SORT
            return 0;
        });
        console.log(filtered);
        return filtered?.[0];
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
            color: "red",
            title: "Game Joined",
            message: `Welcome to ${gameName}!`,
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

            const value = pointRuleset.valueByPokemonID[pokemon.data.id];
            if (value === 0)
                return notifications.show({
                    color: "red",
                    title: "Failure",
                    message: `${pokemon.data.name} is a banned Pokemon!`,
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
                ) : (session && !(session.user.id in playerNameByID)) && (
                    <Text>Game isn't accepting anymore players</Text>
                )}
                <Title order={3}>
                    Game Ruleset:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        {gameRuleset.name}
                    </Text>
                </Title>
                <Stack>
                    {Object.entries(gameRuleset.rules).map(([k, v]) => (
                        <Text key={k}>
                            {k}: {JSON.stringify(v)}
                        </Text>
                    ))}
                </Stack>
                <Title order={3}>
                    Point Ruleset:{" "}
                    <Anchor component={Link} to={`/ruleset/${pointRuleset.id}`}>
                        <Text inherit component="span">
                            {pointRuleset.name}
                        </Text>
                    </Anchor>
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
                <Grid>
                    <Grid.Col span={3}>
                        <Stack align="left" ta="left">
                            <Title>Make a selection</Title>
                            <PokemonSelector
                                generation={pointRuleset.generation}
                                valueByPokemonID={pointRuleset.valueByPokemonID}
                                onSelect={selectPokemon}
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
                                open={open}
                                setOpen={setOpen}
                                selectionData={pokemonByPlayerID}
                                isMinimal={isMinimal}
                                playerNameByID={playerNameByID}
                                valueByPokemonID={pointRuleset.valueByPokemonID}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Stack>
        </Center>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    return id && <Game game={id} />;
};
