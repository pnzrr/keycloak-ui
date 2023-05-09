import type { AccessType } from "@keycloak/keycloak-admin-client/lib/defs/whoAmIRepresentation";
import { PropsWithChildren, useEffect, useState } from "react";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useWhoAmI } from "../../context/whoami/WhoAmI";
import { createNamedContext, useRequiredContext } from "ui-shared";

type AccessContextProps = {
  hasAccess: (...types: AccessType[]) => boolean;
  hasSomeAccess: (...types: AccessType[]) => boolean;
  hasSomeAccessByString: (...types: string[]) => boolean;
};

export const AccessContext = createNamedContext<AccessContextProps | undefined>(
  "AccessContext",
  undefined
);

export const useAccess = () => useRequiredContext(AccessContext);

export const AccessContextProvider = ({ children }: PropsWithChildren) => {
  const { whoAmI } = useWhoAmI();
  const { realm } = useRealm();
  const [access, setAccess] = useState<readonly AccessType[]>([]);

  useEffect(() => {
    if (whoAmI.getRealmAccess()[realm]) {
      setAccess(whoAmI.getRealmAccess()[realm]);
    }
  }, [whoAmI, realm]);

  const hasAccess = (...types: AccessType[]) => {
    return types.every((type) => type === "anyone" || access.includes(type));
  };

  const hasSomeAccess = (...types: AccessType[]) => {
    return types.some((type) => type === "anyone" || access.includes(type));
  };

  const hasSomeAccessByString = (...types: string[]) => {
    return types.some(
      (type) =>
        type === "anyone" ||
        access.filter((a) => {
          return a.toString() === type;
        }).length > 0
    );
  };

  return (
    <AccessContext.Provider
      value={{ hasAccess, hasSomeAccess, hasSomeAccessByString }}
    >
      {children}
    </AccessContext.Provider>
  );
};
