import { useState, useEffect } from "react";
import classes from "@/App.module.css";
import supabase from "@/supabase";

import {
    Card,
    Center,
    SimpleGrid,
    Title,
    Stack,
    Text,
    Anchor,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { gameTable, pointRulesetTable } from "@/util/DatabaseTables";

export const GameListView = () => {
    const [games, setGames] = useState<[string, string][]>([]);

    const fetchGames = async () => {
        let { data, error } = await supabase.from(gameTable).select(`id, name`);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const newGames = data.map<[string, string]>((x) => [x.id, x.name]);
        setGames(newGames);
    };

    useEffect(() => {
        fetchGames();
    }, []);

    return (
        <Center>
            <Stack>
                <Title ta="center" className={classes.title}>
                    All{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        Games
                    </Text>
                </Title>
                <SimpleGrid>
                    {games.map(([id, rulesetName]) => (
                        <Card key={id}>
                            <Anchor component={Link} to={`/game/${id}`}>
                                {rulesetName}
                            </Anchor>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </Center>
    );
};

export const GameListPage = () => <GameListView />;
