import classes from "@/App.module.css";
import { useGamesQuery } from "@/queries";
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
import { Loading } from "../Loading/Loading";
import { useIsThinScreen } from "@/util/helpers";

export const GameListView = () => {
    const gamesQuery = useGamesQuery();
    const isThinScreen = useIsThinScreen();

    if (gamesQuery.isPending) return <Loading />;
    if (gamesQuery.isError) throw Error("Couldn't fetch games");

    const games = gamesQuery.data;

    return (
        <Center>
            <Stack w={isThinScreen ? "95%" : "80%"}>
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
