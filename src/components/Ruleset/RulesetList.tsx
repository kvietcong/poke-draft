import classes from "@/App.module.css";
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
import { usePointRulesetsQuery } from "@/queries";
import { Loading } from "../Loading/Loading";

export const RulesetListView = () => {
    const pointRulesetsQuery = usePointRulesetsQuery();

    if (pointRulesetsQuery.isPending) return <Loading />;
    if (pointRulesetsQuery.isError)
        throw Error("Couldn't fetch point rulesets");

    const rulesets = pointRulesetsQuery.data;

    return (
        <Center>
            <Stack>
                <Title ta="center" className={classes.title}>
                    All Point{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        Rulesets
                    </Text>
                </Title>
                <SimpleGrid>
                    {rulesets.map(({ id, name }) => (
                        <Card key={id}>
                            <Anchor component={Link} to={`/ruleset/${id}`}>
                                {name}
                            </Anchor>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </Center>
    );
};

export const RulesetListPage = () => <RulesetListView />;
