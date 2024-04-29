import classes from "./View.module.css";
import appClasses from "@/App.module.css";
import { Dispatch, ReactNode, SetStateAction, useMemo } from "react";
import { getTypeColor } from "@/util/PokemonColors";
import { getStatColor } from "@/util/StatColors";
import {
    Card,
    Image,
    Text,
    Badge,
    Stack,
    Grid,
    Progress,
    Tooltip,
    FloatingPosition,
    Group,
    Flex,
    Accordion,
} from "@mantine/core";
import { Pokemon } from "@/types";
import { useClipboard } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Dex, TypeName } from "@pkmn/dex";
import { smogonOnClick } from "@/util/Pokemon";

export type CardOnClick = (pokemon: Pokemon, event: React.MouseEvent) => void;
const defaultCardOnClick = (pokemon: Pokemon) =>
    smogonOnClick(pokemon, pokemon.data.gen);

const getTypesByDamageMultiplier = (
    types: [TypeName] | [TypeName, TypeName]
) => {
    const manyDamageTypeByType = types.map(
        (type) => Dex.types.get(type).damageTaken
    );

    const manyDamageMultiplierByType = [];
    for (const damageTypeByType of manyDamageTypeByType) {
        const damageMultiplierByType: { [type: string]: number } = {};
        for (const [type, damageType] of Object.entries(damageTypeByType)) {
            let damageMultiplier = 1;
            if (damageType === 3) damageMultiplier = 0;
            else if (damageType === 2) damageMultiplier = 0.5;
            else if (damageType === 1) damageMultiplier = 2;
            damageMultiplierByType[type] = damageMultiplier;
        }
        manyDamageMultiplierByType.push(damageMultiplierByType);
    }

    const allTypes = Dex.types.all().map((type) => type.name);
    const finalDamageMultiplierByType = allTypes.reduce<{
        [type: string]: number;
    }>((acc, next) => {
        acc[next] = 1;
        return acc;
    }, {});

    for (const damageMultiplierByType of manyDamageMultiplierByType) {
        for (const [type, damageMultiplier] of Object.entries(
            damageMultiplierByType
        )) {
            finalDamageMultiplierByType[type] =
                finalDamageMultiplierByType[type] * damageMultiplier;
        }
    }

    const result: { [type: string]: string[] } = {};
    for (const [type, damageMultiplier] of Object.entries(
        finalDamageMultiplierByType
    )) {
        if (damageMultiplier === 1) continue;
        if (damageMultiplier in result) result[damageMultiplier].push(type);
        else result[damageMultiplier] = [type];
    }

    return result;
};

export const BasicStatDisplay = ({ pokemon }: { pokemon: Pokemon }) => {
    const typeBadges = pokemon.data.types.map((type) => (
        <Badge key={type} color={getTypeColor(type)}>
            {type}
        </Badge>
    ));

    const effectivenessSection = Object.entries(
        getTypesByDamageMultiplier(pokemon.data.types)
    )
        .sort()
        .reduce<JSX.Element[]>((acc, next) => {
            const [damageMultiplier, types] = next;
            if (!types.length) return acc;

            const element = (
                <div key={damageMultiplier}>
                    <Text ta="center" style={{ textWrap: "wrap" }}>
                        <strong>{damageMultiplier}x Damage Taken: </strong>
                    </Text>
                    <Flex wrap="wrap" justify="center">
                        {types.map((type) => (
                            <Badge key={type} color={getTypeColor(type)}>
                                {type}
                            </Badge>
                        ))}
                    </Flex>
                </div>
            );
            acc.push(element);
            return acc;
        }, []);

    return (
        <Stack w={250} gap={4}>
            <BaseStatDisplay pokemon={pokemon}></BaseStatDisplay>
            <Group grow>{typeBadges}</Group>
            <Text ta="center" style={{ textWrap: "wrap" }}>
                <strong>Abilities: </strong>
                {Object.values(pokemon.data.abilities as object).join(", ")}
            </Text>
            {effectivenessSection}
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
    onClick,
}: {
    pokemon: Pokemon;
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
                onClick={(e) => onCardClick(pokemon, e)}
                className={[appClasses.pointer, classes.glow].join(" ")}
                loading="lazy"
            />
            <Tooltip label="Click to copy ID" position="bottom">
                <Text
                    ta="center"
                    className={appClasses.pointer}
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
    onClick,
}: {
    pokemon: Pokemon;
    onClick?: CardOnClick;
}) => {
    const onCardClick = onClick || defaultCardOnClick;
    const primaryColor = getTypeColor(pokemon.data.types[0]);
    const secondaryColor = getTypeColor(
        pokemon.data.types[1] ?? pokemon.data.types[0]
    );
    return (
        <Badge
            className={appClasses.pointer}
            onClick={(e) => onCardClick(pokemon, e)}
            color={primaryColor}
            h={40}
            style={{
                border: "2px solid " + secondaryColor,
                boxShadow: "0px 0px 4px 1px " + secondaryColor,
            }}
        >
            <Group
                gap={0}
                style={{ textShadow: "black 0 2px 8px", paddingRight: "5px" }}
            >
                <span style={{ ...pokemon.icon }} />
                {pokemon.data.name}
            </Group>
        </Badge>
    );
};

export type AccordionSectionData = [label: string, pokemonData: Pokemon[]];
export type AccordionData = AccordionSectionData[];
export const PokemonAccordion = ({
    data,
    open,
    setOpen,
    isMinimal,
    cardOnClick,
    cardLabeler,
    defaultValue,
    allowMultiple,
    sectionLabelTransformer,
}: {
    data: AccordionData;
    open?: string[] | string | null;
    setOpen?:
        | Dispatch<SetStateAction<string[]>>
        | Dispatch<SetStateAction<string | null>>;
    isMinimal?: boolean;
    cardOnClick?: CardOnClick;
    cardLabeler?: (pokemon: Pokemon) => ReactNode;
    defaultValue?: string[] | string | null;
    allowMultiple?: boolean;
    sectionLabelTransformer?: (label: string) => ReactNode;
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    const sortedData = useMemo(() => {
        return data.map(([label, pokemonData]) => [
            label,
            pokemonData.toSorted((a, b) =>
                a.data.name.localeCompare(b.data.name)
            ),
        ]) as AccordionData;
    }, [data]);

    const accordionItems = sortedData.map(([label, pokemonData]) => {
        return (
            <Accordion.Item key={label} value={label}>
                <Accordion.Control>
                    {sectionLabelTransformer
                        ? sectionLabelTransformer(label)
                        : label}
                </Accordion.Control>
                <Accordion.Panel>
                    <Group justify="center" ta="center">
                        {(!(open || setOpen) ||
                            open === label ||
                            open?.includes(label)) &&
                            pokemonData.map((pokemon) => (
                                <PokemonTooltip
                                    key={pokemon.data.id}
                                    pokemon={pokemon}
                                >
                                    <Stack gap="xs">
                                        <PokemonDisplay
                                            pokemon={pokemon}
                                            onClick={cardOnClick}
                                        />
                                        {cardLabeler && cardLabeler(pokemon)}
                                    </Stack>
                                </PokemonTooltip>
                            ))}
                    </Group>
                </Accordion.Panel>
            </Accordion.Item>
        );
    });

    const variant = isMinimal ? "filled" : "separated";

    return allowMultiple ?? true ? (
        <Accordion
            value={open as string[]}
            multiple={true}
            onChange={setOpen as Dispatch<SetStateAction<string[]>>}
            defaultValue={defaultValue as string[]}
            variant={variant}
            w="100%"
        >
            {accordionItems}
        </Accordion>
    ) : (
        <Accordion
            value={open as string}
            multiple={false}
            onChange={setOpen as Dispatch<SetStateAction<string | null>>}
            defaultValue={defaultValue as string | null}
            variant={variant}
            w="100%"
        >
            {accordionItems}
        </Accordion>
    );
};
