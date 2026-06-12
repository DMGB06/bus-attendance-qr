import { Redirect } from "expo-router";

import { PARENT_ROUTES } from "@/src/core/routes";

export default function ParentIndexRedirect() {
  return <Redirect href={PARENT_ROUTES.home} />;
}
