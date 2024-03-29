// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Game Screen component
 * Use: Loads and connects every component necessary for the user to play the game
 */
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";

// API & Services
import { blsSign, singlePlayerEnd } from "../services/SatoshiAPI";
import { notifyPlayResult, notifySucess } from "../services/Toasts";
import { COIN } from "../helpers/constants";

// Components
import ExplorerLink from "./ExplorerLink";
import Visual from "./Visual";
import LinksContainer from "./LinksContainer";
import Spinner from "./Spinner";
import PlayButton from "./PlayGameButton";
// import GameStatus from "./GameStatus";
const DynamicGameStatus = dynamic(() => import("./GameStatus"), {
  suspense: true,
});
import GameDetails from "./GameDetails";
import HeadsSvg from "../public/svg/capy.svg";
import TailsSvg from "../public/svg/capy-text.svg";

function GameScreen() {
  // game logic
  const [visualStatus, setVisualStatus] = useState(1);
  const [gameId, setGameId] = useState("");
  const [history, setHistory] = useState([]);
  const [currentTxs, setCurrentTxs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playerGameRes, setPlayerGameRes] = useState(null);
  const [coinSide, setCoinSide] = useState(null);
  const [showChoice, setShowChoice] = useState(null);
  const [showGameDetails, setShowGameDetails] = useState(false);

  // always make sure to end running games
  useEffect(() => {
    // ToDo: Add prompt to remind the user that a new game is ongoing!
    window.addEventListener("unload", () => {
      if (gameId !== "") {
        // can no longer end the game on unload, would have to store the blsSig
        // singlePlayerEnd(gameId);
        setGameId("");
      }
    });
  });

  const newGameClicked = (gameId_, transactionId) => {
    setGameId(gameId_);
    setVisualStatus(2);
    // setCurrentTxs([
    //   { id: transactionId, type: "transaction", text: "New Game Tx" },
    // ]);
    notifySucess("Created new game!");
  };

  const finish = async (choice, gameId, userRandomHexString) => {
    const blsSig = await blsSign(gameId, userRandomHexString);
    const endResponse = await singlePlayerEnd(gameId, blsSig?.data?.blsSig);
    const { playerWon, transactionDigest } = endResponse.data;
    const show = playerWon ? choice : (choice + 1) % 2;
    setVisualStatus(show);
    const coinSide = choice === COIN.HEADS ? "heads" : "tails";
    notifyPlayResult(`You played ${coinSide}`, playerWon);
    setPlayerGameRes(playerWon);
    setCoinSide(choice);
    setIsLoading(false);
    if (playerWon)
      setHistory((old) => [
        { type: "win", id: gameId, text: `${coinSide}/Win`, amount: "+10,000" },
        ...old,
      ]);
    else
      setHistory((old) => [
        { type: "loss", id: gameId, text: `${coinSide}/Loss` },
        ...old,
      ]);
    setCurrentTxs((old) => [
      { id: transactionDigest, type: "transaction", text: "End Game Tx" },
      ...old,
    ]);
    setGameId("");
  };

  const playButtonClicked = (gameId, userRandomHexString, choice, transactionId) => {
    newGameClicked(gameId, transactionId);
    setCurrentTxs((old) => [
      {
        id: transactionId,
        type: "transaction",
        text: "Play Tx",
        amount: "-5000",
      },
      ...old,
    ]);
    finish(choice, gameId, userRandomHexString);
  };

  let gameDetailsHeight = "";
  const handleGameDetailsOpen = () => {
    setShowGameDetails(true);
    gameDetailsHeight = "h-full";
  };

  const handleGameDetailsClose = () => {
    setShowGameDetails(false);
    gameDetailsHeight = "h-4";
  };

  return (
    <>
      {/* Main game content */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex">
          <div className="flex flex-col w-full items-center justify-center pb-6 px-4">
            <h2 className="text-xl font-semibold">Read game details</h2>
            {showGameDetails ? (
              <>
                <GameDetails boxHeight={gameDetailsHeight} />
                <span className="mt-2 w-[35px] h-[2px] bg-amber rounded-full"></span>
                <button
                  className="cursor-pointer pt-2 flex flex-col justify-center items-center"
                  onClick={handleGameDetailsClose}
                >
                  {" "}
                  <span className="text-xs">Collapse</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="mt-2 w-4 h-4 animate-bounce"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <span className="mt-2 w-[35px] h-[2px] bg-amber rounded-full"></span>
                <button
                  className="cursor-pointer pt-2 flex flex-col justify-center items-center"
                  onClick={handleGameDetailsOpen}
                >
                  {" "}
                  <span className="text-xs">Expand</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="mt-2 w-4 h-4 animate-bounce"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center pb-5">
          <span>
            Current Game:
            {gameId ? (
              <ExplorerLink id={gameId} type="object" />
            ) : (
              <div className="font-light text-sui-text-light text-sm italic animate-pulse">
                Waiting to start new game...
              </div>
            )}
          </span>
        </div>

        <div className="relative h-86 rounded-lg border-2 border-dashed border-sui-ocean/10 flex flex-col items-center justify-center">
          <Suspense fallback={`Loading...`}>
            <DynamicGameStatus
              res={playerGameRes}
              callback={setPlayerGameRes}
              coinside={coinSide}
            />
          </Suspense>

          <div
            id="game"
            className="flex flex-col items-center justify-center mb-10"
          >
            <Visual isRunning={visualStatus} />
            {isLoading ? (
              <div className="h-[50px]">
                <Spinner />
              </div>
            ) : gameId === "" && (
              <div id="ht-buttons" className="h-[50px]">
                <PlayButton
                  coinSide="HEADS"
                  callback={playButtonClicked}
                  loading={setIsLoading}
                  showChoice={setShowChoice}
                />
                <PlayButton
                  coinSide="TAILS"
                  callback={playButtonClicked}
                  loading={setIsLoading}
                  showChoice={setShowChoice}
                />
              </div>
            )}
            <div className="pt-4">
              {showChoice !== null && showChoice === COIN.HEADS && (
                <span className="flex items-center">
                  <h3 className="pr-1">Last pick</h3>
                  <span className="flex w-8 h-8 p-2 bg-sui-ocean text-sui-sky rounded-full">
                    <HeadsSvg />
                  </span>
                  <h3 className="pl-1">Heads</h3>
                </span>
              )}
              {showChoice !== null && showChoice === COIN.TAILS && (
                <span className="flex items-center">
                  <h3 className="pr-1">Last pick</h3>
                  <span className="flex w-8 h-8 p-2 bg-sui-ocean text-sui-sky rounded-full">
                    <TailsSvg />
                  </span>
                  <h3 className="pl-1">Tails</h3>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex justify-between items-stretch flex-wrap py-6 lg:flex-row flex-col">
          <div
            id="history"
            className="flex-1 flex flex-col mr-[12px] lg:mb-0 mb-8"
          >
            <div className="relative flex justify-center items-end mb-3">
              <h2 className="pb-2 text-center">History</h2>
              <span className="absolute w-[200px] h-[4px] rounded-full bg-gradient-to-r from-sui-ocean/0 via-sui-ocean/10 to-sui-ocean/0"></span>
            </div>
            <LinksContainer linksArray={history} />
          </div>
          <span className="xl:block hidden absolute left-2/4 top-2/4 -ml-[12px] h-6 w-6 text-sui-ocean/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </span>

          <div id="transactions" className="flex-1 flex flex-col xl:ml-[12px]">
            <div className="relative flex justify-center items-end mb-3">
              <h2 className="pb-2 text-center">Transactions</h2>
              <span className="absolute w-[200px] h-[4px] rounded-full bg-gradient-to-r from-sui-ocean/0 via-sui-ocean/10 to-sui-ocean/0"></span>
            </div>
            <LinksContainer linksArray={currentTxs} />
          </div>
        </div>
      </div>
      {/* End of main game content */}
    </>
  );
}

export default GameScreen;
