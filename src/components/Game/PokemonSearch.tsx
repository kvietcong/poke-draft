import { useGameID, usePointRulesetID } from "@/Context";
import {
    getPointLabel,
    getPointTotal,
    searchPokemon,
    smogonOnClick,
} from "@/util/pokemon";
import { Button, Stack, Autocomplete, Title } from "@mantine/core";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { useDebouncedState } from "@mantine/hooks";
import { BaseStatDisplay, PokemonCard } from "../PokeView/View";
import { useGamePlayersQuery, usePointRulesetQuery } from "@/queries";
import { useSessionStore } from "@/stores";
import { Pokemon } from "@/types";
import { notifications } from "@mantine/notifications";
import supabase from "@/supabase";
import { gameSelectionTable } from "@/util/database";

export const PokemonSearcher = ({
    canSelect,
    search,
    setSearch,
    children,
}: {
    search: string;
    canSelect: boolean;
    setSearch: (newValue: string) => void;
    children?: ReactNode;
}) => {
    const gameID = useGameID();
    const { dex, pointRulesetInfo, valueByPokemonID } =
        usePointRulesetQuery(usePointRulesetID()).data!;
    const { playerInfoByID } = useGamePlayersQuery(gameID).data!;
    const userID = useSessionStore((state) => state.session?.user.id);

    const [internalSearch, setInternalSearch] = useDebouncedState(search, 150);

    useEffect(() => {
        setSearch(internalSearch);
    }, [internalSearch]);

    const cleanSearch = search.trim();

    const pokemon = useMemo(() => {
        return searchPokemon(cleanSearch, dex);
    }, [search]);

    const points = getPointLabel(pokemon, valueByPokemonID);

    const suggestions = useMemo(
        () =>
            dex.species
                .all()
                .map((p) => p.id)
                .toSorted(),
        [dex]
    );

    const SearchBar = (
        <Autocomplete
            label="Search for a Pokemon"
            placeholder="Pokemon Name"
            defaultValue={internalSearch}
            onChange={setInternalSearch}
            data={suggestions}
            limit={5}
        />
    );

    const selectPokemon = useCallback(
        async (pokemon: Pokemon) => {
            if (!userID) throw new Error("No session detected!");

            const currentPointTotal = getPointTotal(
                Object.values(playerInfoByID[userID].selections),
                valueByPokemonID
            );

            const value = valueByPokemonID[pokemon.data.id];
            const rulesetForPlayer = playerInfoByID[userID].rules;
            if (currentPointTotal + value > rulesetForPlayer.maxPoints)
                return notifications.show({
                    color: "red",
                    title: "You don't have enough points",
                    message: `${pokemon.data.name} is worth too many points!`,
                });

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
        },
        [userID, gameID, playerInfoByID, valueByPokemonID, notifications]
    );

    const ConfirmButton = canSelect && (
        <Button
            onClick={() =>
                confirm(
                    `Are you sure you want to select ${pokemon.data.name} for ${points} points?`
                ) && selectPokemon(pokemon)
            }
        >
            Select Current Pokemon
        </Button>
    );

    const PokemonInfo = pokemon.data.exists && (
        <>
            <Title order={3}>{points}</Title>
            <PokemonCard
                pokemon={pokemon}
                onClick={() =>
                    smogonOnClick(pokemon, pointRulesetInfo.generation)
                }
            />
            <Title>Stats</Title>
            <BaseStatDisplay pokemon={pokemon} />
        </>
    );

    let error_msg = null;
    if (!pokemon.data.exists) error_msg = `Couldn't find ${search}`;
    else if (pokemon.data.gen > pointRulesetInfo.generation)
        error_msg = `${pokemon.data.name} isn't in generation ${pointRulesetInfo.generation}`;
    else if (valueByPokemonID[pokemon.data.id] === 0)
        error_msg = `${pokemon.data.name} is Banned!`;

    const SearchError = error_msg && <Title order={2}>{error_msg}</Title>;

    return (
        <Stack align="center" ta="center">
            <Title id="make-selection">Make a selection</Title>
            {children}
            {cleanSearch && !error_msg && ConfirmButton}
            {SearchBar}
            {cleanSearch && (PokemonInfo || SearchError)}
        </Stack>
    );
};
