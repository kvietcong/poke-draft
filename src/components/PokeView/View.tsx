import classes from "./View.module.css";
import appClasses from "@/App.module.css";
import { Dispatch, ReactNode, SetStateAction, useMemo } from "react";
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
    Modal,
    Autocomplete,
    Chip,
    Checkbox,
    MultiSelect,
    Slider,
    RangeSlider,
} from "@mantine/core";
import { Pokemon } from "@/types";
import { useClipboard, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Dex, ModdedDex } from "@pkmn/dex";
import {
    colorByType,
    getTypeColor,
    getTypesByDamageMultiplier,
    smogonOnClick,
} from "@/util/pokemon";
import { PokeFilter } from "@/util/hooks";

export type CardOnClick = (pokemon: Pokemon, event: React.MouseEvent) => void;
const defaultCardOnClick = (pokemon: Pokemon) =>
    smogonOnClick(pokemon, pokemon.data.gen);

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
        <Card radius="lg" withBorder w="12vw" maw={150} miw={100}>
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
                <Badge key={type} m={1} w="100%" color={getTypeColor(type)}>
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
        <Grid gutter="xl" w="100%">
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

    const icon = <span style={{ ...pokemon.icon }} />;
    return (
        <Badge
            className={appClasses.pointer}
            onClick={(e) => onCardClick(pokemon, e)}
            gradient={{ from: primaryColor, to: secondaryColor, deg: 0 }}
            leftSection={icon}
            variant="gradient"
            mih={40}
            styles={{
                label: { overflow: "visible" },
                section: { marginInlineEnd: 0 },
            }}
            style={{
                fontSize: "64%",
                textShadow: "0 0 16px black",
                boxShadow: "0 0 8px " + primaryColor,
            }}
        >
            {pokemon.data.name}
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
    getIsLabelDisabled,
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
    getIsLabelDisabled?: (label: string) => boolean;
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
                <Accordion.Control
                    disabled={
                        getIsLabelDisabled ? getIsLabelDisabled(label) : false
                    }
                >
                    {sectionLabelTransformer
                        ? sectionLabelTransformer(label)
                        : label}
                </Accordion.Control>
                <Accordion.Panel>
                    <Group justify="center" ta="center" gap="xs">
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

type DisclosureHandlers = ReturnType<typeof useDisclosure>[1];
export const RootPokemonFilterModal = ({
    pokeFilter,
    showFilterModal,
    filterModalHandlers,

    dex,
    children,
    placeChildrenAfter,
}: {
    pokeFilter: PokeFilter;
    showFilterModal: boolean;
    filterModalHandlers: DisclosureHandlers;

    dex?: ModdedDex;
    children?: ReactNode;
    placeChildrenAfter?: boolean;
}) => {
    const { suggestions, theMoves } = useMemo(() => {
        const suggestions = (dex ?? Dex).species
            .all()
            .map((p) => p.id)
            .toSorted();
        const theMoves = Object.values(
            (dex ?? Dex).moves.all().reduce<{
                [id: string]: { value: string; label: string };
            }>((acc, move) => {
                acc[move.id] = {
                    value: move.id,
                    label: move.name,
                };
                return acc;
            }, {})
        );
        return { suggestions, theMoves };
    }, [dex]);

    return (
        <Modal
            opened={showFilterModal}
            onClose={filterModalHandlers.close}
            title="Filters"
            radius="md"
            keepMounted={true}
            size="75%"
            centered
        >
            <Stack>
                {!placeChildrenAfter && children}
                <Autocomplete
                    limit={5}
                    label="Pokemon Name"
                    value={pokeFilter.name}
                    onChange={pokeFilter.setName}
                    placeholder="Search for Pokemon"
                    data={suggestions}
                />
                <Group justify="left">
                    <Chip.Group
                        multiple
                        value={pokeFilter.types}
                        onChange={pokeFilter.setTypes}
                    >
                        {Object.entries(colorByType).map(([type, color]) => (
                            <Chip color={color} key={type} value={type}>
                                {type}
                            </Chip>
                        ))}
                        <Checkbox
                            checked={pokeFilter.matchAllTypes}
                            onChange={(e) =>
                                pokeFilter.setMatchAllTypes(
                                    e.currentTarget.checked
                                )
                            }
                            label="Match All Types"
                        />
                    </Chip.Group>
                </Group>
                <Group>
                    <Autocomplete
                        label="Ability"
                        limit={5}
                        data={(dex ?? Dex).abilities
                            .all()
                            .map((ability) => ability.name)}
                        value={pokeFilter.ability}
                        onChange={pokeFilter.setAbility}
                    />
                </Group>
                <MultiSelect
                    searchable
                    data={theMoves}
                    value={pokeFilter.moves}
                    onChange={pokeFilter.setMoves}
                    label="Moves"
                    placeholder="Filter for a move (latest gen)"
                />
                <Stack>
                    {Object.entries(pokeFilter.stats).map(
                        ([label, [min, max]]) => (
                            <Grid key={label}>
                                <Grid.Col span={2}>
                                    <Text>{label}</Text>
                                </Grid.Col>
                                <Grid.Col span={1}>
                                    <Text>
                                        {min}-{max}
                                    </Text>
                                </Grid.Col>
                                <Grid.Col span={9}>
                                    <RangeSlider
                                        color={getStatColor(label)}
                                        min={0}
                                        max={255}
                                        step={1}
                                        defaultValue={[min, max]}
                                        onChange={pokeFilter.setStat(label)}
                                        size="xl"
                                    />
                                </Grid.Col>
                            </Grid>
                        )
                    )}
                </Stack>
                <Group>
                    <Text>Fuzzy search multiplier: </Text>
                    <Slider
                        min={0}
                        max={0.5}
                        step={0.05}
                        style={{ flexGrow: 1 }}
                        defaultValue={pokeFilter.fuzziness}
                        onChangeEnd={pokeFilter.setFuzziness}
                    />
                </Group>
                {placeChildrenAfter && children}
            </Stack>
        </Modal>
    );
};
