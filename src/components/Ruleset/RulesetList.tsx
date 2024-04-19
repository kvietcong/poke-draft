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
import { fetchRulesets } from "@/util/database";

export const RulesetListView = () => {
    const [rulesets, setRulesets] = useState<[string, string][]>([]);

    useEffect(() => {
        (async () => {
            const rulesets = await fetchRulesets(supabase);
            if (rulesets) setRulesets(rulesets);
        })();
    }, []);

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
                    {rulesets.map(([id, rulesetName]) => (
                        <Card key={id}>
                            <Anchor component={Link} to={`/ruleset/${id}`}>
                                {rulesetName}
                            </Anchor>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>
        </Center>
    );
};

export const RulesetListPage = () => <RulesetListView />;
