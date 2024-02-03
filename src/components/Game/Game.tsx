import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    gamePlayerTable,
    gameRulesetTable,
    gameSelectionTable,
    gameTable,
} from "@/util/DatabaseTables";
import { Center, Stack, Text, Title } from "@mantine/core";
import classes from "@/App.module.css";

const Game = ({ game }: { game: string }) => {
    const [gameName, setGameName] = useState<string>("");
    const [gameRuleset, setGameRuleset] = useState<[string, object] | null>(
        null
    );
    const [players, setPlayers] = useState<string[]>([]);
    const [pokemonByPlayer, setPokemonByPlayer] = useState<{
        [player: string]: string[];
    }>({});

    const fetchGame = async (game: string) => {
        let { data, error } = await supabase
            .from(gameTable)
            .select(`name, ${gameRulesetTable} (name, rules)`)
            .eq("id", game)
            .limit(1)
            .single();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setGameName(data.name);
        setGameRuleset([data.name, data.game_ruleset]);
    };

    const fetchPlayers = async (game: string) => {
        let { data, error } = await supabase
            .from(gamePlayerTable)
            .select("player (display_name)")
            .eq("game", game)
            .returns<{ player: { display_name: string } }[]>();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setPlayers(data.map((x) => x.player.display_name));
    };

    const fetchSelections = async (game: string) => {
        let { data, error } = await supabase
            .from(gameSelectionTable)
            .select("player (display_name), pokemon_id")
            .eq("game", game)
            .returns<
                { player: { display_name: string }; pokemon_id: string }[]
            >();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setPokemonByPlayer(
            data.reduce<{ [player: string]: string[] }>((acc, next) => {
                const player = next.player.display_name;
                if (player in acc) acc[player].push(next.pokemon_id);
                else acc[player] = [next.pokemon_id];
                return acc;
            }, {})
        );
    };

    useEffect(() => {
        const channels = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "game_selection",
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    fetchSelections(game);
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channels);
        };
    }, [game]);

    useEffect(() => {
        fetchGame(game);
        fetchPlayers(game);
        fetchSelections(game);
    }, [game]);

    return (
        <Center>
            <Stack w="50%">
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
                <Text>Game Ruleset: {JSON.stringify(gameRuleset)}</Text>
                <Text>Players: {JSON.stringify(players)}</Text>
                <Text>
                    Pokemon By Player: {JSON.stringify(pokemonByPlayer)}
                </Text>
            </Stack>
        </Center>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    return id && <Game game={id} />;
};
