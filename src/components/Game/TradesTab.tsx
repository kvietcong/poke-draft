import supabase from "@/supabase";
import {
    submitTrade,
    executeTrade,
    acceptTrade,
    removeTrade,
} from "@/util/database";
import { useEffect, useMemo, useState } from "react";
import { Loading } from "../Loading/Loading";
import {
    Accordion,
    Button,
    Flex,
    NativeSelect,
    Stack,
    Text,
    Title,
} from "@mantine/core";
import {
    AccordionSectionData,
    PokemonAccordion,
    PokemonPill,
} from "../PokeView/View";
import { getPointLabel, searchPokemon } from "@/util/pokemon";
import { notifications } from "@mantine/notifications";
import { useGameID, usePointRulesetID } from "@/Context";
import { Participant, Pokemon } from "@/types";
import {
    useGameInfoQuery,
    useGamePlayersQuery,
    useGameTradesQuery,
    usePointRulesetQuery,
} from "@/queries";
import { useSessionStore } from "@/stores";

const TradeLine = ({
    pokemon,
    from,
    to,
}: {
    pokemon: Pokemon;
    from: string;
    to: string;
}) => {
    return (
        <Flex gap="0.5rem" align="center">
            <Text>
                [ <strong>{from}</strong> gives
            </Text>
            <PokemonPill pokemon={pokemon} />
            <Text>
                to <strong>{to}</strong> ]
            </Text>
        </Flex>
    );
};

const Accepters = ({ confirmations }: { confirmations: Participant[] }) => (
    <Text>
        Trade accepted by:{" "}
        <strong>{confirmations.map((x) => x.name).join(", ")}</strong>
    </Text>
);

const GameTradesAccordion = () => {
    const session = useSessionStore((state) => state.session);
    const gameID = useGameID();
    const gameTrades = useGameTradesQuery(gameID).data!;
    const { playerInfoByID } = useGamePlayersQuery(gameID).data!;
    const { valueByPokemonID } =
        usePointRulesetQuery(usePointRulesetID()).data!;

    if (!playerInfoByID || !valueByPokemonID) return;

    const tradeInfo = useMemo(() => {
        const participantsByTrade = gameTrades.reduce<{
            [tradeID: string]: { [playerID: string]: string };
        }>((acc, trade) => {
            acc[trade.id] = {};
            for (const transaction of trade.transactions) {
                acc[trade.id][transaction.oldOwner.id] =
                    transaction.oldOwner.name;
                acc[trade.id][transaction.newOwner.id] =
                    transaction.newOwner.name;
            }
            return acc;
        }, {});
        return { participantsByTrade };
    }, [gameTrades]);

    if (!tradeInfo) return <Loading />;

    return (
        <Accordion>
            {gameTrades.length > 0
                ? gameTrades.map((trade) => {
                      const confirmers = trade.confirmations.map((x) => x.id);
                      const participants = Object.keys(
                          tradeInfo.participantsByTrade[trade.id]
                      );

                      const executeTradeOrError = async () => {
                          const error = await executeTrade(supabase, trade.id);
                          if (error)
                              return notifications.show({
                                  color: "red",
                                  title: "Couldn't execute trade",
                                  message: `${error.message}`,
                              });
                      };

                      const acceptTradeOrError = async () => {
                          if (!session)
                              return notifications.show({
                                  color: "red",
                                  title: "Couldn't execute trade",
                                  message: "You aren't logged in",
                              });
                          const error = await acceptTrade(
                              supabase,
                              trade.id,
                              session.user.id
                          );
                          if (error)
                              return notifications.show({
                                  color: "red",
                                  title: "Couldn't execute trade",
                                  message: `${error.message}`,
                              });
                      };

                      const removeTradeOrError = async () => {
                          const error = await removeTrade(supabase, trade.id);
                          if (error)
                              return notifications.show({
                                  color: "red",
                                  title: "Couldn't remove trade",
                                  message: `${error.message}`,
                              });
                          notifications.show({
                              title: "Removed Trade",
                              message: "Successfully removed trade",
                          });
                      };

                      const isTotallyConfirmed =
                          participants.length &&
                          participants.every((x) => confirmers.includes(x));
                      const isUserTheRequester =
                          session && session.user.id === trade.requester.id;
                      const isUserAParticipant =
                          session && participants.includes(session.user.id);
                      let TradeStateOrConfirm;
                      if (isTotallyConfirmed)
                          if (isUserTheRequester || isUserAParticipant)
                              TradeStateOrConfirm = (
                                  <Button onClick={executeTradeOrError}>
                                      Execute Trade
                                  </Button>
                              );
                          else
                              TradeStateOrConfirm = (
                                  <Text>All participants have accepted</Text>
                              );
                      else if (
                          isUserAParticipant &&
                          !confirmers.includes(session.user.id)
                      )
                          TradeStateOrConfirm = (
                              <Button onClick={acceptTradeOrError}>
                                  Accept Trade
                              </Button>
                          );
                      else
                          TradeStateOrConfirm = (
                              <Text>Not all participants have accepted</Text>
                          );

                      const TradeTitle = (
                          <Text>
                              Trade requested by{" "}
                              <strong>{trade.requester.name}</strong> involving{" "}
                              <strong>
                                  {Object.values(
                                      tradeInfo.participantsByTrade[trade.id]
                                  ).join(", ")}
                              </strong>
                              <span
                                  style={{
                                      float: "right",
                                      paddingRight: "0.5rem",
                                  }}
                              >
                                  {trade.id}
                              </span>
                          </Text>
                      );

                      return (
                          <Accordion.Item key={trade.id} value={trade.id}>
                              <Accordion.Control>
                                  {TradeTitle}
                              </Accordion.Control>
                              <Accordion.Panel>
                                  <Stack align="center">
                                      {trade.confirmations.length > 0 && (
                                          <Accepters
                                              confirmations={
                                                  trade.confirmations
                                              }
                                          />
                                      )}
                                      {TradeStateOrConfirm}
                                      {session &&
                                          [
                                              ...participants,
                                              trade.requester.id,
                                          ].includes(session.user.id) && (
                                              <Button
                                                  onClick={removeTradeOrError}
                                              >
                                                  Reject Trade
                                              </Button>
                                          )}
                                      <Flex
                                          wrap="wrap"
                                          gap="xs"
                                          align="center"
                                          justify="center"
                                      >
                                          {trade.transactions.map(
                                              (transaction) => (
                                                  <TradeLine
                                                      key={
                                                          transaction.selection
                                                              .pokemonID
                                                      }
                                                      from={
                                                          transaction.oldOwner
                                                              .name
                                                      }
                                                      to={
                                                          transaction.newOwner
                                                              .name
                                                      }
                                                      pokemon={searchPokemon(
                                                          transaction.selection
                                                              .pokemonID
                                                      )}
                                                  />
                                              )
                                          )}
                                      </Flex>
                                  </Stack>
                              </Accordion.Panel>
                          </Accordion.Item>
                      );
                  })
                : "No Trades Yet"}
        </Accordion>
    );
};

const TradeCreator = () => {
    const session = useSessionStore((state) => state.session);
    const gameID = useGameID();
    const gameInfo = useGameInfoQuery(gameID).data!;
    const { playerInfoByID, allPlayerInfo } = useGamePlayersQuery(gameID).data!;
    const { valueByPokemonID } =
        usePointRulesetQuery(usePointRulesetID()).data!;

    if (!playerInfoByID || !valueByPokemonID || !session || !allPlayerInfo)
        return;

    type TransactionInfo = {
        selectionID: string;
        pokemon: Pokemon;
        oldOwner: string;
        newOwner: string;
    };
    const [transactionInfoBySelectionID, setTransactionInfoBySelectionID] =
        useState<{
            [selectionID: string]: TransactionInfo;
        }>({});
    const [selectionID, setSelectionID] = useState<string>("");
    const [newOwner, setNewOwner] = useState<Participant>();

    const possibleNewOwners = useMemo(
        () => [
            { label: "", value: "" },
            ...allPlayerInfo
                .filter(
                    (info) => !(selectionID && selectionID in info.selections)
                )
                .map((info) => ({
                    label: info.name,
                    value: info.id,
                })),
        ],
        [allPlayerInfo, selectionID]
    );

    useEffect(() => {
        if (!newOwner) return;
        if (
            newOwner.id in playerInfoByID &&
            selectionID in playerInfoByID[newOwner.id].selections
        )
            setNewOwner(undefined);
    }, [selectionID]);

    useEffect(() => {
        if (
            possibleNewOwners.some(
                (possibleNewOwner) => possibleNewOwner.value === selectionID
            )
        )
            setSelectionID("");
    }, [newOwner]);

    const pokemon = useMemo(() => {
        if (!selectionID) return;
        for (const playerInfo of allPlayerInfo)
            if (selectionID in playerInfo.selections)
                return playerInfo.selections[selectionID];
    }, [selectionID]);

    const transactionInfo = useMemo(() => {
        if (!selectionID || !newOwner) return;
        for (const playerInfo of allPlayerInfo)
            if (selectionID in playerInfo.selections)
                return {
                    selectionID,
                    pokemon: playerInfo.selections[selectionID],
                    oldOwner: playerInfo.id,
                    newOwner: newOwner.id,
                } as TransactionInfo;
    }, [selectionID, newOwner]);

    const addNewTransaction = () => {
        if (!transactionInfo || !newOwner || !selectionID)
            return notifications.show({
                color: "red",
                title: "Not enough information",
                message: "Select a new owner AND Pokemon",
            });
        if (!(newOwner.id in playerInfoByID))
            return notifications.show({
                color: "red",
                title: "Invalid user ID",
                message: `${newOwner} is not a valid user ID in the game`,
            });
        setTransactionInfoBySelectionID((prev) => {
            return { ...prev, [selectionID]: transactionInfo };
        });
        setNewOwner(undefined);
        setSelectionID("");
        document.getElementById("current-transactions")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    };

    const transactingPokemonPredicate = (pokemon: Pokemon) =>
        Object.values(transactionInfoBySelectionID).some(
            (transactionInfo) =>
                transactionInfo.pokemon.data.id === pokemon.data.id
        );

    const submitTradeOrError = async () => {
        console.log(session, gameInfo);
        const error = await submitTrade(
            gameInfo.id,
            session.user.id,
            Object.entries(transactionInfoBySelectionID).reduce<{
                [id: string]: string;
            }>((acc, [selectionID, transactionInfo]) => {
                acc[selectionID] = transactionInfo.newOwner;
                return acc;
            }, {})
        );
        if (error)
            return notifications.show({
                color: "red",
                title: "Couldn't execute trade",
                message: `${error}`,
            });
        notifications.show({
            title: "Trade Submitted!",
            message: "Successfully submitted trade",
        });
        setSelectionID("");
        setNewOwner(undefined);
        setTransactionInfoBySelectionID({});
    };

    const accordionData = useMemo(() => {
        const data = Object.values(playerInfoByID).map((info) => {
            const sectionData = [
                info.name,
                Object.values(info.selections).filter(
                    (p) => !transactingPokemonPredicate(p)
                ),
            ];
            return sectionData as AccordionSectionData;
        });
        return data;
    }, [playerInfoByID, transactionInfoBySelectionID]);

    const selectionByPokemonID = useMemo(() => {
        const data = Object.values(playerInfoByID).reduce<{
            [id: string]: string;
        }>((acc, next) => {
            Object.entries(next.selections).forEach(
                ([selectionID, pokemon]) => {
                    acc[pokemon.data.id] = selectionID;
                }
            );
            return acc;
        }, {});
        return data;
    }, [playerInfoByID]);

    const onSelect = (pokemon: Pokemon) => {
        setSelectionID(selectionByPokemonID[pokemon.data.id]);
        document.getElementById("make-transaction")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    };

    const transactions = Object.keys(transactionInfoBySelectionID).length >
        0 && (
        <>
            <Button
                onClick={() =>
                    confirm(
                        "Are you sure you want to reset your transactions?"
                    ) && setTransactionInfoBySelectionID({})
                }
            >
                Clear Transactions
            </Button>
            <Flex wrap="wrap" gap="xs" align="center" justify="center">
                {Object.values(transactionInfoBySelectionID).map(
                    (transactionInfo) => (
                        <TradeLine
                            key={transactionInfo.pokemon.data.id}
                            pokemon={transactionInfo.pokemon}
                            from={playerInfoByID[transactionInfo.oldOwner].name}
                            to={playerInfoByID[transactionInfo.newOwner].name}
                        />
                    )
                )}
            </Flex>
            <Button
                onClick={() =>
                    confirm("Are you sure you want to submit this trade?") &&
                    submitTradeOrError()
                }
            >
                Submit Trade
            </Button>
        </>
    );

    return (
        <Stack align="center">
            {transactions && (
                <Title order={3} id="current-transactions">
                    Current Transactions
                </Title>
            )}
            {transactions}
            <Title order={3} id="make-transaction">
                Make a Transaction
            </Title>
            {transactionInfo ? (
                <TradeLine
                    pokemon={transactionInfo.pokemon}
                    from={playerInfoByID[transactionInfo.oldOwner].name}
                    to={playerInfoByID[transactionInfo.newOwner].name}
                />
            ) : (
                pokemon && <PokemonPill pokemon={pokemon} />
            )}
            {transactionInfo && (
                <Button onClick={addNewTransaction}>Add Transaction</Button>
            )}
            <NativeSelect
                id="new-owner"
                label="New Owner"
                description="Select a new owner"
                data={possibleNewOwners}
                value={newOwner?.id ?? ""}
                onChange={(e) =>
                    e.currentTarget.value
                        ? setNewOwner({
                              id: e.currentTarget.value,
                              name: e.currentTarget.name,
                          })
                        : setNewOwner(undefined)
                }
                w="100%"
            />
            <PokemonAccordion
                data={accordionData}
                isMinimal={true}
                allowMultiple={false}
                cardLabeler={(pokemon) =>
                    getPointLabel(pokemon, valueByPokemonID)
                }
                cardOnClick={onSelect}
            />
        </Stack>
    );
};

export const TradesTab = () => {
    const gameID = useGameID();
    const session = useSessionStore((state) => state.session);
    const { playerInfoByID } = useGamePlayersQuery(gameID).data!;

    return (
        <Stack>
            <GameTradesAccordion />
            {session && session.user.id in playerInfoByID && (
                <>
                    <Title>Make a Trade</Title>
                    <TradeCreator />
                </>
            )}
        </Stack>
    );
};
