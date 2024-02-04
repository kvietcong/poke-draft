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
    FloatingPosition,
} from "@mantine/core";
import getGenerationName from "@/util/GenerationName";
import { Pokemon } from "@/types";
import { useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

export type CardOnClick = (pokemon: Pokemon) => void;
const defaultCardOnClick = (pokemon: Pokemon, generation: number) =>
    window.open(
        `https://www.smogon.com/dex/${getGenerationName(generation)}/pokemon/${pokemon.data.name}/`
    );

export const BasicStatDisplay = ({ pokemon }: { pokemon: Pokemon }) => {
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
    tooltipPosition,
}: {
    children: ReactNode;
    pokemon: Pokemon;
    tooltipPosition?: FloatingPosition;
}) => (
    <Tooltip
        label={<BasicStatDisplay pokemon={pokemon} />}
        transitionProps={{ transition: "pop", duration: 360 }}
        position={tooltipPosition}
    >
        <div>{children}</div>
    </Tooltip>
);

const copyID = (pokemon: Pokemon, clipboard: any) => {
    clipboard.copy(pokemon.data.id);
};
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
    const clipboard = useClipboard({ timeout: 500 });

    return (
        <Card radius="lg" withBorder w={150} mih={150} padding={20}>
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
                radius={15}
                onClick={(_) => onCardClick(pokemon, generation)}
                className={[classes.pointer, classes.glow].join(" ")}
            />
            <Tooltip label="Click to copy ID" position="bottom">
                <Text
                    ta="center"
                    className={classes.pointer}
                    onClick={() => {
                        copyID(pokemon, clipboard);
                        notifications.show({
                            title: "Copy",
                            message: "You copied the Pokemon ID",
                        });
                    }}
                >
                    {pokemon.data.name}
                </Text>
            </Tooltip>
            {pokemon.data.types.map((type) => (
                <Badge key={type} m={1} w={100} color={getTypeColor(type)}>
                    {type}
                </Badge>
            ))}
        </Card>
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
        <Badge
            className={classes.pointer}
            onClick={(_) => onCardClick(pokemon, generation)}
            color={primaryColor}
            style={{
                border: "2px solid " + secondaryColor,
                boxShadow: "0px 0px 4px 1px " + secondaryColor,
            }}
        >
            {pokemon.data.name}
        </Badge>
    );
};
