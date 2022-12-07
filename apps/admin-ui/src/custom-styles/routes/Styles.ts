import type { LocationDescriptorObject } from "history";
import { lazy } from "react";
import { generatePath } from "react-router-dom";
import type { RouteDef } from "../../route-config";

export type StylesParam = {
  realm: string;
};

export const StylesRoute: RouteDef = {
  path: "/:realm/styles",
  component: lazy(() => import("../StylesSection")),
  breadcrumb: (t) => t("styles"),
  access: "query-clients",
};

export const toStyles = (params: StylesParam): LocationDescriptorObject => ({
  pathname: generatePath(StylesRoute.path, params),
});
