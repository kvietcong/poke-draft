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
import { pointRulesetTable } from "@/util/DatabaseTables";

export const RulesetListView = () => {
    const [rulesets, setRulesets] = useState<[string, string][]>([]);

    const fetchRulesets = async () => {
        let { data, error } = await supabase
            .from(pointRulesetTable)
            .select("id, name");
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const newRulesets = data.map<[string, string]>((val) => [
            val.id,
            val.name,
        ]);
        setRulesets(newRulesets);
    };

    useEffect(() => {
        fetchRulesets();
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
