import React from "react";
import { PACKAGE } from "../helpers/constants";
import { useWallet } from "@mysten/wallet-adapter-react";
import { JsonRpcProvider, Network } from "@mysten/sui.js";
import { notifyError } from "../services/Toasts";
import {COIN} from "../helpers/constants";
import HeadsSvg from "../public/svg/heads.svg";
import TailsSvg from "../public/svg/tails.svg";

const PlayButton = ({ coinSide, gameID, callback, loading }) => {
  // Initialize provider
  const provider = new JsonRpcProvider(Network.DEVNET);
  const { connected, getAccounts, signAndExecuteTransaction } = useWallet();

  // Get all coin objects for the current player
  const getPlayerCoinObjects = async () => {
    return new Promise(async (resolve, reject) => {
      const playerAccounts = await getAccounts();
      const playerActiveAccount = playerAccounts[0];

      provider
        .getObjectsOwnedByAddress(playerActiveAccount)
        .then((res) => {
          let coinObjects = res.filter((x) => x.type.includes("Coin"));

          provider
            .getObjectBatch(coinObjects.map((x) => x.objectId))
            .then((res) => {
              const coins = res.map((x) => {
                return {
                  id: Object(x?.details)?.data?.fields?.id?.id,
                  balance: Object(x?.details)?.data?.fields?.balance,
                };
              });
              resolve(coins);
            });
        })
        .catch((e) => {
          console.error("Player Coins error: ", e);
          reject(e);
        });
    });
  };

  // Find the largest (or exact) coin from the player's coin collection
  const getPlayerLargestCoinID = async () => {
    return new Promise((resolve, reject) => {
      let coinID = "",
        balance = 5000;

      try {
        getPlayerCoinObjects().then((playerCoins) => {
          for (let coin of playerCoins) {
            // Return in case the coin has the exact balance we need
            if (coin.balance === 5000) {
              coinID = coin.id;
              balance = coin.balance;
              break;
            }

            // Return the biggest coin value
            if (coin.balance >= balance) {
              coinID = coin.id;
              balance = coin.balance;
            }
          }

          resolve({ coinID, balance });
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  const splitPlayerCoin = async (coinToSplit) => {
    const coinID = coinToSplit.coinID;
    const playerAccounts = await getAccounts();
    const playerActiveAccount = playerAccounts[0];

    try {
      const splitTxn = await signAndExecuteTransaction({
        kind: "paySui",
        data: {
          inputCoins: [coinID],
          recipients: [playerActiveAccount],
          amounts: [5000],
          gasBudget: 10000,
        },
      });
      return splitTxn.effects.created[0].reference.objectId;
    } catch (e) {
      console.log(e);
    }
  };

  const handleClick = async () => {
    loading(true);
    try {
      // Get an appropriate coin from the player
      const playerLargestCoin = await getPlayerLargestCoinID();
      let splitCoin = playerLargestCoin.coinID;

      // Generate a new coin with value 5000
      if (playerLargestCoin.balance > 5000) {
        splitCoin = await splitPlayerCoin(playerLargestCoin);
      }
      const choice = coinSide === "TAILS" ? COIN.TAILS : COIN.HEADS;
      const transactionResponse = await signAndExecuteTransaction({
        kind: "moveCall",
        data: {
          packageObjectId: `${PACKAGE}`,
          module: "satoshi_flip",
          function: "play",
          typeArguments: [],
          arguments: [`${gameID}`, `${choice}`, `${splitCoin}`, "5000"],
          gasBudget: 10000,
        },
      });

      const transactionStatus = transactionResponse.effects.status;

      if (transactionStatus === "failure") {
        const statusMessage = transactionResponse.effects.status.error;
        notifyError("Transaction failed. Please make sure you have enough gas");
        console.log(statusMessage.status);
      } else {
        const digest = transactionResponse?.effects?.transactionDigest;
        callback(choice, digest);
      }
    } catch (e) {
      notifyError("Something went wrong, please try again later");
      console.error(e);
    }
  };

  const renderButtonIcon = (side) => {
    return side === "TAILS" ? <TailsSvg /> : <HeadsSvg />;
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="group bg-gray-dark text-white/70 px-6 py-3 mx-2 lowercase rounded-full shadow hover:shadow-lg outline-none focus:outline-none"
      >
        <span className="group-hover:text-white/80 flex items-center justify-center capitalize pr-1">
          <span className="flex justify-center w-6 h-6 text-sui-sky/60 group-hover:text-sui-sky/100">
            {renderButtonIcon(coinSide)}
          </span>
          <span className="px-1 ml-1">Play</span>
          <span className="lowercase">{coinSide}</span>
        </span>
      </button>
    </>
  );
};

export default PlayButton;
