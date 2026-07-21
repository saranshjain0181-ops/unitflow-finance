import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_INPUTS,
  DEFAULT_SCENARIO,
  DEMO_INPUTS,
  type Inputs,
  type Scenario,
} from "@/lib/unitflow";

type Ctx = {
  inputs: Inputs;
  setInputs: (u: Partial<Inputs>) => void;
  scenario: Scenario;
  setScenario: (u: Partial<Scenario>) => void;
  loadDemo: () => void;
  reset: () => void;
};

const UnitFlowContext = createContext<Ctx | null>(null);

const KEY = "unitflow-state-v1";

export function UnitFlowProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputsState] = useState<Inputs>(DEMO_INPUTS);
  const [scenario, setScenarioState] = useState<Scenario>(DEFAULT_SCENARIO);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.inputs) setInputsState(parsed.inputs);
        if (parsed.scenario) setScenarioState(parsed.scenario);
      }
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ inputs, scenario }));
  }, [inputs, scenario, hydrated]);

  const value: Ctx = {
    inputs,
    scenario,
    setInputs: (u) => setInputsState((prev) => ({ ...prev, ...u })),
    setScenario: (u) => setScenarioState((prev) => ({ ...prev, ...u })),
    loadDemo: () => {
      setInputsState(DEMO_INPUTS);
      setScenarioState(DEFAULT_SCENARIO);
    },
    reset: () => {
      setInputsState(DEFAULT_INPUTS);
      setScenarioState(DEFAULT_SCENARIO);
    },
  };

  return <UnitFlowContext.Provider value={value}>{children}</UnitFlowContext.Provider>;
}

export function useUnitFlow() {
  const ctx = useContext(UnitFlowContext);
  if (!ctx) throw new Error("useUnitFlow must be used within UnitFlowProvider");
  return ctx;
}
