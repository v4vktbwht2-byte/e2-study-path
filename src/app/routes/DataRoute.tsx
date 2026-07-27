import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataManagementPage } from "../../features/data";
import { getAppDb } from "../../infrastructure/db/appDb";
import { createDataManagementPort } from "./dataManagementAdapter";

export function DataRoute() {
  const navigate = useNavigate();
  const db = useMemo(() => getAppDb(), []);
  const port = useMemo(() => createDataManagementPort(db), [db]);

  return (
    <DataManagementPage
      port={port}
      onAllUserDataDeleted={() => {
        void navigate("/onboarding", { replace: true });
      }}
    />
  );
}
