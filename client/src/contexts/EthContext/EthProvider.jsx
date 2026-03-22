import React, { useReducer, useCallback, useEffect } from "react";
import Web3 from "web3";
import EthContext from "./EthContext";
import { reducer, actions, initialState } from "./state";

const EthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const init = useCallback(async (artifact) => {
    if (!artifact) return;

    try {
      const web3 = new Web3(Web3.givenProvider || "ws://localhost:7545");
      const accounts = await web3.eth.requestAccounts();
      const networkID = await web3.eth.net.getId();
      const { abi } = artifact;

      let contract = null;
      let address = null;

      if (artifact.networks[networkID]) {
        address = artifact.networks[networkID].address;
        contract = new web3.eth.Contract(abi, address);
      }

      let role = "unknown";
      if (contract && accounts.length > 0) {
        try {
          const rawRole = await contract.methods.getSenderRole().call({ from: accounts[0] });
          // Normalize role to a predictable lowercase string
          if (typeof rawRole === "string") {
            role = rawRole.toLowerCase().trim();
          } else {
            role = String(rawRole).toLowerCase().trim();
          }
        } catch (err) {
          console.error("getSenderRole failed:", err);
          role = "unknown";
        }
      }

      dispatch({
        type: actions.init,
        data: {
          artifact,
          web3,
          accounts,
          networkID,
          contract,
          role,
          loading: false,
          initError: null,
        },
      });
    } catch (err) {
      console.error(err);
      dispatch({
        type: actions.init,
        data: {
          loading: false,
          initError: err?.message || "Failed to connect to the blockchain",
        },
      });
    }
  }, []);

  useEffect(() => {
    const tryInit = async () => {
      try {
        const artifact = await import("../../contracts/EHR.json");
        init(artifact.default || artifact);
      } catch (err) {
        console.error(err);
        dispatch({
          type: actions.init,
          data: {
            loading: false,
            initError:
              err?.message ||
              "Could not load EHR.json. Run Truffle migrate and ensure client/src/contracts/EHR.json exists.",
          },
        });
      }
    };

    tryInit();
  }, [init, dispatch]);

  useEffect(() => {
    const handleChange = () => init(state.artifact);
    const events = ["chainChanged", "accountsChanged"];

    if (window.ethereum) {
      events.forEach((e) => window.ethereum.on(e, handleChange));
    }

    return () => {
      if (window.ethereum) {
        events.forEach((e) => window.ethereum.removeListener(e, handleChange));
      }
    };
  }, [init, state.artifact]);

  return <EthContext.Provider value={{ state, dispatch }}>{children}</EthContext.Provider>;
};

export default EthProvider;
