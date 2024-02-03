import classes from "./View.module.css";
import { ReactNode } from "react";
import { getTypeColor } from "@/util/PokemonColors";
import { getStatColor } from "@/util/StatColors";

import {
    Card,
    Image,
    Text,
    Badge,
    Group,
    Stack,
    Grid,
    Progress,
    Tooltip,
} from "@mantine/core";
import getGenerationName from "@/util/GenerationName";
import { Pokemon } from "@/types";

export type CardOnClick = (pokemon: Pokemon) => void;
const defaultCardOnClick = (pokemon: Pokemon, generation: number) =>
    window.open(
        `https://www.smogon.com/dex/${getGenerationName(generation)}/pokemon/${pokemon.data.name}/`
    );

export const HoverTooltipLabel = ({ pokemon }: { pokemon: Pokemon }) => {
    const typeBadges = pokemon.data.types.map((type) => (
        <Badge key={type} color={getTypeColor(type)}>
            {type}
        </Badge>
    ));
    return (
        <Stack miw={250} gap={4}>
            <BaseStatDisplay pokemon={pokemon}></BaseStatDisplay>
            <Group grow>{typeBadges}</Group>
            <Text>
                Abilities:{" "}
                {Object.values(pokemon.data.abilities as object).join(", ")}
            </Text>
        </Stack>
    );
};

export const PokemonTooltip = ({
    children,
    pokemon,
}: {
    children: ReactNode;
    pokemon: Pokemon;
}) => (
    <Tooltip
        label={<HoverTooltipLabel pokemon={pokemon} />}
        transitionProps={{ transition: "pop", duration: 360 }}
    >
        {children}
    </Tooltip>
);

export const PokemonCard = ({
    pokemon,
    generation,
    onClick,
}: {
    pokemon: Pokemon;
    generation: number;
    onClick?: CardOnClick;
}) => {
    const onCardClick = onClick || defaultCardOnClick;
    return (
        <PokemonTooltip pokemon={pokemon}>
            <Card
                radius="lg"
                withBorder
                w={150}
                mih={150}
                padding={20}
                onClick={(_) => onCardClick(pokemon, generation)}
                className={classes.hoverPointer}
            >
                <Image
                    src={pokemon.sprite.url}
                    style={{
                        imageRendering: pokemon.sprite.pixelated
                            ? "pixelated"
                            : "auto",
                    }}
                    w="100%"
                    mah={100}
                    fit="contain"
                />
                <Text ta="center">{pokemon.data.name}</Text>
                {pokemon.data.types.map((type) => (
                    <Badge key={type} m={1} w={100} color={getTypeColor(type)}>
                        {type}
                    </Badge>
                ))}
            </Card>
        </PokemonTooltip>
    );
};

export const BaseStatDisplay = ({ pokemon }: { pokemon: Pokemon }) => {
    const StatBar = (statName: string, statValue: number) => {
        const barWidth = (statValue / 200) * 100; // Assuming base stat max is 255
        const color = getStatColor(statName);
        return (
            <>
                <Progress.Root size={20} radius={0}>
                    <Progress.Section
                        value={barWidth}
                        color={color}
                        style={{ overflow: "visible" }}
                    >
                        <Progress.Label
                            w="100%"
                            style={{
                                overflow: "visible",
                                textShadow: "black 0 0 15px",
                            }}
                        >
                            {statName}: {statValue}
                        </Progress.Label>
                    </Progress.Section>
                </Progress.Root>
            </>
        );
    };

    return (
        <Grid gutter="xl">
            <Grid.Col span={12}>
                {StatBar("HP", pokemon.data.baseStats.hp)}
                {StatBar("Attack", pokemon.data.baseStats.atk)}
                {StatBar("Defense", pokemon.data.baseStats.def)}
                {StatBar("Sp. Attack", pokemon.data.baseStats.spa)}
                {StatBar("Sp. Defense", pokemon.data.baseStats.spd)}
                {StatBar("Speed", pokemon.data.baseStats.spe)}
            </Grid.Col>
        </Grid>
    );
};

export const PokemonPill = ({
    pokemon,
    generation,
    onClick,
}: {
    pokemon: Pokemon;
    generation: number;
    onClick?: CardOnClick;
}) => {
    const onCardClick = onClick || defaultCardOnClick;
    const primaryColor = getTypeColor(pokemon.data.types[0]);
    const secondaryColor = getTypeColor(
        pokemon.data.types[1] ?? pokemon.data.types[0]
    );
    return (
        <PokemonTooltip pokemon={pokemon}>
            <Badge
                className={classes.hoverPointer}
                onClick={(_) => onCardClick(pokemon, generation)}
                color={primaryColor}
                style={{
                    border: "2px solid " + secondaryColor,
                    boxShadow: "0px 0px 4px 1px " + secondaryColor,
                }}
            >
                {pokemon.data.name}
            </Badge>
        </PokemonTooltip>
    );
};
