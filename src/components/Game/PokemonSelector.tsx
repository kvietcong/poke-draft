import { useGameID, usePointRulesetID } from "@/Context";
import {
    useCurrentDrafterQuery,
    useGamePlayersQuery,
    usePointRulesetQuery,
} from "@/queries";
import { useSessionStore } from "@/stores";
import {
    getPointLabel,
    getPointTotal,
    searchPokemon,
    smogonOnClick,
} from "@/util/pokemon";
import { Autocomplete, Button, Group, Stack, Text, Title } from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BaseStatDisplay, PokemonCard } from "../PokeView/View";
import { Pokemon } from "@/types";
import { useDebouncedState } from "@mantine/hooks";
import supabase from "@/supabase";
import { gameSelectionTable } from "@/util/database";
import { notifications } from "@mantine/notifications";

const selectPokemon = async (
    pokemon: Pokemon,
    gameID: string,
    userID: string
) => {
    const { error } = await supabase.from(gameSelectionTable).insert([
        {
            game: gameID,
            pokemon_id: pokemon.data.id,
            player: userID,
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
};

export const PokemonSelector = ({
    search,
    setSearch,
    children,
}: {
    search: string;
    setSearch: (newValue: string) => void;
    children?: ReactNode;
}) => {
    const gameID = useGameID();
    const { dex, pointRulesetInfo, valueByPokemonID } =
        usePointRulesetQuery(usePointRulesetID()).data!;
    const currentDrafter = useCurrentDrafterQuery(gameID).data;
    const { playerInfoByID } = useGamePlayersQuery(gameID).data!;
    const userID = useSessionStore((state) => state.session?.user.id)!;

    const [debouncedSearch, setDebouncedSearch] = useDebouncedState(
        search,
        150
    );
    useEffect(() => {
        setDebouncedSearch(search);
    }, [search]);

    const toSearch = useMemo(() => debouncedSearch.trim(), [debouncedSearch]);
    const pokemon = useMemo(() => {
        return searchPokemon(toSearch, dex);
    }, [toSearch]);

    const suggestions = useMemo(
        () =>
            dex.species
                .all()
                .map((p) => p.id)
                .toSorted(),
        [dex]
    );

    const currentPointTotal = getPointTotal(
        Object.values(playerInfoByID[userID].selections),
        valueByPokemonID
    );

    const notEnoughPoints =
        currentPointTotal + valueByPokemonID[pokemon.data.id] >
        playerInfoByID[userID].rules.maxPoints;

    let error_msg = null;
    let isValidPokemon = true;
    if (!pokemon.data.exists) {
        error_msg = `Couldn't find ${search ? search : "your search"}`;
        isValidPokemon = false;
    } else if (pokemon.data.gen > pointRulesetInfo.generation) {
        error_msg = `${pokemon.data.name} isn't in generation ${pointRulesetInfo.generation}`;
        isValidPokemon = false;
    } else if (valueByPokemonID[pokemon.data.id] === 0)
        error_msg = `${pokemon.data.name} is Banned!`;
    else if (notEnoughPoints) error_msg = "You don't have enough points!";
    else if (currentDrafter && currentDrafter !== userID)
        error_msg = `Currently ${playerInfoByID[currentDrafter].name}'s turn to pick`;
    else if (!currentDrafter) error_msg = "Everyone has picked";

    return (
        <Group grow>
            <Stack align="center">
                <Autocomplete
                    label="Search for a Pokemon"
                    placeholder="Pokemon Name"
                    value={search}
                    onChange={setSearch}
                    data={suggestions}
                    limit={5}
                />
                {error_msg ? (
                    <Text>{error_msg}</Text>
                ) : (
                    <>
                        <Button
                            onClick={() =>
                                confirm("You sure?") &&
                                selectPokemon(pokemon, gameID, userID)
                            }
                        >
                            Select Pokemon
                        </Button>
                    </>
                )}
                {isValidPokemon && (
                    <Button
                        onClick={() =>
                            smogonOnClick(pokemon, pointRulesetInfo.generation)
                        }
                    >
                        See Smogon Analysis
                    </Button>
                )}
                <Text>
                    You have{" "}
                    {playerInfoByID[userID].rules.maxPoints - currentPointTotal}{" "}
                    points left
                </Text>
                {children}
            </Stack>
            <Stack align="center">
                <Title order={3}>
                    {getPointLabel(pokemon, valueByPokemonID)}
                </Title>
                <PokemonCard
                    pokemon={pokemon}
                    onClick={() =>
                        smogonOnClick(pokemon, pointRulesetInfo.generation)
                    }
                />
                <Title>Stats</Title>
                <BaseStatDisplay pokemon={pokemon} />
            </Stack>
        </Group>
    );
};
